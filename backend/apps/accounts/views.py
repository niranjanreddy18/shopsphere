"""
API views for the accounts domain.

Views stay thin: parse/validate input via serializers, delegate business
logic to services.py, and shape the HTTP response. No business logic should
be added directly to a view — see services.py.
"""

from django.contrib.auth import logout as django_logout
from drf_spectacular.utils import OpenApiResponse, extend_schema, inline_serializer
from rest_framework import filters, generics, permissions, serializers, status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenRefreshView as SimpleJWTTokenRefreshView

from core.exceptions import ApplicationError
from core.permissions import IsAdmin
from .models import Address, User
from .permissions import IsAddressOwner
from .serializers import (
    AddressSerializer,
    AdminSetUserActiveSerializer,
    AdminUserListSerializer,
    ChangePasswordSerializer,
    ForgotPasswordSerializer,
    LoginSerializer,
    RegisterSerializer,
    ResetPasswordSerializer,
    UserSerializer,
    VerifyEmailSerializer,
)
from .services import AddressService, AdminUserService, AuthService


class RegisterView(generics.CreateAPIView):
    """
    POST /api/v1/accounts/register/

    Creates a new customer account and triggers a (mock) verification email.
    Rate-limited via the "register" throttle scope to slow down automated
    account-creation abuse.
    """

    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]
    throttle_scope = "register"

    @extend_schema(
        responses={201: OpenApiResponse(description="Account created successfully.")}
    )
    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = AuthService.register(
            email=serializer.validated_data["email"],
            password=serializer.validated_data["password"],
            first_name=serializer.validated_data["first_name"],
            last_name=serializer.validated_data["last_name"],
            phone_number=serializer.validated_data.get("phone_number", ""),
        )

        return Response(
            {
                "success": True,
                "message": "Account created. Please check your email to verify your account.",
                "user": UserSerializer(user).data,
            },
            status=status.HTTP_201_CREATED,
        )


class LoginView(APIView):
    """
    POST /api/v1/accounts/login/

    Authenticates a user by email/password and returns a JWT access +
    refresh token pair along with the user's profile.
    """

    permission_classes = [permissions.AllowAny]
    throttle_scope = "login"

    @extend_schema(
        request=LoginSerializer,
        responses=inline_serializer(
            "LoginResponse",
            {
                "success": serializers.BooleanField(),
                "message": serializers.CharField(),
                "user": UserSerializer(),
                "tokens": inline_serializer(
                    "TokenPair", {"access": serializers.CharField(), "refresh": serializers.CharField()}
                ),
            },
        ),
    )
    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data["user"]

        tokens = AuthService.issue_tokens_for_user(user)

        return Response(
            {
                "success": True,
                "message": "Login successful.",
                "user": UserSerializer(user).data,
                "tokens": tokens,
            },
            status=status.HTTP_200_OK,
        )


class LogoutView(APIView):
    """
    POST /api/v1/accounts/logout/

    Blacklists the supplied refresh token so it can no longer be used to
    mint new access tokens. The client is responsible for discarding the
    access token locally (it remains valid until its short 15-minute
    expiry, by design of stateless JWTs).
    """

    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(
        request=inline_serializer("LogoutRequest", {"refresh": serializers.CharField()}),
        responses={200: OpenApiResponse(description="Logged out successfully.")},
    )
    def post(self, request):
        if not refresh_token:
            raise ApplicationError("Refresh token is required to log out.", code="missing_token")

        try:
            token = RefreshToken(refresh_token)
            token.blacklist()
        except TokenError as exc:
            raise ApplicationError("Invalid or already-expired refresh token.", code="invalid_token") from exc

        django_logout(request)
        return Response({"success": True, "message": "Logged out successfully."}, status=status.HTTP_200_OK)


class TokenRefreshView(SimpleJWTTokenRefreshView):
    """
    POST /api/v1/accounts/token/refresh/

    Thin wrapper around SimpleJWT's built-in refresh view. Kept as our own
    class (rather than wiring the library view directly in urls.py) so we
    have a single place to extend behaviour later (e.g. custom throttling)
    without touching urls.py again.
    """

    throttle_scope = "login"


class VerifyEmailView(APIView):
    """POST /api/v1/accounts/verify-email/ — confirms a user's email address."""

    permission_classes = [permissions.AllowAny]

    @extend_schema(
        request=VerifyEmailSerializer,
        responses=inline_serializer(
            "VerifyEmailResponse",
            {"success": serializers.BooleanField(), "message": serializers.CharField(), "user": UserSerializer()},
        ),
    )
    def post(self, request):
        serializer = VerifyEmailSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = AuthService.verify_email(token=str(serializer.validated_data["token"]))

        return Response(
            {"success": True, "message": "Email verified successfully.", "user": UserSerializer(user).data},
            status=status.HTTP_200_OK,
        )


class ForgotPasswordView(APIView):
    """
    POST /api/v1/accounts/forgot-password/

    Always returns a generic success message regardless of whether the email
    matches an account, to avoid leaking which emails are registered.
    """

    permission_classes = [permissions.AllowAny]
    throttle_scope = "password_reset"

    @extend_schema(
        request=ForgotPasswordSerializer,
        responses=inline_serializer(
            "ForgotPasswordResponse", {"success": serializers.BooleanField(), "message": serializers.CharField()}
        ),
    )
    def post(self, request):
        serializer = ForgotPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        AuthService.request_password_reset(email=serializer.validated_data["email"])

        return Response(
            {
                "success": True,
                "message": "If an account with that email exists, a password reset link has been sent.",
            },
            status=status.HTTP_200_OK,
        )


class ResetPasswordView(APIView):
    """POST /api/v1/accounts/reset-password/ — completes the forgot-password flow."""

    permission_classes = [permissions.AllowAny]
    throttle_scope = "password_reset"

    @extend_schema(
        request=ResetPasswordSerializer,
        responses=inline_serializer(
            "ResetPasswordResponse", {"success": serializers.BooleanField(), "message": serializers.CharField()}
        ),
    )
    def post(self, request):
        serializer = ResetPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        AuthService.reset_password(
            token=str(serializer.validated_data["token"]),
            new_password=serializer.validated_data["new_password"],
        )

        return Response(
            {"success": True, "message": "Password has been reset. You may now log in."},
            status=status.HTTP_200_OK,
        )


class ChangePasswordView(APIView):
    """POST /api/v1/accounts/change-password/ — for an already-authenticated user."""

    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(
        request=ChangePasswordSerializer,
        responses=inline_serializer(
            "ChangePasswordResponse", {"success": serializers.BooleanField(), "message": serializers.CharField()}
        ),
    )
    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        AuthService.change_password(
            user=request.user,
            old_password=serializer.validated_data["old_password"],
            new_password=serializer.validated_data["new_password"],
        )

        return Response({"success": True, "message": "Password changed successfully."}, status=status.HTTP_200_OK)


class ProfileView(generics.RetrieveUpdateAPIView):
    """
    GET/PATCH /api/v1/accounts/profile/

    Retrieves or partially updates the authenticated user's own profile.
    Email and role are read-only here by design (see UserSerializer) —
    email changes and role changes are sensitive operations intentionally
    left out of this module's scope.
    """

    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_object(self) -> User:
        return self.request.user

    def patch(self, request, *args, **kwargs):
        return self.partial_update(request, *args, **kwargs)


class AddressListCreateView(generics.ListCreateAPIView):
    """
    GET  /api/v1/accounts/addresses/       — list the caller's addresses
    POST /api/v1/accounts/addresses/       — create a new address

    Implemented as two separate generic views (this one, plus
    AddressDetailView below) rather than a single combined class or a
    ModelViewSet + router, because naively mixing ListCreateAPIView and
    RetrieveUpdateDestroyAPIView via multiple inheritance causes Python's
    MRO to silently resolve `get()` to only one of the two behaviours.
    Separate classes keep routing explicit and unambiguous.
    """

    serializer_class = AddressSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # drf-spectacular introspects get_queryset() with an AnonymousUser
        # while building the schema; short-circuit that case rather than
        # let the AnonymousUser-is-not-a-valid-UUID lookup below raise.
        if getattr(self, "swagger_fake_view", False):
            return Address.objects.none()
        # Users may only ever see/modify their own addresses — this is the
        # single source of truth for that scoping, enforced at the queryset
        # level so it can never be bypassed by a crafted request.
        return Address.objects.filter(user=self.request.user)


class AddressDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    GET/PUT/PATCH/DELETE /api/v1/accounts/addresses/<uuid:pk>/

    Scoped to the requesting user's own addresses via get_queryset, with
    IsAddressOwner as a defence-in-depth object-level check.
    """

    serializer_class = AddressSerializer
    permission_classes = [permissions.IsAuthenticated, IsAddressOwner]

    def get_queryset(self):
        return Address.objects.filter(user=self.request.user)

    def perform_destroy(self, instance):
        # Delegate to the service layer so that "promote a fallback address
        # to default" logic runs consistently, rather than duplicating it
        # here or relying on a signal for a delete-time invariant.
        AddressService.delete_address(address=instance)


class AddressSetDefaultView(APIView):
    """POST /api/v1/accounts/addresses/<uuid:pk>/set-default/"""

    permission_classes = [permissions.IsAuthenticated, IsAddressOwner]

    @extend_schema(request=None, responses={200: AddressSerializer})
    def post(self, request, pk):
        address = generics.get_object_or_404(Address, pk=pk, user=request.user)
        self.check_object_permissions(request, address)

        AddressService.set_default(address=address)

        return Response(AddressSerializer(address).data, status=status.HTTP_200_OK)


# --- Admin: customer management ---------------------------------------------


class AdminUserListView(generics.ListAPIView):
    """
    GET /api/v1/accounts/admin/customers/

    Lists every customer account for the Admin Dashboard's "Manage
    Customers" screen, annotated with each user's total order count so the
    list doesn't need a separate N+1 lookup per row.
    """

    serializer_class = AdminUserListSerializer
    permission_classes = [IsAdmin]
    filter_backends = [filters.SearchFilter]
    search_fields = ["email", "first_name", "last_name"]

    def get_queryset(self):
        from django.db.models import Count

        if getattr(self, "swagger_fake_view", False):
            return User.objects.none()
        return (
            User.objects.filter(role=User.Role.CUSTOMER)
            .annotate(order_count=Count("orders"))
            .order_by("-created_at")
        )


class AdminUserDetailView(generics.RetrieveAPIView):
    """GET /api/v1/accounts/admin/customers/<uuid:pk>/ — a single customer's account detail (admin only)."""

    serializer_class = AdminUserListSerializer
    permission_classes = [IsAdmin]

    def get_queryset(self):
        from django.db.models import Count

        return User.objects.filter(role=User.Role.CUSTOMER).annotate(order_count=Count("orders"))


class AdminSetUserActiveView(APIView):
    """PATCH /api/v1/accounts/admin/customers/<uuid:pk>/active/ — activate/deactivate a customer account (admin only)."""

    permission_classes = [IsAdmin]

    @extend_schema(request=AdminSetUserActiveSerializer, responses=AdminUserListSerializer)
    def patch(self, request, pk):
        user = generics.get_object_or_404(User, pk=pk, role=User.Role.CUSTOMER)
        serializer = AdminSetUserActiveSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = AdminUserService.set_active(user=user, is_active=serializer.validated_data["is_active"])
        from django.db.models import Count

        user = User.objects.filter(pk=user.pk).annotate(order_count=Count("orders")).first()
        return Response(AdminUserListSerializer(user).data)

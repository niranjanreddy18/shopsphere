"""
Serializers for the accounts domain.

Design decision:
    Serializers here are deliberately "thin" — they validate shape and
    field-level constraints only. Anything that touches multiple models,
    sends email, or has business rules (e.g. "create a user AND issue a
    verification token") is delegated to services.py. This keeps the
    serializer testable in isolation from side effects like email sending.
"""

from django.contrib.auth import authenticate
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

from .models import Address, User
from .validators import validate_strong_password


class UserSerializer(serializers.ModelSerializer):
    """Read-only representation of a user, safe to expose via the API."""

    full_name = serializers.CharField(source="get_full_name", read_only=True)

    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "first_name",
            "last_name",
            "full_name",
            "phone_number",
            "role",
            "avatar",
            "is_email_verified",
            "created_at",
        ]
        read_only_fields = ["id", "email", "role", "is_email_verified", "created_at"]


class RegisterSerializer(serializers.ModelSerializer):
    """
    Validates and stages input for new-account registration.

    Actual user creation happens in AuthService.register() — this serializer
    is only responsible for making sure the incoming payload is well-formed
    (matching passwords, strong password, unique email).
    """

    password = serializers.CharField(write_only=True, min_length=8)
    password_confirm = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = ["email", "first_name", "last_name", "phone_number", "password", "password_confirm"]

    def validate_email(self, value: str) -> str:
        value = value.lower().strip()
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("An account with this email already exists.")
        return value

    def validate_password(self, value: str) -> str:
        # Runs both Django's built-in validators (min length, common
        # passwords, similarity to user attrs) and our custom strength rule.
        validate_password(value)
        validate_strong_password(value)
        return value

    def validate(self, attrs):
        if attrs["password"] != attrs["password_confirm"]:
            raise serializers.ValidationError({"password_confirm": "Passwords do not match."})
        return attrs


class LoginSerializer(serializers.Serializer):
    """Validates credentials for the login endpoint."""

    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, trim_whitespace=False)

    def validate(self, attrs):
        email = attrs.get("email", "").lower().strip()
        password = attrs.get("password")

        # `authenticate` runs against AUTH_USER_MODEL's USERNAME_FIELD (email)
        # and correctly checks is_active internally — but that means a
        # disabled account with the *correct* password also returns None
        # here, indistinguishable so far from a wrong password.
        user = authenticate(username=email, password=password)
        if user is not None:
            attrs["user"] = user
            return attrs

        # Distinguish "this specific account is disabled" from a generic
        # bad-credentials failure — this is deliberately NOT extended to
        # "wrong email" vs. "wrong password": telling an attacker which of
        # the two was incorrect is a textbook user-enumeration
        # vulnerability (OWASP ASVS 2.2.1), so those two cases are
        # intentionally merged into one generic message below. A disabled
        # account is a different situation: the user already knows the
        # account exists (they're the one trying to sign into it), so
        # confirming that state isn't a new information disclosure the
        # way confirming "that email isn't registered" would be.
        existing_user = User.objects.filter(email=email).first()
        if existing_user is not None and not existing_user.is_active and existing_user.check_password(password):
            raise serializers.ValidationError(
                "This account has been disabled. Please contact support for assistance."
            )

        raise serializers.ValidationError("Invalid email or password.")


class ChangePasswordSerializer(serializers.Serializer):
    """Validates an authenticated user's request to change their password."""

    old_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True, min_length=8)
    new_password_confirm = serializers.CharField(write_only=True, min_length=8)

    def validate_new_password(self, value: str) -> str:
        validate_password(value)
        validate_strong_password(value)
        return value

    def validate(self, attrs):
        if attrs["new_password"] != attrs["new_password_confirm"]:
            raise serializers.ValidationError({"new_password_confirm": "Passwords do not match."})
        return attrs


class ForgotPasswordSerializer(serializers.Serializer):
    """Accepts an email address to trigger the password-reset flow."""

    email = serializers.EmailField()

    def validate_email(self, value: str) -> str:
        return value.lower().strip()


class ResetPasswordSerializer(serializers.Serializer):
    """Validates a password-reset token + new password pair."""

    token = serializers.UUIDField()
    new_password = serializers.CharField(write_only=True, min_length=8)
    new_password_confirm = serializers.CharField(write_only=True, min_length=8)

    def validate_new_password(self, value: str) -> str:
        validate_password(value)
        validate_strong_password(value)
        return value

    def validate(self, attrs):
        if attrs["new_password"] != attrs["new_password_confirm"]:
            raise serializers.ValidationError({"new_password_confirm": "Passwords do not match."})
        return attrs


class VerifyEmailSerializer(serializers.Serializer):
    """Validates the token supplied by the (mock) email verification link."""

    token = serializers.UUIDField()


class AddressSerializer(serializers.ModelSerializer):
    """Read/write serializer for a user's shipping/billing addresses."""

    class Meta:
        model = Address
        fields = [
            "id",
            "address_type",
            "full_name",
            "phone_number",
            "line1",
            "line2",
            "city",
            "state",
            "postal_code",
            "country",
            "is_default",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "created_at", "updated_at"]

    def create(self, validated_data):
        # The `user` is injected by the view (from request.user), not taken
        # from client input — a client must never be able to create an
        # address on someone else's behalf.
        validated_data["user"] = self.context["request"].user
        return super().create(validated_data)


class AdminUserListSerializer(serializers.ModelSerializer):
    """
    Lightweight customer representation for the Admin Dashboard's "Manage
    Customers" list — kept separate from UserSerializer (used for a user's
    own profile) since the admin list additionally exposes `is_active`
    (a field a customer should never be able to read/toggle on themselves).
    """

    full_name = serializers.CharField(source="get_full_name", read_only=True)
    order_count = serializers.IntegerField(read_only=True)

    class Meta:
        model = User
        fields = ["id", "email", "full_name", "role", "is_active", "is_email_verified", "order_count", "created_at"]
        read_only_fields = fields


class AdminSetUserActiveSerializer(serializers.Serializer):
    """Validates the admin action of activating/deactivating a customer account."""

    is_active = serializers.BooleanField()

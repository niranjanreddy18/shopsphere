"""
Service layer for the accounts domain.

Design decision (Service Layer Pattern):
    Views should only be responsible for HTTP concerns: parsing the request,
    calling a service, and shaping the response. All business logic —
    creating users, issuing tokens, sending emails, enforcing invariants
    that span multiple models — lives here instead. This keeps views thin,
    makes business logic independently unit-testable (no request/response
    cycle needed), and means the same logic could be reused from a
    management command, a Celery task, or the Django admin without
    duplicating it.
"""

import logging
from datetime import timedelta

from django.conf import settings
from django.core.mail import send_mail
from django.utils import timezone
from rest_framework_simplejwt.tokens import RefreshToken

from core.exceptions import ApplicationError

from .models import Address, EmailVerificationToken, PasswordResetToken, User

logger = logging.getLogger("apps")


class EmailService:
    """
    Handles all outbound transactional email for the accounts domain.

    "Mock" email verification: EMAIL_BACKEND defaults to Django's console
    backend (see settings/base.py), so in development these emails are
    printed to the server console instead of actually being sent. Swapping
    to a real provider (SES, SendGrid, Mailgun) later is a one-line settings
    change — no code here needs to change.
    """

    @staticmethod
    def send_verification_email(user: User, token: EmailVerificationToken) -> None:
        verification_link = f"{settings.FRONTEND_URL}/verify-email?token={token.token}"
        logger.info("[MOCK EMAIL] Verification link for %s: %s", user.email, verification_link)
        send_mail(
            subject="Verify your email address",
            message=(
                f"Hi {user.first_name},\n\n"
                f"Please verify your email address by visiting the link below:\n"
                f"{verification_link}\n\n"
                f"This link expires in 24 hours."
            ),
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            fail_silently=True,
        )

    @staticmethod
    def send_password_reset_email(user: User, token: PasswordResetToken) -> None:
        reset_link = f"{settings.FRONTEND_URL}/reset-password?token={token.token}"
        logger.info("[MOCK EMAIL] Password reset link for %s: %s", user.email, reset_link)
        send_mail(
            subject="Reset your password",
            message=(
                f"Hi {user.first_name},\n\n"
                f"We received a request to reset your password. Click the link below:\n"
                f"{reset_link}\n\n"
                f"This link expires in 1 hour. If you didn't request this, ignore this email."
            ),
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            fail_silently=True,
        )


class AuthService:
    """Encapsulates all authentication-related business logic."""

    @staticmethod
    def register(*, email: str, password: str, first_name: str, last_name: str, phone_number: str = "") -> User:
        """
        Create a new customer account and kick off the (mock) email
        verification flow.
        """
        user = User.objects.create_user(
            email=email,
            password=password,
            first_name=first_name,
            last_name=last_name,
            phone_number=phone_number,
            role=User.Role.CUSTOMER,
        )

        token = EmailVerificationToken.objects.create(user=user)
        EmailService.send_verification_email(user, token)

        return user

    @staticmethod
    def issue_tokens_for_user(user: User) -> dict:
        """
        Issue a fresh access/refresh JWT pair for a user.

        Centralised here so both the login endpoint and (in future) social
        login / admin impersonation flows generate tokens identically.
        """
        refresh = RefreshToken.for_user(user)
        return {
            "access": str(refresh.access_token),
            "refresh": str(refresh),
        }

    @staticmethod
    def verify_email(*, token: str) -> User:
        try:
            verification_token = EmailVerificationToken.objects.select_related("user").get(token=token)
        except EmailVerificationToken.DoesNotExist as exc:
            raise ApplicationError("Invalid verification token.", code="invalid_token") from exc

        if not verification_token.is_valid:
            raise ApplicationError("This verification link has expired or was already used.", code="token_expired")

        user = verification_token.user
        user.is_email_verified = True
        user.save(update_fields=["is_email_verified"])

        verification_token.is_used = True
        verification_token.save(update_fields=["is_used"])

        return user

    @staticmethod
    def request_password_reset(*, email: str) -> None:
        """
        Issue a password-reset token if the email matches an account.

        Deliberately does NOT raise an error (and the view returns the same
        generic success message either way) when the email doesn't match any
        account — this prevents user enumeration attacks where an attacker
        could probe which emails are registered.
        """
        user = User.objects.filter(email=email).first()
        if user is None:
            logger.info("Password reset requested for unknown email: %s", email)
            return

        token = PasswordResetToken.objects.create(user=user)
        EmailService.send_password_reset_email(user, token)

    @staticmethod
    def reset_password(*, token: str, new_password: str) -> None:
        try:
            reset_token = PasswordResetToken.objects.select_related("user").get(token=token)
        except PasswordResetToken.DoesNotExist as exc:
            raise ApplicationError("Invalid or expired reset token.", code="invalid_token") from exc

        if not reset_token.is_valid:
            raise ApplicationError("This reset link has expired or was already used.", code="token_expired")

        user = reset_token.user
        user.set_password(new_password)
        user.save(update_fields=["password"])

        reset_token.is_used = True
        reset_token.save(update_fields=["is_used"])

        # Invalidate any other outstanding reset tokens for this user so an
        # old, previously-issued link can't still be used afterward.
        PasswordResetToken.objects.filter(user=user, is_used=False).exclude(pk=reset_token.pk).update(is_used=True)

    @staticmethod
    def change_password(*, user: User, old_password: str, new_password: str) -> None:
        if not user.check_password(old_password):
            raise ApplicationError("Current password is incorrect.", code="invalid_password")

        user.set_password(new_password)
        user.save(update_fields=["password"])


class AddressService:
    """Encapsulates business logic for managing user addresses."""

    @staticmethod
    def set_default(*, address: Address) -> Address:
        """
        Mark an address as the default for its (user, type) pair.

        Relies on the `enforce_single_default_address` signal (see
        signals.py) to unset the flag on sibling addresses, so this method
        only needs to set the flag on the target and save.
        """
        address.is_default = True
        address.save(update_fields=["is_default"])
        return address

    @staticmethod
    def delete_address(*, address: Address) -> None:
        was_default = address.is_default
        user, address_type = address.user, address.address_type
        address.delete()

        # If the deleted address was the default, promote the most recently
        # created remaining address of the same type to default so the user
        # always has a sane default whenever one exists.
        if was_default:
            fallback = (
                Address.objects.filter(user=user, address_type=address_type)
                .order_by("-created_at")
                .first()
            )
            if fallback:
                fallback.is_default = True
                fallback.save(update_fields=["is_default"])


class AdminUserService:
    """
    Business logic for the Admin Dashboard's "Manage Customers" screen.

    Kept as its own service class (rather than adding methods to
    AuthService) since this is a distinct concern — admin moderation of
    other users' accounts — with different authorization requirements than
    the self-service auth flows AuthService covers.
    """

    @staticmethod
    def set_active(*, user: User, is_active: bool) -> User:
        """
        Activates or deactivates a customer account. Deactivating sets
        `is_active=False`, which Django's own `authenticate()` already
        checks — a deactivated user is immediately unable to log in or use
        any existing access token (SimpleJWT's default authentication
        backend re-validates `is_active` on every request).
        """
        user.is_active = is_active
        user.save(update_fields=["is_active", "updated_at"])
        return user

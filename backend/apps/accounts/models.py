"""
Models for the accounts domain.

Contains:
    - User: custom, email-authenticated user with role-based access control.
    - Address: normalised, many-per-user shipping/billing addresses.
    - PasswordResetToken: single-use tokens for the forgot-password flow.
    - EmailVerificationToken: single-use tokens for the (mock) email
      verification flow.

Design decisions:
    - UUID primary keys (via core.models.BaseModel) so IDs are safe to expose
      in URLs/API responses without leaking sequential-signup information.
    - Role is a simple choices field rather than Django's Groups/Permissions
      system: for a two-role platform (Customer/Admin) that machinery is
      unnecessary complexity. It can be layered on top later if a richer
      permission matrix is needed.
"""

import uuid
from datetime import timedelta

from django.contrib.auth.base_user import AbstractBaseUser
from django.contrib.auth.models import PermissionsMixin
from django.db import models
from django.utils import timezone

from core.models import BaseModel

from .managers import UserManager
from .validators import phone_number_validator, postal_code_validator


class User(AbstractBaseUser, PermissionsMixin):
    """
    Custom user model authenticated by email instead of username.

    Inherits AbstractBaseUser + PermissionsMixin directly (rather than
    BaseModel) because Django's auth machinery expects specific field/manager
    wiring that is simpler to control explicitly here.
    """

    class Role(models.TextChoices):
        CUSTOMER = "CUSTOMER", "Customer"
        ADMIN = "ADMIN", "Admin"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    email = models.EmailField(unique=True, db_index=True)
    first_name = models.CharField(max_length=150)
    last_name = models.CharField(max_length=150)
    phone_number = models.CharField(
        max_length=20, blank=True, validators=[phone_number_validator]
    )
    role = models.CharField(max_length=10, choices=Role.choices, default=Role.CUSTOMER)

    avatar = models.ImageField(upload_to="avatars/%Y/%m/", blank=True, null=True)

    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    is_email_verified = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects = UserManager()

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["first_name", "last_name"]

    class Meta:
        db_table = "accounts_user"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["email"]),
            models.Index(fields=["role"]),
        ]

    def __str__(self) -> str:
        return f"{self.get_full_name()} <{self.email}>"

    def get_full_name(self) -> str:
        return f"{self.first_name} {self.last_name}".strip()

    def get_short_name(self) -> str:
        return self.first_name

    @property
    def is_admin(self) -> bool:
        return self.role == self.Role.ADMIN


class Address(BaseModel):
    """
    A shipping/billing address belonging to a user.

    A user may have multiple addresses (normalised into their own table
    rather than flattened onto User) with exactly one marked as default per
    address `type`. Enforcing "only one default per user+type" is handled in
    the service layer (see services.AddressService) rather than a DB
    constraint, because the check spans multiple rows.
    """

    class AddressType(models.TextChoices):
        SHIPPING = "SHIPPING", "Shipping"
        BILLING = "BILLING", "Billing"

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="addresses")
    address_type = models.CharField(
        max_length=10, choices=AddressType.choices, default=AddressType.SHIPPING
    )

    full_name = models.CharField(max_length=255)
    phone_number = models.CharField(max_length=20, validators=[phone_number_validator])

    line1 = models.CharField(max_length=255)
    line2 = models.CharField(max_length=255, blank=True)
    city = models.CharField(max_length=100)
    state = models.CharField(max_length=100)
    postal_code = models.CharField(max_length=20, validators=[postal_code_validator])
    country = models.CharField(max_length=100)

    is_default = models.BooleanField(default=False)

    class Meta:
        db_table = "accounts_address"
        ordering = ["-is_default", "-created_at"]
        indexes = [
            models.Index(fields=["user", "address_type"]),
        ]

    def __str__(self) -> str:
        return f"{self.full_name} — {self.city}, {self.country}"


class PasswordResetToken(BaseModel):
    """
    Single-use, time-limited token issued for the forgot-password flow.

    Storing tokens server-side (rather than only signing a stateless JWT)
    lets us invalidate a token the instant it's used, which a stateless JWT
    cannot do without an extra blacklist — and we need a blacklist either
    way, so an explicit model is simpler to reason about.
    """

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="password_reset_tokens")
    token = models.UUIDField(default=uuid.uuid4, unique=True, editable=False, db_index=True)
    is_used = models.BooleanField(default=False)
    expires_at = models.DateTimeField()

    class Meta:
        db_table = "accounts_password_reset_token"
        ordering = ["-created_at"]

    def save(self, *args, **kwargs):
        if not self.expires_at:
            # Reset links are valid for 1 hour — short enough to limit the
            # blast radius of a leaked email, long enough to be usable.
            self.expires_at = timezone.now() + timedelta(hours=1)
        super().save(*args, **kwargs)

    @property
    def is_valid(self) -> bool:
        return not self.is_used and timezone.now() < self.expires_at

    def __str__(self) -> str:
        return f"PasswordResetToken(user={self.user_id}, used={self.is_used})"


class EmailVerificationToken(BaseModel):
    """
    Single-use token for the (mock) email verification flow.

    "Mock" means no real email provider is wired up — see
    services.EmailService, which currently logs/prints the verification link
    instead of sending a real email via SES/SendGrid/etc. Swapping in a real
    provider later only requires changing EmailService, not this model.
    """

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="email_verification_tokens")
    token = models.UUIDField(default=uuid.uuid4, unique=True, editable=False, db_index=True)
    is_used = models.BooleanField(default=False)
    expires_at = models.DateTimeField()

    class Meta:
        db_table = "accounts_email_verification_token"
        ordering = ["-created_at"]

    def save(self, *args, **kwargs):
        if not self.expires_at:
            self.expires_at = timezone.now() + timedelta(hours=24)
        super().save(*args, **kwargs)

    @property
    def is_valid(self) -> bool:
        return not self.is_used and timezone.now() < self.expires_at

    def __str__(self) -> str:
        return f"EmailVerificationToken(user={self.user_id}, used={self.is_used})"

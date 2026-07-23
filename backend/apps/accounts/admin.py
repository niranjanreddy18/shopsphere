"""Django admin configuration for the accounts app."""

from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as DjangoUserAdmin

from .models import Address, EmailVerificationToken, PasswordResetToken, User


@admin.register(User)
class UserAdmin(DjangoUserAdmin):
    """
    Admin configuration for the custom, email-based User model.

    Overrides Django's default UserAdmin fieldsets/lists (which assume a
    `username` field) to work with our email-based schema instead.
    """

    ordering = ["-created_at"]
    list_display = ["email", "first_name", "last_name", "role", "is_email_verified", "is_active", "created_at"]
    list_filter = ["role", "is_active", "is_email_verified", "is_staff"]
    search_fields = ["email", "first_name", "last_name"]
    readonly_fields = ["id", "created_at", "updated_at", "last_login"]

    fieldsets = (
        (None, {"fields": ("email", "password")}),
        ("Personal info", {"fields": ("first_name", "last_name", "phone_number", "avatar")}),
        ("Role & status", {"fields": ("role", "is_active", "is_staff", "is_superuser", "is_email_verified")}),
        ("Permissions", {"fields": ("groups", "user_permissions")}),
        ("Important dates", {"fields": ("last_login", "created_at", "updated_at")}),
    )
    add_fieldsets = (
        (
            None,
            {
                "classes": ("wide",),
                "fields": ("email", "first_name", "last_name", "password1", "password2", "role"),
            },
        ),
    )


@admin.register(Address)
class AddressAdmin(admin.ModelAdmin):
    list_display = ["user", "address_type", "city", "country", "is_default", "created_at"]
    list_filter = ["address_type", "is_default", "country"]
    search_fields = ["user__email", "city", "postal_code"]


@admin.register(PasswordResetToken)
class PasswordResetTokenAdmin(admin.ModelAdmin):
    list_display = ["user", "token", "is_used", "expires_at", "created_at"]
    readonly_fields = ["token"]


@admin.register(EmailVerificationToken)
class EmailVerificationTokenAdmin(admin.ModelAdmin):
    list_display = ["user", "token", "is_used", "expires_at", "created_at"]
    readonly_fields = ["token"]

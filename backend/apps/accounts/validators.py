"""
Custom validators for account-related fields.

Kept separate from models.py/serializers.py so validation rules can be
unit-tested in isolation and reused between the model layer and the
serializer layer without duplication.
"""

import re

from django.core.exceptions import ValidationError
from django.core.validators import RegexValidator

# E.164-ish phone validator: optional leading +, 7-15 digits.
phone_number_validator = RegexValidator(
    regex=r"^\+?[1-9]\d{6,14}$",
    message="Enter a valid phone number, e.g. +919876543210.",
)

# Postal codes vary wildly by country; this is a permissive baseline check
# (alphanumeric, spaces, hyphens, 3-10 chars) rather than a strict format.
postal_code_validator = RegexValidator(
    regex=r"^[A-Za-z0-9\s\-]{3,10}$",
    message="Enter a valid postal code.",
)


def validate_strong_password(password: str) -> None:
    """
    Enforce a strong-password policy beyond Django's built-in validators:
      - at least one uppercase letter
      - at least one lowercase letter
      - at least one digit
      - at least one special character

    Raised as a ValidationError so it composes cleanly with
    AUTH_PASSWORD_VALIDATORS and DRF serializer validation.
    """
    errors = []

    if not re.search(r"[A-Z]", password):
        errors.append("Password must contain at least one uppercase letter.")
    if not re.search(r"[a-z]", password):
        errors.append("Password must contain at least one lowercase letter.")
    if not re.search(r"\d", password):
        errors.append("Password must contain at least one digit.")
    if not re.search(r"[!@#$%^&*(),.?\":{}|<>_\-+=]", password):
        errors.append("Password must contain at least one special character.")

    if errors:
        raise ValidationError(errors)

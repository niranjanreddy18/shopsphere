"""Validators for the coupons domain."""

from django.core.exceptions import ValidationError


def validate_valid_date_range(valid_from, valid_until) -> None:
    if valid_from and valid_until and valid_from >= valid_until:
        raise ValidationError("valid_until must be after valid_from.")

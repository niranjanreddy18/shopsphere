"""Validators for the cart domain."""

from django.core.exceptions import ValidationError


def validate_quantity(value: int) -> None:
    if value < 1:
        raise ValidationError("Quantity must be at least 1.")

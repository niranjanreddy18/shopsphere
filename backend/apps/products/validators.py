"""Custom validators for the products domain."""

from django.core.exceptions import ValidationError


def validate_discount_price(price, discount_price) -> None:
    """A discount price, if set, must be strictly less than the regular price."""
    if discount_price is not None and discount_price >= price:
        raise ValidationError("Discount price must be lower than the regular price.")


def validate_positive_quantity(value: int) -> None:
    if value < 0:
        raise ValidationError("Quantity cannot be negative.")

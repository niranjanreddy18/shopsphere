from django.apps import AppConfig


class CartConfig(AppConfig):
    """App configuration for the shopping cart domain (guest + authenticated carts)."""

    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.cart"
    verbose_name = "Shopping Cart"

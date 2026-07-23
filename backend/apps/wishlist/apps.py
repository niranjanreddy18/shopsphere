from django.apps import AppConfig


class WishlistConfig(AppConfig):
    """App configuration for the wishlist domain (authenticated users only)."""

    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.wishlist"
    verbose_name = "Wishlist"

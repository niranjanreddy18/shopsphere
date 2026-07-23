from django.apps import AppConfig


class CouponsConfig(AppConfig):
    """App configuration for the coupons/discounts domain."""

    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.coupons"
    verbose_name = "Coupons & Discounts"

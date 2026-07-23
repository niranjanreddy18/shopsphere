from django.apps import AppConfig


class PaymentsConfig(AppConfig):
    """App configuration for the payments domain: Stripe test-mode checkout and webhook handling."""

    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.payments"
    verbose_name = "Payments"

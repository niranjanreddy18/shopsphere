from django.apps import AppConfig


class OrdersConfig(AppConfig):
    """App configuration for the orders domain: checkout, order lifecycle, tracking, invoices."""

    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.orders"
    verbose_name = "Orders & Checkout"

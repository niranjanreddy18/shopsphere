from django.apps import AppConfig


class AnalyticsConfig(AppConfig):
    """
    App configuration for the analytics domain.

    Deliberately holds no models of its own — every number here is
    aggregated live from Order/OrderItem/Product/User via
    AnalyticsService, rather than a separate pre-computed reporting table.
    See AnalyticsService's module docstring for the trade-off this implies.
    """

    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.analytics"
    verbose_name = "Analytics & Reporting"

from django.apps import AppConfig


class NotificationsConfig(AppConfig):
    """App configuration for the notifications domain: in-app notifications + mock transactional email."""

    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.notifications"
    verbose_name = "Notifications"

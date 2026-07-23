from django.apps import AppConfig


class AccountsConfig(AppConfig):
    """
    App configuration for the accounts domain.

    Handles user identity, authentication, profiles, addresses, and
    role-based access control (Customer / Admin).
    """

    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.accounts"
    verbose_name = "Accounts & Authentication"

    def ready(self):
        # Imported here (not at module top-level) to avoid circular imports
        # and the classic "AppRegistryNotReady" error — signal handlers must
        # only be wired up once the app registry has finished loading.
        import apps.accounts.signals  # noqa: F401

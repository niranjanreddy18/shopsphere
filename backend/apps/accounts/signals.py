"""
Signal handlers for the accounts app.

Kept intentionally minimal: business logic belongs in the service layer
(services.py), not in signal handlers, which are easy to lose track of and
hard to unit test in isolation. Signals here are limited to simple,
unavoidably-signal-shaped concerns.
"""

from django.db.models.signals import post_save
from django.dispatch import receiver

from .models import Address, User


@receiver(post_save, sender=Address)
def enforce_single_default_address(sender, instance: Address, **kwargs):
    """
    Ensure at most one address per (user, address_type) is marked default.

    When an address is saved with is_default=True, unset the flag on every
    other address of the same user + type. This runs as a signal (rather
    than only in the service layer) so the invariant holds even if an
    Address is ever created/updated through the Django admin or a data
    migration, not just through AddressService.
    """
    if instance.is_default:
        Address.objects.filter(
            user=instance.user, address_type=instance.address_type
        ).exclude(pk=instance.pk).update(is_default=False)


@receiver(post_save, sender=User)
def log_user_creation(sender, instance: User, created: bool, **kwargs):
    """Emit a structured log line whenever a new account is created."""
    if created:
        import logging

        logging.getLogger("apps").info(
            "New user account created: %s (role=%s)", instance.email, instance.role
        )

"""Custom validators for the orders domain."""

from django.core.exceptions import ValidationError

from .models import Order

# Explicit allow-list of legal status transitions. Encoded as data (not a
# chain of if/elif in the service) so the whole state machine is visible
# and auditable at a glance, and so tests can iterate over it exhaustively.
ALLOWED_TRANSITIONS = {
    Order.Status.PENDING: {Order.Status.CONFIRMED, Order.Status.CANCELLED},
    Order.Status.CONFIRMED: {Order.Status.PROCESSING, Order.Status.CANCELLED},
    Order.Status.PROCESSING: {Order.Status.SHIPPED, Order.Status.CANCELLED},
    Order.Status.SHIPPED: {Order.Status.DELIVERED},
    Order.Status.DELIVERED: {Order.Status.REFUNDED},
    Order.Status.CANCELLED: set(),
    Order.Status.REFUNDED: set(),
}


def validate_status_transition(current_status: str, new_status: str) -> None:
    """Raises ValidationError if `new_status` is not a legal transition from `current_status`."""
    allowed = ALLOWED_TRANSITIONS.get(current_status, set())
    if new_status not in allowed:
        raise ValidationError(
            f"Cannot transition order from '{current_status}' to '{new_status}'. "
            f"Allowed next states: {sorted(allowed) or 'none (terminal status)'}."
        )

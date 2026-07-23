"""Permission classes for the payments domain."""

from rest_framework.permissions import BasePermission


class IsPaymentOwnerOrAdmin(BasePermission):
    """Allows access if the requesting user owns the payment's order, or is an admin."""

    def has_object_permission(self, request, view, obj):
        if request.user.role == request.user.Role.ADMIN:
            return True
        return obj.order.user_id == request.user.id

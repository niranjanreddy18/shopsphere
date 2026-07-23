"""Permission classes for the orders domain."""

from rest_framework.permissions import BasePermission


class IsOrderOwnerOrAdmin(BasePermission):
    """Allows access if the requesting user placed the order, or is an admin."""

    message = "You do not have permission to access this order."

    def has_object_permission(self, request, view, obj):
        if request.user.role == request.user.Role.ADMIN:
            return True
        return obj.user_id == request.user.id

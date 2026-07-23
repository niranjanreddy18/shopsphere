"""Permission classes for the notifications domain."""

from rest_framework.permissions import BasePermission


class IsNotificationOwner(BasePermission):
    """Restricts access to a notification to the user it belongs to."""

    def has_object_permission(self, request, view, obj):
        return obj.user_id == request.user.id

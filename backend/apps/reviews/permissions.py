"""Permission classes for the reviews domain."""

from rest_framework.permissions import BasePermission


class IsReviewOwnerOrAdmin(BasePermission):
    """Allows edit/delete if the requesting user wrote the review, or is an admin."""

    def has_object_permission(self, request, view, obj):
        if request.user.role == request.user.Role.ADMIN:
            return True
        return obj.user_id == request.user.id

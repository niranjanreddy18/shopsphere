"""Permission classes for the coupons domain."""

from rest_framework.permissions import SAFE_METHODS, BasePermission


class IsAdminOrReadOnlyForActiveCoupons(BasePermission):
    """
    Only admins may create/update/delete coupons. Admins may list all
    coupons (including inactive/expired ones for management); everyone else
    only ever reaches the validate endpoint, not the list/detail management
    endpoints, so no anonymous-read path is needed here.
    """

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role == request.user.Role.ADMIN
        )

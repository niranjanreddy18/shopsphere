"""
Permission classes for the products domain.

Catalog data (categories, brands, products, images) is publicly readable —
anyone can browse the storefront without logging in — but only admins may
create/update/delete it.
"""

from rest_framework.permissions import SAFE_METHODS, BasePermission


class IsAdminOrReadOnly(BasePermission):
    """Allows unrestricted read access; write access is admin-only."""

    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return True
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role == request.user.Role.ADMIN
        )

"""
Shared, reusable permission classes.

Each domain app may define its own fine-grained permissions in its own
permissions.py, but role-based checks that are identical across apps (e.g.
"is this user an admin?") live here to avoid duplication.
"""

from rest_framework.permissions import BasePermission, SAFE_METHODS


class IsAdmin(BasePermission):
    """Grants access only to authenticated users with the ADMIN role."""

    message = "This action is restricted to administrators."

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role == request.user.Role.ADMIN
        )


class IsCustomer(BasePermission):
    """Grants access only to authenticated users with the CUSTOMER role."""

    message = "This action is restricted to customers."

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.role == request.user.Role.CUSTOMER
        )


class IsOwnerOrAdmin(BasePermission):
    """
    Object-level permission: allows access if the requesting user owns the
    object (via an `owner` or `user` attribute) or is an admin.

    Read access (SAFE_METHODS) is left to be combined with other permission
    classes by the view if public read access is desired.
    """

    def has_object_permission(self, request, view, obj):
        if request.user and request.user.role == request.user.Role.ADMIN:
            return True

        owner = getattr(obj, "user", None) or getattr(obj, "owner", None)
        return owner == request.user


class ReadOnly(BasePermission):
    """Allows only safe (GET/HEAD/OPTIONS) methods."""

    def has_permission(self, request, view):
        return request.method in SAFE_METHODS

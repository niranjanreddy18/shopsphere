"""
Permission classes specific to the accounts domain.

Generic role-based permissions (IsAdmin, IsCustomer) live in core.permissions
and are imported by other apps too; this module only holds permissions that
are meaningful exclusively in the context of accounts (e.g. "is this address
owned by the requesting user").
"""

from rest_framework.permissions import BasePermission


class IsAddressOwner(BasePermission):
    """
    Object-level permission restricting address read/write access to the
    address's own owner. Admins are deliberately NOT given a blanket bypass
    here — addresses are considered private user data even from support
    staff, unless explicitly elevated via Django admin.
    """

    message = "You do not have permission to access this address."

    def has_object_permission(self, request, view, obj):
        return obj.user_id == request.user.id


class IsSelf(BasePermission):
    """Restricts access to a user resource to that same authenticated user."""

    message = "You can only access your own account."

    def has_object_permission(self, request, view, obj):
        return obj.id == request.user.id

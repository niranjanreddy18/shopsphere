"""Permission helpers for the cart domain (ownership check for guest-token carts)."""

from rest_framework.permissions import BasePermission


class IsCartOwner(BasePermission):
    """
    Allows access to a cart if the request is authenticated as the cart's
    user, or supplies the matching `X-Cart-Token` header for a guest cart.
    Actual ownership resolution happens in CartService.get_or_create_cart —
    this permission exists mainly as a defence-in-depth object check for
    the rare direct-by-id lookup.
    """

    def has_object_permission(self, request, view, obj):
        if request.user and request.user.is_authenticated:
            return obj.user_id == request.user.id
        token = request.headers.get("X-Cart-Token")
        return token is not None and str(obj.cart_token) == token

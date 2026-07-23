"""Service layer for the wishlist domain."""

from django.db import transaction

from apps.cart.models import Cart
from apps.cart.services import CartService
from apps.products.models import Product
from core.exceptions import ApplicationError

from .models import WishlistItem


class WishlistService:
    """Encapsulates wishlist add/remove/move-to-cart business logic."""

    @staticmethod
    def add_item(*, user, product: Product) -> WishlistItem:
        item, created = WishlistItem.objects.get_or_create(user=user, product=product)
        if not created:
            raise ApplicationError("This product is already in your wishlist.", code="already_wishlisted")
        return item

    @staticmethod
    def remove_item(*, user, product_id) -> None:
        deleted, _ = WishlistItem.objects.filter(user=user, product_id=product_id).delete()
        if not deleted:
            raise ApplicationError("This product is not in your wishlist.", code="not_wishlisted")

    @staticmethod
    @transaction.atomic
    def move_to_cart(*, user, product_id, quantity: int = 1) -> None:
        """
        Adds the product to the user's cart, then removes it from the
        wishlist — implemented as "add first, remove second" so a stock
        failure on add_item leaves the wishlist untouched rather than
        losing the item.
        """
        item = WishlistItem.objects.filter(user=user, product_id=product_id).select_related("product").first()
        if item is None:
            raise ApplicationError("This product is not in your wishlist.", code="not_wishlisted")

        cart, _ = CartService.get_or_create_cart(user=user)
        CartService.add_item(cart=cart, product=item.product, quantity=quantity)
        item.delete()

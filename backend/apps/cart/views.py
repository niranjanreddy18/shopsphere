"""
API views for the cart domain.

Every view here resolves "which cart does this request belong to" via
CartService.get_or_create_cart(user, cart_token) — user takes priority when
authenticated, otherwise the `X-Cart-Token` request header identifies a
guest cart. When a brand-new guest token is minted, it's echoed back via
the `X-Cart-Token` response header so the frontend can persist it (see
frontend api/cartApi.js).
"""

from django.shortcuts import get_object_or_404
from drf_spectacular.utils import OpenApiParameter, OpenApiResponse, extend_schema
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import CartItem
from .serializers import AddCartItemSerializer, CartSerializer, UpdateCartItemSerializer
from .services import CartService

# Every cart response carries the full cart, so every view below documents
# CartSerializer as its response shape regardless of HTTP verb.
CART_RESPONSES = {200: CartSerializer, 201: CartSerializer}
COUPON_CODE_PARAM = OpenApiParameter(
    name="coupon_code", type=str, location=OpenApiParameter.QUERY, required=False,
    description="Optional coupon code to preview applied to the returned cart summary.",
)


class CartViewMixin:
    """Shared cart-resolution logic for every view in this module."""

    permission_classes = [permissions.AllowAny]

    def resolve_cart(self, request):
        user = request.user if request.user.is_authenticated else None
        token_header = request.headers.get("X-Cart-Token")
        cart, is_new_token = CartService.get_or_create_cart(
            user=user, cart_token=token_header if not user else None
        )
        return cart, is_new_token

    def response_with_cart(self, request, cart, is_new_token, status_code=status.HTTP_200_OK):
        # DRF's request.data safely returns an empty dict/QueryDict for GET
        # requests with no body, so this works uniformly across verbs.
        coupon_code = request.query_params.get("coupon_code") or request.data.get("coupon_code")
        serializer = CartSerializer(cart, context={"request": request, "coupon_code": coupon_code})
        response = Response(serializer.data, status=status_code)
        if is_new_token:
            response["X-Cart-Token"] = str(cart.cart_token)
        return response


class CartDetailView(CartViewMixin, APIView):
    """GET /api/v1/cart/ — the current cart (guest or logged-in) with items + summary."""

    @extend_schema(parameters=[COUPON_CODE_PARAM], responses=CART_RESPONSES)
    def get(self, request):
        cart, is_new_token = self.resolve_cart(request)
        return self.response_with_cart(request, cart, is_new_token)


class CartItemListCreateView(CartViewMixin, APIView):
    """POST /api/v1/cart/items/ — add a product to the cart."""

    @extend_schema(request=AddCartItemSerializer, responses=CART_RESPONSES)
    def post(self, request):
        cart, is_new_token = self.resolve_cart(request)
        serializer = AddCartItemSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        CartService.add_item(
            cart=cart,
            product=serializer.validated_data["product"],
            quantity=serializer.validated_data["quantity"],
        )
        return self.response_with_cart(request, cart, is_new_token, status_code=status.HTTP_201_CREATED)


class CartItemDetailView(CartViewMixin, APIView):
    """PATCH /api/v1/cart/items/<uuid:pk>/ — update quantity. DELETE — remove the item."""

    def _get_item(self, request, pk):
        cart, is_new_token = self.resolve_cart(request)
        item = get_object_or_404(CartItem, pk=pk, cart=cart)
        return cart, is_new_token, item

    @extend_schema(request=UpdateCartItemSerializer, responses=CART_RESPONSES)
    def patch(self, request, pk):
        cart, is_new_token, item = self._get_item(request, pk)
        serializer = UpdateCartItemSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        CartService.update_quantity(cart_item=item, quantity=serializer.validated_data["quantity"])
        return self.response_with_cart(request, cart, is_new_token)

    @extend_schema(request=None, responses=CART_RESPONSES)
    def delete(self, request, pk):
        cart, is_new_token, item = self._get_item(request, pk)
        CartService.remove_item(cart_item=item)
        return self.response_with_cart(request, cart, is_new_token)


class SaveForLaterView(CartViewMixin, APIView):
    """POST /api/v1/cart/items/<uuid:pk>/save-for-later/"""

    @extend_schema(request=None, responses=CART_RESPONSES)
    def post(self, request, pk):
        cart, is_new_token = self.resolve_cart(request)
        item = get_object_or_404(CartItem, pk=pk, cart=cart)
        CartService.save_for_later(cart_item=item)
        return self.response_with_cart(request, cart, is_new_token)


class MoveToCartView(CartViewMixin, APIView):
    """POST /api/v1/cart/items/<uuid:pk>/move-to-cart/ — moves a saved-for-later item back to the active cart."""

    @extend_schema(request=None, responses=CART_RESPONSES)
    def post(self, request, pk):
        cart, is_new_token = self.resolve_cart(request)
        item = get_object_or_404(CartItem, pk=pk, cart=cart)
        CartService.move_to_cart(cart_item=item)
        return self.response_with_cart(request, cart, is_new_token)


class MergeGuestCartView(APIView):
    """
    POST /api/v1/cart/merge/  (authenticated only)

    Called by the frontend immediately after a successful login/registration
    if it's holding a guest cart token, so the guest cart's items are folded
    into the user's persistent cart instead of being lost.
    """

    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(
        request=None,
        responses={200: CartSerializer, 400: OpenApiResponse(description="Missing cart_token.")},
    )
    def post(self, request):
        cart_token = request.data.get("cart_token") or request.headers.get("X-Cart-Token")
        if not cart_token:
            return Response(
                {"success": False, "message": "cart_token is required.", "errors": None},
                status=status.HTTP_400_BAD_REQUEST,
            )

        from .models import Cart

        guest_cart = Cart.objects.filter(cart_token=cart_token).first()
        if guest_cart is None:
            # Nothing to merge — not an error, the user simply has no guest cart.
            user_cart, _ = CartService.get_or_create_cart(user=request.user)
        else:
            user_cart = CartService.merge_guest_cart_into_user_cart(guest_cart=guest_cart, user=request.user)

        serializer = CartSerializer(user_cart, context={"request": request})
        return Response(serializer.data, status=status.HTTP_200_OK)

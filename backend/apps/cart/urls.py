"""URL configuration for the cart app — mounted at /api/v1/cart/."""

from django.urls import path

from . import views

app_name = "cart"

urlpatterns = [
    path("", views.CartDetailView.as_view(), name="cart-detail"),
    path("merge/", views.MergeGuestCartView.as_view(), name="cart-merge"),
    path("items/", views.CartItemListCreateView.as_view(), name="cart-item-add"),
    path("items/<uuid:pk>/", views.CartItemDetailView.as_view(), name="cart-item-detail"),
    path("items/<uuid:pk>/save-for-later/", views.SaveForLaterView.as_view(), name="cart-item-save-for-later"),
    path("items/<uuid:pk>/move-to-cart/", views.MoveToCartView.as_view(), name="cart-item-move-to-cart"),
]

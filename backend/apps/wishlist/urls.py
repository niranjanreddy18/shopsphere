"""URL configuration for the wishlist app — mounted at /api/v1/wishlist/."""

from django.urls import path

from . import views

app_name = "wishlist"

urlpatterns = [
    path("", views.WishlistListCreateView.as_view(), name="wishlist-list-create"),
    path("<uuid:product_id>/", views.WishlistItemDetailView.as_view(), name="wishlist-item-detail"),
    path("<uuid:product_id>/move-to-cart/", views.MoveToCartView.as_view(), name="wishlist-item-move-to-cart"),
]

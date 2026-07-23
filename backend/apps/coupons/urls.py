"""URL configuration for the coupons app — mounted at /api/v1/coupons/."""

from django.urls import path

from . import views

app_name = "coupons"

urlpatterns = [
    path("validate/", views.ValidateCouponView.as_view(), name="coupon-validate"),
    path("", views.CouponListCreateView.as_view(), name="coupon-list-create"),
    path("<uuid:pk>/", views.CouponDetailView.as_view(), name="coupon-detail"),
]

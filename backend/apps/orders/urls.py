"""URL configuration for the orders app. Mounted at /api/v1/orders/."""

from django.urls import path

from . import views

app_name = "orders"

urlpatterns = [
    path("checkout/", views.CheckoutView.as_view(), name="checkout"),
    path("", views.OrderHistoryView.as_view(), name="order-history"),
    path("<uuid:pk>/", views.OrderDetailView.as_view(), name="order-detail"),
    path("<uuid:pk>/tracking/", views.OrderTrackingView.as_view(), name="order-tracking"),
    path("<uuid:pk>/cancel/", views.CancelOrderView.as_view(), name="order-cancel"),
    path("<uuid:pk>/invoice/", views.OrderInvoiceView.as_view(), name="order-invoice"),
    # --- Admin ---------------------------------------------------------
    path("admin/", views.AdminOrderListView.as_view(), name="admin-order-list"),
    path("admin/<uuid:pk>/status/", views.AdminOrderStatusUpdateView.as_view(), name="admin-order-status"),
    path("admin/<uuid:pk>/tracking/", views.AdminOrderTrackingUpdateView.as_view(), name="admin-order-tracking"),
]

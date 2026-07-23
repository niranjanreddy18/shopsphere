"""URL configuration for the payments app. Mounted at /api/v1/payments/."""

from django.urls import path

from . import views

app_name = "payments"

urlpatterns = [
    path("create-intent/", views.CreatePaymentIntentView.as_view(), name="create-intent"),
    path("<uuid:pk>/sync/", views.PaymentStatusSyncView.as_view(), name="sync-status"),
    path("order/<uuid:order_id>/", views.OrderPaymentListView.as_view(), name="order-payments"),
    path("webhook/", views.StripeWebhookView.as_view(), name="webhook"),
]

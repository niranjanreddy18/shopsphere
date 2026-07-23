"""Django admin registration for the payments app."""

from django.contrib import admin

from .models import Payment, WebhookEvent


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ["stripe_payment_intent_id", "order", "status", "amount", "currency", "paid_at"]
    list_filter = ["status", "provider"]
    search_fields = ["stripe_payment_intent_id", "order__order_number"]
    readonly_fields = ["stripe_payment_intent_id"]


@admin.register(WebhookEvent)
class WebhookEventAdmin(admin.ModelAdmin):
    list_display = ["stripe_event_id", "event_type", "processed", "created_at"]
    list_filter = ["event_type", "processed"]
    readonly_fields = ["stripe_event_id", "payload"]

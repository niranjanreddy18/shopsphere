"""
Models for the notifications domain.

A single Notification model backs the in-app notification bell/list; email
delivery (mocked, same pattern as apps.accounts.services.EmailService) is a
side effect triggered alongside creating one of these rows, not a separate
model — there's nothing about an email's delivery status worth persisting
in this project's scope.
"""

from django.conf import settings
from django.db import models

from core.models import BaseModel


class Notification(BaseModel):
    """An in-app notification for a user, optionally linked to an order."""

    class NotificationType(models.TextChoices):
        ORDER_PLACED = "ORDER_PLACED", "Order Placed"
        ORDER_STATUS_CHANGED = "ORDER_STATUS_CHANGED", "Order Status Changed"
        ORDER_CANCELLED = "ORDER_CANCELLED", "Order Cancelled"
        PAYMENT_SUCCESS = "PAYMENT_SUCCESS", "Payment Success"
        PAYMENT_FAILED = "PAYMENT_FAILED", "Payment Failed"

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="notifications")
    notification_type = models.CharField(max_length=30, choices=NotificationType.choices)
    title = models.CharField(max_length=255)
    message = models.CharField(max_length=500)
    related_order = models.ForeignKey(
        "orders.Order", on_delete=models.CASCADE, null=True, blank=True, related_name="notifications"
    )
    is_read = models.BooleanField(default=False)

    class Meta:
        db_table = "notifications_notification"
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["user", "is_read"])]

    def __str__(self) -> str:
        return f"{self.notification_type} -> {self.user_id}"

"""Serializers for the notifications domain."""

from rest_framework import serializers

from .models import Notification


class NotificationSerializer(serializers.ModelSerializer):
    order_number = serializers.CharField(source="related_order.order_number", read_only=True, default=None)

    class Meta:
        model = Notification
        fields = ["id", "notification_type", "title", "message", "order_number", "is_read", "created_at"]
        read_only_fields = fields

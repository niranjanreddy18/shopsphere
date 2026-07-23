"""
Service layer for the notifications domain.

NotificationService is called from OrderService and PaymentService as a
best-effort side effect of order/payment lifecycle events — it creates an
in-app Notification row and sends a (mocked) transactional email, mirroring
the console-backend email pattern established in
apps.accounts.services.EmailService.
"""

import logging

from django.conf import settings
from django.core.mail import send_mail

from .models import Notification

logger = logging.getLogger("apps")


class NotificationService:
    """Creates in-app notifications and triggers the matching mock email for order/payment events."""

    @staticmethod
    def _create_and_email(*, user, notification_type, title, message, order=None) -> Notification:
        notification = Notification.objects.create(
            user=user, notification_type=notification_type, title=title, message=message, related_order=order
        )

        logger.info("[MOCK EMAIL] To %s — %s: %s", user.email, title, message)
        send_mail(
            subject=title,
            message=message,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            fail_silently=True,
        )
        return notification

    @staticmethod
    def notify_order_placed(*, order) -> Notification:
        return NotificationService._create_and_email(
            user=order.user,
            notification_type=Notification.NotificationType.ORDER_PLACED,
            title=f"Order {order.order_number} placed",
            message=f"Thanks for your order! We've received order {order.order_number} for ${order.total_amount}.",
            order=order,
        )

    @staticmethod
    def notify_order_status_changed(*, order, old_status: str, new_status: str) -> Notification:
        return NotificationService._create_and_email(
            user=order.user,
            notification_type=Notification.NotificationType.ORDER_STATUS_CHANGED,
            title=f"Order {order.order_number} is now {new_status.title()}",
            message=f"Your order {order.order_number} status changed from {old_status} to {new_status}.",
            order=order,
        )

    @staticmethod
    def notify_order_cancelled(*, order) -> Notification:
        return NotificationService._create_and_email(
            user=order.user,
            notification_type=Notification.NotificationType.ORDER_CANCELLED,
            title=f"Order {order.order_number} cancelled",
            message=f"Your order {order.order_number} has been cancelled.",
            order=order,
        )

    @staticmethod
    def notify_payment_result(*, payment, success: bool) -> Notification:
        order = payment.order
        if success:
            return NotificationService._create_and_email(
                user=order.user,
                notification_type=Notification.NotificationType.PAYMENT_SUCCESS,
                title=f"Payment received for order {order.order_number}",
                message=f"We've received your payment of ${payment.amount} for order {order.order_number}.",
                order=order,
            )
        return NotificationService._create_and_email(
            user=order.user,
            notification_type=Notification.NotificationType.PAYMENT_FAILED,
            title=f"Payment failed for order {order.order_number}",
            message=f"Your payment for order {order.order_number} could not be processed. Please try again.",
            order=order,
        )

    @staticmethod
    def mark_as_read(*, notification: Notification) -> Notification:
        notification.is_read = True
        notification.save(update_fields=["is_read", "updated_at"])
        return notification

    @staticmethod
    def mark_all_as_read(*, user) -> int:
        return Notification.objects.filter(user=user, is_read=False).update(is_read=True)

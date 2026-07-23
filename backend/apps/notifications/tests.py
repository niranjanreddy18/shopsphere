"""Tests for the notifications app: services and API endpoints."""

from django.test import TestCase
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from apps.accounts.models import User

from .models import Notification
from .services import NotificationService


def _make_user(email="user@example.com"):
    return User.objects.create_user(email=email, password="StrongPass1!", first_name="A", last_name="B")


class NotificationServiceTests(TestCase):
    def setUp(self):
        self.user = _make_user()

    def test_mark_as_read(self):
        notification = Notification.objects.create(
            user=self.user, notification_type=Notification.NotificationType.ORDER_PLACED,
            title="t", message="m",
        )
        NotificationService.mark_as_read(notification=notification)
        notification.refresh_from_db()
        self.assertTrue(notification.is_read)

    def test_mark_all_as_read(self):
        Notification.objects.create(user=self.user, notification_type=Notification.NotificationType.ORDER_PLACED, title="t1", message="m1")
        Notification.objects.create(user=self.user, notification_type=Notification.NotificationType.ORDER_PLACED, title="t2", message="m2")

        count = NotificationService.mark_all_as_read(user=self.user)

        self.assertEqual(count, 2)
        self.assertEqual(Notification.objects.filter(user=self.user, is_read=False).count(), 0)


class NotificationAPITests(APITestCase):
    def setUp(self):
        self.user = _make_user()
        self.other_user = _make_user(email="other@example.com")
        self.client.force_authenticate(user=self.user)

    def test_list_only_returns_own_notifications(self):
        Notification.objects.create(user=self.user, notification_type=Notification.NotificationType.ORDER_PLACED, title="mine", message="m")
        Notification.objects.create(user=self.other_user, notification_type=Notification.NotificationType.ORDER_PLACED, title="theirs", message="m")

        response = self.client.get(reverse("notifications:notification-list"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["count"], 1)

    def test_mark_read_via_api(self):
        notification = Notification.objects.create(
            user=self.user, notification_type=Notification.NotificationType.ORDER_PLACED, title="t", message="m"
        )
        response = self.client.patch(reverse("notifications:notification-mark-read", args=[notification.id]))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["is_read"])

    def test_cannot_mark_another_users_notification_read(self):
        notification = Notification.objects.create(
            user=self.other_user, notification_type=Notification.NotificationType.ORDER_PLACED, title="t", message="m"
        )
        response = self.client.patch(reverse("notifications:notification-mark-read", args=[notification.id]))
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_mark_all_read_via_api(self):
        Notification.objects.create(user=self.user, notification_type=Notification.NotificationType.ORDER_PLACED, title="t1", message="m1")
        Notification.objects.create(user=self.user, notification_type=Notification.NotificationType.ORDER_PLACED, title="t2", message="m2")

        response = self.client.post(reverse("notifications:notification-mark-all-read"))
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(Notification.objects.filter(user=self.user, is_read=False).count(), 0)

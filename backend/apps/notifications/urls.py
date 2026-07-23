"""URL configuration for the notifications app. Mounted at /api/v1/notifications/."""

from django.urls import path

from . import views

app_name = "notifications"

urlpatterns = [
    path("", views.NotificationListView.as_view(), name="notification-list"),
    path("<uuid:pk>/read/", views.MarkNotificationReadView.as_view(), name="notification-mark-read"),
    path("mark-all-read/", views.MarkAllNotificationsReadView.as_view(), name="notification-mark-all-read"),
]

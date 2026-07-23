"""API views for the notifications domain."""

from django.shortcuts import get_object_or_404
from drf_spectacular.utils import OpenApiResponse, extend_schema
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Notification
from .permissions import IsNotificationOwner
from .serializers import NotificationSerializer
from .services import NotificationService


class NotificationListView(generics.ListAPIView):
    """GET /api/v1/notifications/ — the caller's notifications, newest first."""

    serializer_class = NotificationSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return Notification.objects.none()
        return Notification.objects.filter(user=self.request.user).select_related("related_order")


class MarkNotificationReadView(APIView):
    """PATCH /api/v1/notifications/<uuid:pk>/read/"""

    permission_classes = [permissions.IsAuthenticated, IsNotificationOwner]

    @extend_schema(request=None, responses=NotificationSerializer)
    def patch(self, request, pk):
        notification = get_object_or_404(Notification, pk=pk)
        self.check_object_permissions(request, notification)
        notification = NotificationService.mark_as_read(notification=notification)
        return Response(NotificationSerializer(notification).data)


class MarkAllNotificationsReadView(APIView):
    """POST /api/v1/notifications/mark-all-read/"""

    permission_classes = [permissions.IsAuthenticated]

    @extend_schema(request=None, responses={200: OpenApiResponse(description="All notifications marked read.")})
    def post(self, request):
        count = NotificationService.mark_all_as_read(user=request.user)
        return Response({"success": True, "message": f"{count} notification(s) marked as read."}, status=status.HTTP_200_OK)

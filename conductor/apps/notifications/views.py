"""Notification views."""

from django.utils import timezone
from rest_framework import generics
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema, OpenApiResponse

from .models import Notification, DeviceToken
from .serializers import (
    NotificationSerializer,
    MarkReadSerializer,
    RegisterDeviceSerializer,
)


class NotificationListView(generics.ListAPIView):
    """Get user's notifications."""

    permission_classes = [IsAuthenticated]
    serializer_class = NotificationSerializer

    def get_queryset(self):
        if getattr(self, "request", None) and self.request.user.is_authenticated:
            return Notification.objects.filter(user=self.request.user)
        return Notification.objects.none()

    @extend_schema(responses={200: NotificationSerializer(many=True)})
    def list(self, request, *args, **kwargs):
        qs = self.get_queryset()
        unread_count = qs.filter(is_read=False).count()
        serializer = self.get_serializer(qs[:50], many=True)
        return Response(
            {
                "status": "success",
                "data": {
                    "notifications": serializer.data,
                    "unread_count": unread_count,
                },
            }
        )


@extend_schema(
    responses={200: OpenApiResponse(description="Notifications marked as read")}
)
class MarkReadView(generics.GenericAPIView):
    """Mark notifications as read."""

    permission_classes = [IsAuthenticated]
    serializer_class = MarkReadSerializer

    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        notification_ids = serializer.validated_data.get("ids", [])

        if notification_ids:
            Notification.objects.filter(
                user=request.user, id__in=notification_ids, is_read=False
            ).update(is_read=True, read_at=timezone.now())
        else:
            Notification.objects.filter(user=request.user, is_read=False).update(
                is_read=True, read_at=timezone.now()
            )
        return Response(
            {"status": "success", "message": "Notifications marked as read"}
        )


@extend_schema(
    responses={200: OpenApiResponse(description="Device registered successfully")}
)
class RegisterDeviceView(generics.GenericAPIView):
    """Register FCM device token."""

    permission_classes = [IsAuthenticated]
    serializer_class = RegisterDeviceSerializer

    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        token = serializer.validated_data["token"]
        platform = serializer.validated_data["platform"]

        DeviceToken.objects.update_or_create(
            user=request.user,
            token=token,
            defaults={"platform": platform, "is_active": True},
        )
        return Response({"status": "success", "message": "Device registered"})

"""Notification views — Enhanced with delete, pagination, and filtering."""

from django.utils import timezone
from rest_framework import generics, status
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django_filters import rest_framework as filters
from drf_spectacular.utils import extend_schema, OpenApiParameter, OpenApiResponse

from .models import Notification, DeviceToken
from .serializers import (
    NotificationSerializer,
    MarkReadSerializer,
    RegisterDeviceSerializer,
    DeleteNotificationsSerializer,
)


class NotificationPagination(PageNumberPagination):
    """Standard pagination for notifications."""
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100


class NotificationFilter(filters.FilterSet):
    """Filter notifications by type and read status."""
    type = filters.ChoiceFilter(choices=Notification.Type.choices)
    is_read = filters.BooleanFilter()

    class Meta:
        model = Notification
        fields = ['type', 'is_read']


@extend_schema(tags=["Notifications"])
class NotificationListView(generics.ListAPIView):
    """Get user's notifications with pagination and filtering."""

    permission_classes = [IsAuthenticated]
    serializer_class = NotificationSerializer
    pagination_class = NotificationPagination
    filterset_class = NotificationFilter

    def get_queryset(self):
        if getattr(self, "request", None) and self.request.user.is_authenticated:
            return Notification.objects.filter(user=self.request.user)
        return Notification.objects.none()

    @extend_schema(
        parameters=[
            OpenApiParameter(name='type', description='Filter by notification type', required=False),
            OpenApiParameter(name='is_read', description='Filter by read status', required=False),
            OpenApiParameter(name='page', description='Page number', required=False),
            OpenApiParameter(name='page_size', description='Items per page (max 100)', required=False),
        ],
        responses={200: NotificationSerializer(many=True)},
    )
    def list(self, request, *args, **kwargs):
        qs = self.filter_queryset(self.get_queryset())
        unread_count = qs.filter(is_read=False).count()

        page = self.paginate_queryset(qs)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            response = self.get_paginated_response(serializer.data)
            response.data['unread_count'] = unread_count
            return response

        serializer = self.get_serializer(qs, many=True)
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
    tags=["Notifications"],
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
            updated = Notification.objects.filter(
                user=request.user, id__in=notification_ids, is_read=False
            ).update(is_read=True, read_at=timezone.now())
        else:
            updated = Notification.objects.filter(user=request.user, is_read=False).update(
                is_read=True, read_at=timezone.now()
            )
        return Response(
            {"status": "success", "message": f"{updated} notifications marked as read"}
        )


@extend_schema(
    tags=["Notifications"],
    responses={200: OpenApiResponse(description="Notifications deleted")}
)
class DeleteNotificationsView(generics.GenericAPIView):
    """Delete notifications — single or batch.

    POST /api/v1/notifications/delete/
    Body: { "ids": [1, 2, 3] }  — delete specific
    Body: { "ids": [] } or {} — delete all read notifications
    """

    permission_classes = [IsAuthenticated]
    serializer_class = DeleteNotificationsSerializer

    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        notification_ids = serializer.validated_data.get("ids", [])

        if notification_ids:
            deleted, _ = Notification.objects.filter(
                user=request.user, id__in=notification_ids
            ).delete()
        else:
            # Delete all read notifications
            deleted, _ = Notification.objects.filter(
                user=request.user, is_read=True
            ).delete()

        return Response(
            {"status": "success", "message": f"{deleted} notifications deleted"}
        )


@extend_schema(
    tags=["Notifications"],
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

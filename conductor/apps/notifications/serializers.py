"""Notification serializers — Enhanced."""

from rest_framework import serializers
from .models import Notification


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = ["id", "type", "title", "message", "data", "is_read", "read_at", "created_at"]


class MarkReadSerializer(serializers.Serializer):
    ids = serializers.ListField(
        child=serializers.IntegerField(), required=False, allow_empty=True
    )


class DeleteNotificationsSerializer(serializers.Serializer):
    """Serializer for batch delete — accepts list of notification IDs."""
    ids = serializers.ListField(
        child=serializers.IntegerField(),
        required=False,
        allow_empty=True,
        help_text="List of notification IDs to delete. Empty = delete all read."
    )


class RegisterDeviceSerializer(serializers.Serializer):
    token = serializers.CharField(required=True, max_length=4096)
    platform = serializers.ChoiceField(
        choices=["android", "ios", "web"], default="android"
    )

"""Notification serializers."""

from rest_framework import serializers
from .models import Notification


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = ["id", "type", "title", "message", "data", "is_read", "created_at"]


class MarkReadSerializer(serializers.Serializer):
    ids = serializers.ListField(
        child=serializers.IntegerField(), required=False, allow_empty=True
    )


class RegisterDeviceSerializer(serializers.Serializer):
    token = serializers.CharField(required=True)
    platform = serializers.ChoiceField(
        choices=["android", "ios", "web"], default="android"
    )

"""
Notification serializers and service helpers for the Django backend.
"""
from rest_framework import serializers
from .models import Notification, Discussion, Comment, LiveSession, Mentor


class CommentSerializer(serializers.ModelSerializer):
    author = serializers.SerializerMethodField()

    class Meta:
        model = Comment
        fields = ['id', 'discussion', 'user', 'author', 'content', 'created_at']
        read_only_fields = ['id', 'created_at']

    def get_author(self, obj):
        if obj.user:
            return getattr(obj.user, 'username', '') or getattr(obj.user, 'email', '')
        return 'Anonymous'


class DiscussionListSerializer(serializers.ModelSerializer):
    author = serializers.SerializerMethodField()
    comments_count = serializers.SerializerMethodField()

    class Meta:
        model = Discussion
        fields = [
            'id', 'user', 'author', 'title', 'content', 'category', 'tags',
            'likes', 'upvotes', 'replies', 'views', 'is_pinned', 'comments_count',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_author(self, obj):
        if obj.user:
            return getattr(obj.user, 'username', '') or getattr(obj.user, 'email', '')
        return 'Anonymous'

    def get_comments_count(self, obj):
        return obj.comments.count() if hasattr(obj, 'comments') else 0


class DiscussionDetailSerializer(serializers.ModelSerializer):
    author = serializers.SerializerMethodField()
    comments = CommentSerializer(many=True, read_only=True)

    class Meta:
        model = Discussion
        fields = [
            'id', 'user', 'author', 'title', 'content', 'category', 'tags',
            'likes', 'upvotes', 'replies', 'views', 'is_pinned', 'comments',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_author(self, obj):
        if obj.user:
            return getattr(obj.user, 'username', '') or getattr(obj.user, 'email', '')
        return 'Anonymous'


class LiveSessionSerializer(serializers.ModelSerializer):
    class Meta:
        model = LiveSession
        fields = [
            'id', 'title', 'description', 'host_name',
            'start_time', 'end_time', 'status', 'max_participants', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class MentorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Mentor
        fields = [
            'id', 'name', 'expertise', 'bio', 'avatar',
            'rating', 'sessions_conducted', 'is_available', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class NotificationSerializer(serializers.ModelSerializer):
    """Serializes Notification model to JSON for API responses."""

    class Meta:
        model = Notification
        fields = [
            'id',
            'user',
            'type',
            'title',
            'message',
            'is_read',
            'action_url',
            'metadata',
            'created_at',
            'read_at',
        ]
        read_only_fields = ['id', 'created_at', 'read_at']


def create_notification(
    user,
    notification_type: str,
    title: str,
    message: str,
    action_url: str = None,
    metadata: dict = None,
) -> Notification:
    """
    Server-side helper to create a notification and (optionally) emit via WebSocket.

    SECURITY: This is a server-side function — never expose this via API
    for direct client invocation. Clients cannot create arbitrary notifications.
    """
    from .models import Notification
    n = Notification.objects.create(
        user=user,
        type=notification_type.upper(),
        title=title[:200],  # enforce max length
        message=message,
        action_url=action_url,
        metadata=metadata or {},
    )
    return n

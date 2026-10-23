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
            name = (obj.user.get_full_name() or obj.user.username or '').strip()
            return {
                'id': str(obj.user.id),
                'username': obj.user.username,
                'display_name': name or obj.user.username,
                'avatar_url': getattr(obj.user, 'avatar', '') or '',
            }
        return {
            'id': 'anon',
            'username': 'Anonymous',
            'display_name': 'Anonymous',
            'avatar_url': '',
        }


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
            name = (obj.user.get_full_name() or obj.user.username or '').strip()
            return {
                'id': str(obj.user.id),
                'username': obj.user.username,
                'display_name': name or obj.user.username,
                'avatar_url': getattr(obj.user, 'avatar', '') or '',
            }
        return {
            'id': 'anon',
            'username': 'Anonymous',
            'display_name': 'Anonymous',
            'avatar_url': '',
        }

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
            name = (obj.user.get_full_name() or obj.user.username or '').strip()
            return {
                'id': str(obj.user.id),
                'username': obj.user.username,
                'display_name': name or obj.user.username,
                'avatar_url': getattr(obj.user, 'avatar', '') or '',
            }
        return {
            'id': 'anon',
            'username': 'Anonymous',
            'display_name': 'Anonymous',
            'avatar_url': '',
        }


class LiveSessionSerializer(serializers.ModelSerializer):
    description = serializers.CharField(read_only=True)
    host_name = serializers.CharField(read_only=True)
    end_time = serializers.DateTimeField(read_only=True)
    max_participants = serializers.IntegerField(read_only=True)
    created_at = serializers.DateTimeField(read_only=True)

    class Meta:
        model = LiveSession
        fields = [
            'id', 'title', 'description', 'host_name',
            'start_time', 'end_time', 'status', 'max_participants', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class MentorSerializer(serializers.ModelSerializer):
    expertise = serializers.CharField(read_only=True)
    bio = serializers.CharField(read_only=True)
    sessions_conducted = serializers.IntegerField(read_only=True)
    is_available = serializers.BooleanField(read_only=True)
    created_at = serializers.DateTimeField(read_only=True)

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

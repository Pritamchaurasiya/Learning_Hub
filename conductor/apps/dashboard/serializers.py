
from rest_framework import serializers
from .models import LessonActivity, VideoInteraction

class LessonActivitySerializer(serializers.ModelSerializer):
    """Serializer for lesson session heartbeats."""
    class Meta:
        model = LessonActivity
        fields = ['lesson', 'session_id', 'duration_seconds']

class VideoInteractionSerializer(serializers.ModelSerializer):
    """Serializer for video player events."""
    class Meta:
        model = VideoInteraction
        fields = ['lesson', 'event_type', 'video_timestamp']

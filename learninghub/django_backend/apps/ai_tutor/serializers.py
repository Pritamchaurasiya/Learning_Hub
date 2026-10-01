from rest_framework import serializers
from .models import AIChatSession, AIChatMessage, SpacedRepetitionSchedule

class AIChatMessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = AIChatMessage
        fields = ['id', 'sender', 'content', 'created_at']

class AIChatSessionSerializer(serializers.ModelSerializer):
    messages = AIChatMessageSerializer(many=True, read_only=True)

    class Meta:
        model = AIChatSession
        fields = ['id', 'title', 'context_type', 'context_id', 'messages', 'created_at', 'updated_at']

class SpacedRepetitionScheduleSerializer(serializers.ModelSerializer):
    class Meta:
        model = SpacedRepetitionSchedule
        fields = ['topic', 'repetitions', 'interval_days', 'ease_factor', 'next_review_date', 'lapses', 'last_reviewed_at']

SpacedRepetitionSerializer = SpacedRepetitionScheduleSerializer

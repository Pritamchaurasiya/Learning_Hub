from rest_framework import serializers
from .models import AIChatSession, AIChatMessage, SpacedRepetitionSchedule, StudySchedule, StudyTask

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


class StudyTaskSerializer(serializers.ModelSerializer):
    course = serializers.SerializerMethodField()

    class Meta:
        model = StudyTask
        fields = [
            'id', 'title', 'description', 'course', 'course_id',
            'task_type', 'scheduled_date', 'scheduled_time',
            'duration_minutes', 'priority', 'status', 'completed_at',
            'notes', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_course(self, obj):
        if obj.course_id:
            return {'id': obj.course_id, 'title': obj.course_title or 'Course'}
        return None


class StudyScheduleSerializer(serializers.ModelSerializer):
    start_date = serializers.SerializerMethodField()
    end_date = serializers.SerializerMethodField()

    class Meta:
        model = StudySchedule
        fields = [
            'id', 'title', 'description', 'start_date', 'end_date',
            'daily_goal_minutes', 'preferred_study_times', 'is_active',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_start_date(self, obj):
        if hasattr(obj.start_date, 'date'):
            return str(obj.start_date.date())
        return str(obj.start_date) if obj.start_date else None

    def get_end_date(self, obj):
        if not obj.end_date:
            return None
        if hasattr(obj.end_date, 'date'):
            return str(obj.end_date.date())
        return str(obj.end_date)

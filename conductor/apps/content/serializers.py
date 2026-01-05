"""Content serializers."""

from rest_framework import serializers
from .models import Lesson, LessonProgress, Quiz, Question, QuizAttempt


class LessonSerializer(serializers.ModelSerializer):
    class Meta:
        model = Lesson
        fields = [
            "id",
            "title",
            "content_type",
            "video_url",
            "video_duration",
            "text_content",
            "pdf_file",
            "is_preview",
            "order",
        ]


class LessonProgressSerializer(serializers.ModelSerializer):
    class Meta:
        model = LessonProgress
        fields = ["id", "is_completed", "watch_time", "last_position", "completed_at"]


class QuestionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Question
        fields = ["id", "text", "question_type", "options", "points", "order"]
        # Note: correct_answer excluded to prevent cheating


class QuizSerializer(serializers.ModelSerializer):
    questions = QuestionSerializer(many=True, read_only=True)

    class Meta:
        model = Quiz
        fields = [
            "id",
            "title",
            "description",
            "passing_score",
            "time_limit",
            "questions",
        ]


class QuizAttemptSerializer(serializers.ModelSerializer):
    class Meta:
        model = QuizAttempt
        fields = ["id", "score", "total_points", "passed", "time_taken", "created_at"]


class LessonProgressUpdateSerializer(serializers.Serializer):
    is_completed = serializers.BooleanField(required=False)
    watch_time = serializers.IntegerField(required=False)
    last_position = serializers.IntegerField(required=False)


class QuizSubmissionSerializer(serializers.Serializer):
    answers = serializers.JSONField(required=True)
    time_taken = serializers.IntegerField(required=False, default=0)

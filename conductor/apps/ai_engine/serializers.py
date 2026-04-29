"""Serializers for AI Engine Quiz and Progress."""

from rest_framework import serializers
from .models import ResearchQuiz, QuizQuestion, QuizChoice, ModuleProgress


class QuizChoiceSerializer(serializers.ModelSerializer):
    """Serializer for quiz choices."""

    class Meta:
        model = QuizChoice
        fields = ["id", "text"]


class QuizQuestionSerializer(serializers.ModelSerializer):
    """Serializer for quiz questions with nested choices."""

    choices = QuizChoiceSerializer(many=True, read_only=True)

    class Meta:
        model = QuizQuestion
        fields = ["id", "text", "order", "choices"]


class ResearchQuizSerializer(serializers.ModelSerializer):
    """Serializer for research quizzes with nested questions."""

    questions = QuizQuestionSerializer(many=True, read_only=True)
    question_count = serializers.SerializerMethodField()

    class Meta:
        model = ResearchQuiz
        fields = [
            "id",
            "module_slug",
            "title",
            "xp_reward",
            "question_count",
            "questions",
        ]

    def get_question_count(self, obj: ResearchQuiz) -> int:
        return obj.questions.count()


class QuizSubmissionSerializer(serializers.Serializer):
    """Serializer for submitting quiz answers."""

    answers = serializers.DictField(
        child=serializers.UUIDField(),
        help_text="Dict with question_id as key and choice_id as value",
    )


class ModuleProgressSerializer(serializers.ModelSerializer):
    """Serializer for module progress."""

    class Meta:
        model = ModuleProgress
        fields = [
            "id",
            "module_slug",
            "is_completed",
            "quiz_passed",
            "completed_at",
            "created_at",
        ]
        read_only_fields = ["id", "completed_at", "created_at"]

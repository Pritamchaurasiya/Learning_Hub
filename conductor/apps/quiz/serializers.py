"""
Quiz serializers for Learning Hub API.
"""

from rest_framework import serializers
from .models import Quiz, Question, Option, QuizAttempt, QuizAnswer


class OptionSerializer(serializers.ModelSerializer):
    """Serializer for question options."""

    class Meta:
        model = Option
        fields = ["id", "text", "order"]


class OptionWithCorrectSerializer(serializers.ModelSerializer):
    """Serializer for question options including correct answer (for instructors)."""

    class Meta:
        model = Option
        fields = ["id", "text", "is_correct", "order"]


class QuestionSerializer(serializers.ModelSerializer):
    """Serializer for quiz questions (for quiz takers)."""

    options = OptionSerializer(many=True, read_only=True)

    class Meta:
        model = Question
        fields = ["id", "text", "question_type", "marks", "order", "options"]


class QuestionWithAnswerSerializer(serializers.ModelSerializer):
    """Serializer for quiz questions with correct answers (for instructors)."""

    options = OptionWithCorrectSerializer(many=True, read_only=True)

    class Meta:
        model = Question
        fields = ["id", "text", "question_type", "marks", "order", "options"]


class QuizListSerializer(serializers.ModelSerializer):
    """Serializer for quiz listings."""

    total_questions = serializers.ReadOnlyField()
    total_marks = serializers.ReadOnlyField()
    course_title = serializers.CharField(source="course.title", read_only=True)

    class Meta:
        model = Quiz
        fields = [
            "id",
            "title",
            "description",
            "time_limit_minutes",
            "passing_score",
            "max_attempts",
            "is_published",
            "total_questions",
            "total_marks",
            "course_title",
            "created_at",
            "updated_at",
        ]


class QuizDetailSerializer(serializers.ModelSerializer):
    """Serializer for quiz detail view (for quiz takers)."""

    questions = QuestionSerializer(many=True, read_only=True)
    total_questions = serializers.ReadOnlyField()
    total_marks = serializers.ReadOnlyField()
    course_title = serializers.CharField(source="course.title", read_only=True)

    class Meta:
        model = Quiz
        fields = [
            "id",
            "title",
            "description",
            "time_limit_minutes",
            "passing_score",
            "max_attempts",
            "is_published",
            "total_questions",
            "total_marks",
            "course_title",
            "questions",
            "created_at",
        ]


class QuizDetailWithAnswersSerializer(serializers.ModelSerializer):
    """Serializer for quiz detail with answers (for instructors/admins)."""

    questions = QuestionWithAnswerSerializer(many=True, read_only=True)
    total_questions = serializers.ReadOnlyField()
    total_marks = serializers.ReadOnlyField()
    course_title = serializers.CharField(source="course.title", read_only=True)

    class Meta:
        model = Quiz
        fields = [
            "id",
            "title",
            "description",
            "time_limit_minutes",
            "passing_score",
            "max_attempts",
            "is_published",
            "total_questions",
            "total_marks",
            "course_title",
            "questions",
            "created_at",
            "updated_at",
        ]


class QuizAnswerSerializer(serializers.ModelSerializer):
    """Serializer for quiz answers."""

    question_text = serializers.CharField(source="question.text", read_only=True)

    class Meta:
        model = QuizAnswer
        fields = [
            "id",
            "question",
            "question_text",
            "selected_option",
            "text_answer",
            "is_correct",
            "marks_obtained",
        ]


class QuizAttemptSerializer(serializers.ModelSerializer):
    """Serializer for quiz attempts."""

    quiz_title = serializers.CharField(source="quiz.title", read_only=True)
    course_title = serializers.CharField(source="quiz.course.title", read_only=True)
    is_passed = serializers.ReadOnlyField()

    class Meta:
        model = QuizAttempt
        fields = [
            "id",
            "quiz",
            "quiz_title",
            "course_title",
            "status",
            "score",
            "max_score",
            "percentage_score",
            "started_at",
            "completed_at",
            "time_taken_seconds",
            "attempt_number",
            "is_passed",
        ]


class QuizAttemptDetailSerializer(serializers.ModelSerializer):
    """Serializer for quiz attempt with answers."""

    quiz_title = serializers.CharField(source="quiz.title", read_only=True)
    course_title = serializers.CharField(source="quiz.course.title", read_only=True)
    is_passed = serializers.ReadOnlyField()
    answers = QuizAnswerSerializer(many=True, read_only=True)

    class Meta:
        model = QuizAttempt
        fields = [
            "id",
            "quiz",
            "quiz_title",
            "course_title",
            "status",
            "score",
            "max_score",
            "percentage_score",
            "started_at",
            "completed_at",
            "time_taken_seconds",
            "attempt_number",
            "is_passed",
            "answers",
        ]


class StartQuizAttemptSerializer(serializers.Serializer):
    """Serializer for starting a quiz attempt."""

    quiz_id = serializers.UUIDField(required=True)


class SubmitAnswerSerializer(serializers.Serializer):
    """Serializer for submitting an answer."""

    question_id = serializers.UUIDField(required=True)
    option_id = serializers.UUIDField(required=False, allow_null=True)
    text_answer = serializers.CharField(required=False, allow_blank=True)


class SubmitQuizSerializer(serializers.Serializer):
    """Serializer for submitting a quiz."""

    attempt_id = serializers.UUIDField(required=True)
    answers = SubmitAnswerSerializer(many=True, required=True)


class QuizResultSerializer(serializers.Serializer):
    """Serializer for quiz results."""

    attempt_id = serializers.UUIDField()
    quiz_title = serializers.CharField()
    score = serializers.IntegerField()
    max_score = serializers.IntegerField()
    percentage_score = serializers.FloatField()
    is_passed = serializers.BooleanField()
    time_taken_seconds = serializers.IntegerField()
    total_questions = serializers.IntegerField()
    correct_answers = serializers.IntegerField()
    incorrect_answers = serializers.IntegerField()

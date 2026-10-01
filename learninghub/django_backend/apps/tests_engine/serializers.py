from rest_framework import serializers
from .models import (
    Test, Question, Option, TestAttempt, AttemptAnswer, TopicPerformance, QuestionBookmark, TestSection
)

class TestSectionSerializer(serializers.ModelSerializer):
    class Meta:
        model = TestSection
        fields = ['id', 'title', 'description', 'order', 'duration_minutes', 'is_timed', 'cut_off_marks']

class OptionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Option
        fields = ['id', 'text', 'order']

class OptionWithAnswerSerializer(serializers.ModelSerializer):
    class Meta:
        model = Option
        fields = ['id', 'text', 'is_correct', 'order']

class QuestionSerializer(serializers.ModelSerializer):
    options = OptionSerializer(many=True, read_only=True)

    class Meta:
        model = Question
        fields = ['id', 'prompt', 'question_type', 'topic', 'marks', 'negative_marks', 'order', 'section_id', 'options']

class QuestionReviewSerializer(serializers.ModelSerializer):
    options = OptionWithAnswerSerializer(many=True, read_only=True)

    class Meta:
        model = Question
        fields = ['id', 'prompt', 'question_type', 'topic', 'marks', 'negative_marks', 'explanation', 'order', 'section_id', 'options']

class TestListSerializer(serializers.ModelSerializer):
    question_count = serializers.IntegerField(source='questions.count', read_only=True)

    class Meta:
        model = Test
        fields = [
            'id', 'title', 'slug', 'description', 'category',
            'duration_minutes', 'total_marks', 'passing_marks',
            'negative_marking', 'is_adaptive', 'shuffle_questions',
            'shuffle_options', 'question_count'
        ]

class TestDetailSerializer(TestListSerializer):
    questions = QuestionSerializer(many=True, read_only=True)
    sections = TestSectionSerializer(many=True, read_only=True)

    class Meta(TestListSerializer.Meta):
        fields = TestListSerializer.Meta.fields + ['questions', 'sections']

class TestAttemptSerializer(serializers.ModelSerializer):
    test_title = serializers.CharField(source='test.title', read_only=True)
    category = serializers.CharField(source='test.category', read_only=True)

    class Meta:
        model = TestAttempt
        fields = [
            'id', 'test_id', 'test_title', 'category', 'attempt_number',
            'status', 'started_at', 'submitted_at', 'score', 'percentage',
            'accuracy', 'passed', 'predicted_rank', 'irt_ability_theta',
            'time_spent_seconds'
        ]

class TopicPerformanceSerializer(serializers.ModelSerializer):
    class Meta:
        model = TopicPerformance
        fields = ['topic', 'correct_count', 'total_count', 'accuracy', 'ability_theta', 'last_updated']

class QuestionBookmarkSerializer(serializers.ModelSerializer):
    question = QuestionReviewSerializer(read_only=True)

    class Meta:
        model = QuestionBookmark
        fields = ['id', 'question', 'notes', 'created_at']

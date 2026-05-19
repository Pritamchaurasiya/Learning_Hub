"""Analytics v2 serializers."""
from rest_framework import serializers
from .models import TopicPerformance, ExamPerformance, PerformanceTrend, AIRecommendation


class TopicPerformanceSerializer(serializers.ModelSerializer):
    topic_name = serializers.CharField(source='topic.name', read_only=True)
    subject_name = serializers.CharField(source='topic.subject.name', read_only=True)
    exam_name = serializers.CharField(source='topic.subject.exam.name', read_only=True)
    exam_code = serializers.CharField(source='topic.subject.exam.code', read_only=True)
    full_path = serializers.CharField(source='topic.full_path', read_only=True)

    class Meta:
        model = TopicPerformance
        fields = [
            'id', 'topic_name', 'subject_name', 'exam_name', 'exam_code', 'full_path',
            'total_attempts', 'correct_attempts', 'incorrect_attempts', 'accuracy',
            'avg_time_seconds', 'fastest_time_seconds', 'trend', 'mastery_level',
            'last_attempted',
        ]


class ExamPerformanceSerializer(serializers.ModelSerializer):
    exam_name = serializers.CharField(source='exam.name', read_only=True)
    exam_code = serializers.CharField(source='exam.code', read_only=True)
    country_name = serializers.CharField(source='exam.country.name', read_only=True)

    class Meta:
        model = ExamPerformance
        fields = [
            'id', 'exam_name', 'exam_code', 'country_name',
            'total_tests_taken', 'total_questions_answered', 'total_correct',
            'avg_percentage', 'best_percentage', 'worst_percentage', 'latest_percentage',
            'percentile_rank', 'weak_topics', 'strong_topics',
            'avg_time_per_question', 'first_test_date', 'last_test_date',
        ]


class PerformanceTrendSerializer(serializers.ModelSerializer):
    class Meta:
        model = PerformanceTrend
        fields = [
            'date', 'period', 'tests_taken', 'avg_percentage',
            'total_questions', 'total_correct', 'total_time_minutes', 'streak_days',
        ]


class AIRecommendationSerializer(serializers.ModelSerializer):
    class Meta:
        model = AIRecommendation
        fields = [
            'id', 'recommendation_type', 'title', 'description',
            'target_topic_id', 'target_test_id', 'target_exam_id',
            'priority', 'is_actioned', 'is_dismissed',
            'reasoning', 'confidence', 'created_at', 'expires_at',
        ]


class DashboardSerializer(serializers.Serializer):
    """Overall performance dashboard."""
    total_tests_taken = serializers.IntegerField()
    total_questions_answered = serializers.IntegerField()
    overall_accuracy = serializers.FloatField()
    avg_percentage = serializers.FloatField()
    best_score = serializers.FloatField()
    current_streak = serializers.IntegerField()
    longest_streak = serializers.IntegerField()
    total_study_time_minutes = serializers.IntegerField()
    exams_attempted = serializers.IntegerField()
    topics_mastered = serializers.IntegerField()
    topics_needing_work = serializers.IntegerField()
    recent_performance = PerformanceTrendSerializer(many=True)
    weak_areas = TopicPerformanceSerializer(many=True)
    strong_areas = TopicPerformanceSerializer(many=True)
    recommendations = AIRecommendationSerializer(many=True)

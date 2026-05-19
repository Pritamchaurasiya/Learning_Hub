"""
Analytics v2 models: Topic performance, exam performance, trends, recommendations.
"""
import uuid
from django.db import models
from django.conf import settings
from apps.exams.models import Exam, Topic


class TopicPerformance(models.Model):
    """
    Per-user, per-topic performance tracking.
    Updated after each test attempt.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='topic_performances')
    topic = models.ForeignKey(Topic, on_delete=models.CASCADE, related_name='user_performances')

    # Statistics
    total_attempts = models.IntegerField(default=0)
    correct_attempts = models.IntegerField(default=0)
    incorrect_attempts = models.IntegerField(default=0)
    unanswered_attempts = models.IntegerField(default=0)
    accuracy = models.FloatField(default=0, help_text="Correct / Total (0-100)")

    # Timing
    total_time_seconds = models.IntegerField(default=0)
    avg_time_seconds = models.FloatField(default=0)
    fastest_time_seconds = models.IntegerField(default=0)
    slowest_time_seconds = models.IntegerField(default=0)

    # Trend analysis
    last_5_accuracy = models.FloatField(default=0, help_text="Accuracy of last 5 attempts")
    trend = models.CharField(max_length=15, default='stable', choices=[
        ('improving', 'Improving'),
        ('stable', 'Stable'),
        ('declining', 'Declining'),
        ('new', 'No data yet'),
    ])

    # Mastery
    mastery_level = models.FloatField(default=0, help_text="Mastery score (0-100)")

    # Timestamps
    last_attempted = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'topic_performance'
        unique_together = ['user', 'topic']
        indexes = [
            models.Index(fields=['user', 'accuracy']),
            models.Index(fields=['user', 'mastery_level']),
            models.Index(fields=['user', 'trend']),
            models.Index(fields=['topic', 'accuracy']),
        ]

    def __str__(self):
        return f"{self.user.email} - {self.topic.name}: {self.accuracy}%"

    def update_from_attempt(self, is_correct, time_spent):
        """Update statistics from a single attempt answer."""
        self.total_attempts += 1
        self.total_time_seconds += time_spent

        if is_correct is True:
            self.correct_attempts += 1
        elif is_correct is False:
            self.incorrect_attempts += 1
        else:
            self.unanswered_attempts += 1

        # Update accuracy
        answered = self.correct_attempts + self.incorrect_attempts
        self.accuracy = (self.correct_attempts / answered * 100) if answered > 0 else 0

        # Update timing
        self.avg_time_seconds = self.total_time_seconds / self.total_attempts
        if self.fastest_time_seconds == 0 or time_spent < self.fastest_time_seconds:
            self.fastest_time_seconds = time_spent
        if time_spent > self.slowest_time_seconds:
            self.slowest_time_seconds = time_spent

        # Update mastery (simplified: weighted accuracy + recency)
        self.mastery_level = min(100, self.accuracy * 0.8 + min(20, self.total_attempts * 2))

        from django.utils import timezone
        self.last_attempted = timezone.now()
        self.save()


class ExamPerformance(models.Model):
    """
    Per-user, per-exam performance summary.
    Aggregated from all test attempts for an exam.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='exam_performances')
    exam = models.ForeignKey(Exam, on_delete=models.CASCADE, related_name='user_performances')

    # Statistics
    total_tests_taken = models.IntegerField(default=0)
    total_questions_answered = models.IntegerField(default=0)
    total_correct = models.IntegerField(default=0)

    # Scoring
    avg_percentage = models.FloatField(default=0)
    best_percentage = models.FloatField(default=0)
    worst_percentage = models.FloatField(default=100)
    latest_percentage = models.FloatField(default=0)

    # Ranking
    percentile_rank = models.FloatField(null=True, blank=True, help_text="Percentile vs other users (0-100)")

    # Topic analysis
    weak_topics = models.JSONField(default=list, help_text="Topic IDs with accuracy < 40%")
    strong_topics = models.JSONField(default=list, help_text="Topic IDs with accuracy > 80%")

    # Timing
    avg_time_per_question = models.FloatField(default=0)

    # Timestamps
    first_test_date = models.DateTimeField(null=True, blank=True)
    last_test_date = models.DateTimeField(null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'exam_performance'
        unique_together = ['user', 'exam']
        indexes = [
            models.Index(fields=['user', 'avg_percentage']),
            models.Index(fields=['exam', 'avg_percentage']),
        ]

    def __str__(self):
        return f"{self.user.email} - {self.exam.code}: {self.avg_percentage}%"


class PerformanceTrend(models.Model):
    """
    Daily/weekly performance trend snapshots for charting.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='performance_trends')
    exam = models.ForeignKey(Exam, on_delete=models.CASCADE, null=True, blank=True)

    date = models.DateField(db_index=True)
    period = models.CharField(max_length=10, choices=[
        ('daily', 'Daily'),
        ('weekly', 'Weekly'),
        ('monthly', 'Monthly'),
    ], default='daily')

    # Metrics
    tests_taken = models.IntegerField(default=0)
    avg_percentage = models.FloatField(default=0)
    total_questions = models.IntegerField(default=0)
    total_correct = models.IntegerField(default=0)
    total_time_minutes = models.IntegerField(default=0)
    streak_days = models.IntegerField(default=0)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'performance_trends'
        unique_together = ['user', 'exam', 'date', 'period']
        ordering = ['-date']
        indexes = [
            models.Index(fields=['user', 'date']),
            models.Index(fields=['user', 'exam', 'date']),
        ]

    def __str__(self):
        return f"{self.user.email} - {self.date} ({self.period})"


class AIRecommendation(models.Model):
    """
    AI-generated personalized recommendations for users.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='ai_recommendations')
    exam = models.ForeignKey(Exam, on_delete=models.CASCADE, null=True, blank=True)

    recommendation_type = models.CharField(max_length=30, choices=[
        ('practice_topic', 'Practice specific topic'),
        ('retake_test', 'Retake a test'),
        ('study_resource', 'Study resource suggestion'),
        ('difficulty_adjust', 'Adjust difficulty level'),
        ('focus_area', 'Focus on weak area'),
        ('milestone', 'Milestone achievement'),
        ('motivation', 'Motivational message'),
    ])

    title = models.CharField(max_length=200)
    description = models.TextField()

    # Target data
    target_topic_id = models.UUIDField(null=True, blank=True)
    target_test_id = models.UUIDField(null=True, blank=True)
    target_exam_id = models.UUIDField(null=True, blank=True)

    # Priority
    priority = models.CharField(max_length=10, choices=[
        ('high', 'High'),
        ('medium', 'Medium'),
        ('low', 'Low'),
    ], default='medium')

    # Status
    is_actioned = models.BooleanField(default=False)
    actioned_at = models.DateTimeField(null=True, blank=True)
    is_dismissed = models.BooleanField(default=False)

    # Metadata
    reasoning = models.TextField(blank=True, help_text="AI reasoning for this recommendation")
    confidence = models.FloatField(default=0.5, help_text="AI confidence (0-1)")

    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'ai_recommendations'
        ordering = ['-priority', '-created_at']
        indexes = [
            models.Index(fields=['user', 'is_actioned', 'is_dismissed']),
            models.Index(fields=['priority']),
        ]

    def __str__(self):
        return f"{self.user.email} - {self.title}"

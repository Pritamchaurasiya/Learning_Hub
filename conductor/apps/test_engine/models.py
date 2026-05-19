"""
Test engine models: Question bank, tests, attempts, answers.
Supports AI-generated tests, multiple modes, autosave, and detailed analytics.
"""
import uuid
from django.db import models
from django.conf import settings
from django.utils import timezone
from apps.exams.models import Exam, Topic


class Question(models.Model):
    """
    Master question bank. Questions are exam/topic-specific and can be
    either manually created or AI-generated.
    """
    QUESTION_TYPES = [
        ('mcq', 'Multiple Choice (Single Correct)'),
        ('multiple_select', 'Multiple Choice (Multiple Correct)'),
        ('true_false', 'True/False'),
        ('numerical', 'Numerical Answer'),
        ('fill_blank', 'Fill in the Blank'),
    ]

    BLOOM_LEVELS = [
        ('remember', 'Remember'),
        ('understand', 'Understand'),
        ('apply', 'Apply'),
        ('analyze', 'Analyze'),
        ('evaluate', 'Evaluate'),
        ('create', 'Create'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    topic = models.ForeignKey(Topic, on_delete=models.CASCADE, related_name='questions')
    text = models.TextField()
    question_type = models.CharField(max_length=20, choices=QUESTION_TYPES, default='mcq')

    # IRT parameters for adaptive testing
    difficulty = models.FloatField(default=0.5, help_text="IRT difficulty parameter (0-5)")
    discrimination = models.FloatField(default=1.0, help_text="IRT discrimination parameter")
    guess_factor = models.FloatField(default=0.25, help_text="IRT guessing parameter")

    # Bloom's taxonomy level
    bloom_level = models.CharField(max_length=15, choices=BLOOM_LEVELS, default='understand')

    # Content
    explanation = models.TextField(help_text="Detailed explanation of the correct answer")
    solution_steps = models.JSONField(default=list, blank=True, help_text="Step-by-step solution")

    # Tags for search and filtering
    tags = models.JSONField(default=list, blank=True, help_text="List of topic tags")

    # AI generation metadata
    is_ai_generated = models.BooleanField(default=False)
    ai_model = models.CharField(max_length=50, blank=True, null=True)
    ai_prompt_version = models.CharField(max_length=20, blank=True, null=True)
    ai_generation_id = models.CharField(max_length=100, blank=True, null=True, db_index=True)

    # Usage statistics
    usage_count = models.IntegerField(default=0)
    correct_count = models.IntegerField(default=0)
    incorrect_count = models.IntegerField(default=0)
    avg_time_seconds = models.FloatField(default=0, help_text="Average time users take to answer")

    # Quality control
    is_verified = models.BooleanField(default=False, help_text="Manually verified by instructor")
    verified_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='verified_questions')
    reported_count = models.IntegerField(default=0)

    # Creator
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='created_questions')

    # Soft delete
    is_deleted = models.BooleanField(default=False, db_index=True)
    deleted_at = models.DateTimeField(null=True, blank=True)

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'question_bank'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['topic', 'is_deleted']),
            models.Index(fields=['question_type', 'is_deleted']),
            models.Index(fields=['difficulty', 'is_deleted']),
            models.Index(fields=['bloom_level', 'is_deleted']),
            models.Index(fields=['is_ai_generated', 'is_deleted']),
            models.Index(fields=['is_verified', 'is_deleted']),
            models.Index(fields=['ai_generation_id']),
        ]

    def __str__(self):
        return f"{self.text[:60]}... ({self.question_type})"

    @property
    def accuracy_rate(self):
        total = self.correct_count + self.incorrect_count
        return self.correct_count / total if total > 0 else None

    @property
    def exam(self):
        return self.topic.subject.exam

    @property
    def subject(self):
        return self.topic.subject


class Option(models.Model):
    """Options for multiple choice questions."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    question = models.ForeignKey(Question, on_delete=models.CASCADE, related_name='options')
    text = models.TextField()
    is_correct = models.BooleanField(default=False)
    explanation = models.TextField(blank=True, help_text="Why this option is correct/incorrect")
    order = models.IntegerField(default=0)

    class Meta:
        db_table = 'question_options'
        ordering = ['order']
        indexes = [
            models.Index(fields=['question', 'is_correct']),
        ]

    def __str__(self):
        return f"Option {self.order}: {self.text[:40]}..."


class Test(models.Model):
    """
    A test/exam paper. Can be manually created or AI-generated.
    Contains a set of questions with ordering and marks.
    """
    MODES = [
        ('practice', 'Practice Mode (untimed, instant feedback)'),
        ('mock', 'Mock Test (timed, no feedback until submit)'),
        ('timed_challenge', 'Timed Challenge (strict timer, leaderboard)'),
        ('adaptive', 'Adaptive Test (difficulty adjusts in real-time)'),
        ('review', 'Review Mode (see answers and explanations)'),
    ]

    DIFFICULTIES = [
        ('easy', 'Easy'),
        ('medium', 'Medium'),
        ('hard', 'Hard'),
        ('mixed', 'Mixed (auto-distributed)'),
        ('adaptive', 'Adaptive'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    exam = models.ForeignKey(Exam, on_delete=models.CASCADE, related_name='tests')
    title = models.CharField(max_length=300)
    description = models.TextField(blank=True)

    # Configuration
    mode = models.CharField(max_length=20, choices=MODES, default='mock')
    difficulty = models.CharField(max_length=15, choices=DIFFICULTIES, default='mixed')
    time_limit_minutes = models.IntegerField(default=60)
    passing_score = models.FloatField(default=50.0, help_text="Minimum percentage to pass")
    total_marks = models.FloatField(default=0)
    negative_marks_per_question = models.FloatField(default=0)
    marks_per_correct = models.FloatField(default=1)

    # AI generation metadata
    is_ai_generated = models.BooleanField(default=False)
    generation_config = models.JSONField(default=dict, blank=True, help_text="AI generation parameters used")
    ai_generation_id = models.CharField(max_length=100, blank=True, null=True, db_index=True)

    # Caching
    cache_key = models.CharField(max_length=255, unique=True, null=True, blank=True)
    cache_ttl = models.IntegerField(default=86400, help_text="Cache TTL in seconds (default 24h)")

    # Status
    is_published = models.BooleanField(default=False, db_index=True)
    is_featured = models.BooleanField(default=False)
    attempt_count = models.IntegerField(default=0)

    # Creator
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True, related_name='created_tests')

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    published_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'tests'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['exam', 'is_published']),
            models.Index(fields=['mode', 'is_published']),
            models.Index(fields=['difficulty', 'is_published']),
            models.Index(fields=['is_featured', 'is_published']),
            models.Index(fields=['is_ai_generated', 'is_published']),
        ]

    def __str__(self):
        return self.title

    def save(self, *args, **kwargs):
        if self.is_published and not self.published_at:
            self.published_at = timezone.now()
        super().save(*args, **kwargs)

    @property
    def question_count(self):
        return self.test_questions.count()

    @property
    def avg_difficulty(self):
        questions = self.test_questions.select_related('question').values_list('question__difficulty', flat=True)
        if not questions:
            return 0
        return sum(questions) / len(questions)


class TestQuestion(models.Model):
    """Maps questions to a test with ordering and marks assignment."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    test = models.ForeignKey(Test, on_delete=models.CASCADE, related_name='test_questions')
    question = models.ForeignKey(Question, on_delete=models.CASCADE)
    order = models.IntegerField()
    marks = models.FloatField(default=1)

    class Meta:
        db_table = 'test_questions'
        ordering = ['order']
        unique_together = ['test', 'question']
        indexes = [
            models.Index(fields=['test', 'order']),
        ]

    def __str__(self):
        return f"Test {self.test.title[:30]} - Q{self.order}"


class TestAttempt(models.Model):
    """
    A user's attempt at a test. Supports session management,
    autosave, resume, and timeout handling.
    """
    STATUSES = [
        ('not_started', 'Not Started'),
        ('in_progress', 'In Progress'),
        ('submitted', 'Submitted'),
        ('expired', 'Expired (time ran out)'),
        ('abandoned', 'Abandoned'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='test_attempts')
    test = models.ForeignKey(Test, on_delete=models.CASCADE, related_name='attempts')

    # Session management
    session_token = models.CharField(max_length=64, unique=True, db_index=True)
    status = models.CharField(max_length=20, choices=STATUSES, default='not_started')
    mode = models.CharField(max_length=20, choices=Test.MODES, default='mock')

    # Scoring
    score = models.FloatField(default=0)
    total_marks = models.FloatField(default=0)
    percentage = models.FloatField(default=0)
    passed = models.BooleanField(null=True, blank=True)

    # Timing
    started_at = models.DateTimeField(auto_now_add=True)
    submitted_at = models.DateTimeField(null=True, blank=True)
    time_taken_seconds = models.IntegerField(default=0)
    last_activity_at = models.DateTimeField(auto_now=True)

    # Attempt tracking
    attempt_number = models.IntegerField(default=1)

    # Device/IP tracking
    device_info = models.JSONField(default=dict, blank=True, null=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)

    # Autosave data (for resume capability)
    # Structure: {"question_uuid": {"selected_options": [...], "text_answer": "...", "timestamp": "..."}}
    autosave_data = models.JSONField(default=dict, blank=True)
    autosave_version = models.IntegerField(default=0)

    # Metadata
    metadata = models.JSONField(default=dict, blank=True)

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'test_attempts'
        ordering = ['-started_at']
        unique_together = ['user', 'test', 'attempt_number']
        indexes = [
            models.Index(fields=['user', 'status']),
            models.Index(fields=['test', 'status']),
            models.Index(fields=['status', 'started_at']),
            models.Index(fields=['user', 'test']),
            models.Index(fields=['session_token']),
        ]

    def __str__(self):
        return f"{self.user.email} - {self.test.title} (Attempt {self.attempt_number})"

    @property
    def time_remaining_seconds(self):
        if self.status != 'in_progress':
            return 0
        elapsed = (timezone.now() - self.started_at).total_seconds()
        remaining = (self.test.time_limit_minutes * 60) - elapsed
        return max(0, int(remaining))

    @property
    def is_timed_out(self):
        return self.time_remaining_seconds <= 0 and self.status == 'in_progress'

    @property
    def answered_count(self):
        return self.answers.filter(answered_at__isnull=False).count()

    @property
    def correct_count(self):
        return self.answers.filter(is_correct=True).count()

    @property
    def incorrect_count(self):
        return self.answers.filter(is_correct=False).count()

    @property
    def flagged_count(self):
        return self.answers.filter(is_flagged=True).count()


class AttemptAnswer(models.Model):
    """User's answer to a specific question in a test attempt."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    attempt = models.ForeignKey(TestAttempt, on_delete=models.CASCADE, related_name='answers')
    question = models.ForeignKey(Question, on_delete=models.CASCADE)

    # Answer data
    selected_options = models.ManyToManyField(Option, blank=True, related_name='attempt_answers')
    text_answer = models.TextField(blank=True, help_text="For numerical/fill-blank questions")

    # Grading
    is_correct = models.BooleanField(null=True, blank=True, help_text="Null = not yet graded")
    marks_obtained = models.FloatField(default=0)

    # Timing
    time_spent_seconds = models.IntegerField(default=0)
    first_answered_at = models.DateTimeField(null=True, blank=True)
    answered_at = models.DateTimeField(null=True, blank=True)

    # Flags
    is_flagged = models.BooleanField(default=False, help_text="Marked for review")
    is_bookmarked = models.BooleanField(default=False, help_text="Bookmarked by user")

    # Answer change tracking
    answer_changes = models.IntegerField(default=0)

    class Meta:
        db_table = 'attempt_answers'
        ordering = ['answered_at']
        unique_together = ['attempt', 'question']
        indexes = [
            models.Index(fields=['attempt', 'is_correct']),
            models.Index(fields=['attempt', 'is_flagged']),
            models.Index(fields=['attempt', 'is_bookmarked']),
            models.Index(fields=['question']),
        ]

    def __str__(self):
        return f"{self.attempt.user.email} - Q{self.question.text[:30]}..."

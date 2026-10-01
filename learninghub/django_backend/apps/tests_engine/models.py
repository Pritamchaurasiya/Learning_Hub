import uuid
from django.db import models
from django.conf import settings
from django.utils import timezone

def generate_test_id():
    return f"test-{uuid.uuid4().hex[:8]}"

def generate_question_id():
    return f"q-{uuid.uuid4().hex[:8]}"

def generate_option_id():
    return f"opt-{uuid.uuid4().hex[:8]}"

def generate_attempt_id():
    return f"att-{uuid.uuid4().hex[:10]}"

def generate_answer_id():
    return f"ans-{uuid.uuid4().hex[:8]}"

class Test(models.Model):
    id = models.CharField(primary_key=True, max_length=64, default=generate_test_id)
    title = models.CharField(max_length=255, db_index=True)
    slug = models.SlugField(max_length=255, unique=True)
    description = models.TextField(blank=True, default='')
    category = models.CharField(max_length=64, default='DSA', db_index=True)
    duration_minutes = models.IntegerField(default=60)
    total_marks = models.FloatField(default=100.0)
    passing_marks = models.FloatField(default=40.0)
    negative_marking = models.BooleanField(default=True)
    negative_mark_value = models.FloatField(default=1.0)
    is_adaptive = models.BooleanField(default=False)
    max_attempts = models.IntegerField(default=5)
    is_published = models.BooleanField(default=True)
    shuffle_questions = models.BooleanField(default=False)
    shuffle_options = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'lh_tests'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.title} ({self.category})"

def generate_section_id():
    return f"sec-{uuid.uuid4().hex[:8]}"

class TestSection(models.Model):
    id = models.CharField(primary_key=True, max_length=64, default=generate_section_id)
    test = models.ForeignKey(Test, on_delete=models.CASCADE, related_name='sections')
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, default='')
    order = models.IntegerField(default=1)
    duration_minutes = models.IntegerField(null=True, blank=True)
    is_timed = models.BooleanField(default=False)
    cut_off_marks = models.FloatField(null=True, blank=True)

    class Meta:
        db_table = 'lh_test_sections'
        ordering = ['order']

    def __str__(self):
        return f"{self.test.title} - {self.title}"

class Question(models.Model):
    TYPE_CHOICES = (
        ('MCQ', 'Single Choice MCQ'),
        ('MULTI_SELECT', 'Multiple Choice'),
        ('NUMERICAL', 'Numerical Value'),
        ('SUBJECTIVE', 'Subjective / Essay'),
    )

    id = models.CharField(primary_key=True, max_length=64, default=generate_question_id)
    test = models.ForeignKey(Test, on_delete=models.CASCADE, related_name='questions')
    section = models.ForeignKey(TestSection, on_delete=models.SET_NULL, null=True, blank=True, related_name='questions')
    prompt = models.TextField()
    question_type = models.CharField(max_length=32, choices=TYPE_CHOICES, default='MCQ')
    topic = models.CharField(max_length=100, default='General', db_index=True)
    difficulty = models.FloatField(default=0.0) # IRT b parameter (-3.0 to +3.0)
    discrimination = models.FloatField(default=1.0) # IRT a parameter
    marks = models.FloatField(default=4.0)
    negative_marks = models.FloatField(default=1.0)
    explanation = models.TextField(blank=True, default='')
    order = models.IntegerField(default=1)

    class Meta:
        db_table = 'lh_test_questions'
        ordering = ['order']

    def __str__(self):
        return f"Q: {self.prompt[:40]}... ({self.topic})"

class Option(models.Model):
    id = models.CharField(primary_key=True, max_length=64, default=generate_option_id)
    question = models.ForeignKey(Question, on_delete=models.CASCADE, related_name='options')
    text = models.TextField()
    is_correct = models.BooleanField(default=False)
    order = models.IntegerField(default=1)

    class Meta:
        db_table = 'lh_question_options'
        ordering = ['order']

    def __str__(self):
        return f"Opt: {self.text[:30]} ({'Correct' if self.is_correct else 'Wrong'})"

class TestAttempt(models.Model):
    STATUS_CHOICES = (
        ('IN_PROGRESS', 'In Progress'),
        ('SUBMITTED', 'Submitted'),
        ('EXPIRED', 'Expired'),
    )

    id = models.CharField(primary_key=True, max_length=64, default=generate_attempt_id)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='test_attempts')
    test = models.ForeignKey(Test, on_delete=models.CASCADE, related_name='attempts')
    attempt_number = models.IntegerField(default=1)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='IN_PROGRESS', db_index=True)
    started_at = models.DateTimeField(default=timezone.now)
    submitted_at = models.DateTimeField(null=True, blank=True)
    score = models.FloatField(null=True, blank=True)
    percentage = models.FloatField(null=True, blank=True)
    accuracy = models.FloatField(null=True, blank=True)
    passed = models.BooleanField(null=True, blank=True)
    predicted_rank = models.IntegerField(null=True, blank=True)
    irt_ability_theta = models.FloatField(default=0.0)
    time_spent_seconds = models.IntegerField(default=0)

    class Meta:
        db_table = 'lh_test_attempts'
        ordering = ['-started_at']
        unique_together = ('user', 'test', 'attempt_number')

    def __str__(self):
        return f"Attempt #{self.attempt_number} on {self.test.title} by {self.user.email}"

class AttemptAnswer(models.Model):
    id = models.CharField(primary_key=True, max_length=64, default=generate_answer_id)
    attempt = models.ForeignKey(TestAttempt, on_delete=models.CASCADE, related_name='answers')
    question = models.ForeignKey(Question, on_delete=models.CASCADE)
    selected_option = models.ForeignKey(Option, on_delete=models.SET_NULL, null=True, blank=True)
    selected_option_ids = models.JSONField(default=list, blank=True)
    text_answer = models.TextField(blank=True, default='')
    is_correct = models.BooleanField(default=False)
    marks_awarded = models.FloatField(default=0.0)
    time_spent_sec = models.IntegerField(default=0)

    class Meta:
        db_table = 'lh_attempt_answers'
        unique_together = ('attempt', 'question')

class TopicPerformance(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='topic_performances')
    topic = models.CharField(max_length=100, db_index=True)
    correct_count = models.IntegerField(default=0)
    total_count = models.IntegerField(default=0)
    accuracy = models.FloatField(default=0.0)
    ability_theta = models.FloatField(default=0.0)
    last_updated = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'lh_topic_performances'
        unique_together = ('user', 'topic')

    def __str__(self):
        return f"{self.user.email} - {self.topic} ({self.accuracy}%)"

class QuestionBookmark(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='question_bookmarks')
    question = models.ForeignKey(Question, on_delete=models.CASCADE, related_name='bookmarks')
    notes = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'lh_question_bookmarks'
        unique_together = ('user', 'question')

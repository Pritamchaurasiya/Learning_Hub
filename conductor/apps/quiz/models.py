"""
Quiz models for Learning Hub.
"""
import uuid
from django.db import models
from django.conf import settings
from django.utils.functional import cached_property
from apps.courses.models import Course


class Quiz(models.Model):
    """Quiz model for courses."""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='quizzes')
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    time_limit_minutes = models.PositiveIntegerField(default=30)
    passing_score = models.PositiveIntegerField(default=70)  # Percentage
    max_attempts = models.PositiveIntegerField(default=3)
    is_published = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'quizzes'
        ordering = ['-created_at']
        verbose_name_plural = 'quizzes'
    
    def __str__(self):
        return self.title
    
    @cached_property
    def total_questions(self):
        """Get total question count (cached per instance)."""
        return self.questions.count()
    
    @cached_property
    def total_marks(self):
        """Get total marks (cached per instance). Uses aggregation to avoid N+1."""
        from django.db.models import Sum
        result = self.questions.aggregate(total=Sum('marks'))
        return result['total'] or 0


class Question(models.Model):
    """Question model for quizzes."""
    
    QUESTION_TYPES = [
        ('mcq', 'Multiple Choice'),
        ('true_false', 'True/False'),
        ('short_answer', 'Short Answer'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    quiz = models.ForeignKey(Quiz, on_delete=models.CASCADE, related_name='questions')
    text = models.TextField()
    question_type = models.CharField(max_length=20, choices=QUESTION_TYPES, default='mcq')
    marks = models.PositiveIntegerField(default=1)
    order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'quiz_questions'
        ordering = ['order', 'created_at']
    
    def __str__(self):
        return f"{self.text[:50]}..."


class Option(models.Model):
    """Option model for multiple choice questions."""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    question = models.ForeignKey(Question, on_delete=models.CASCADE, related_name='options')
    text = models.CharField(max_length=255)
    is_correct = models.BooleanField(default=False)
    order = models.PositiveIntegerField(default=0)
    
    class Meta:
        db_table = 'quiz_options'
        ordering = ['order']
    
    def __str__(self):
        return self.text


class QuizAttempt(models.Model):
    """User quiz attempt model."""
    
    STATUS_CHOICES = [
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
        ('abandoned', 'Abandoned'),
    ]
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='quiz_attempts')
    quiz = models.ForeignKey(Quiz, on_delete=models.CASCADE, related_name='attempts')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='in_progress')
    score = models.PositiveIntegerField(default=0)
    max_score = models.PositiveIntegerField(default=0)
    percentage_score = models.FloatField(default=0)
    started_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    time_taken_seconds = models.PositiveIntegerField(default=0)
    attempt_number = models.PositiveIntegerField(default=1)
    
    class Meta:
        db_table = 'quiz_attempts'
        ordering = ['-started_at']
        unique_together = ['user', 'quiz', 'attempt_number']
    
    def __str__(self):
        return f"{self.user.username} - {self.quiz.title} (Attempt {self.attempt_number})"
    
    @cached_property
    def is_passed(self):
        """Check if quiz is passed (cached per instance)."""
        return self.percentage_score >= self.quiz.passing_score


class QuizAnswer(models.Model):
    """User answer to a quiz question."""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    attempt = models.ForeignKey(QuizAttempt, on_delete=models.CASCADE, related_name='answers')
    question = models.ForeignKey(Question, on_delete=models.CASCADE, related_name='answers')
    selected_option = models.ForeignKey(Option, on_delete=models.CASCADE, null=True, blank=True, related_name='answers')
    text_answer = models.TextField(blank=True)
    is_correct = models.BooleanField(default=False)
    marks_obtained = models.PositiveIntegerField(default=0)
    answered_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'quiz_answers'
        ordering = ['answered_at']
    
    def __str__(self):
        return f"{self.attempt.user.username} - {self.question.text[:30]}..."

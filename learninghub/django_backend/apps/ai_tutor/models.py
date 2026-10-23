import uuid
from django.db import models
from django.conf import settings
from django.utils import timezone

def generate_ai_session_id():
    return f"aisess-{uuid.uuid4().hex[:8]}"

def generate_ai_msg_id():
    return f"aimsg-{uuid.uuid4().hex[:8]}"

class AIChatSession(models.Model):
    id = models.CharField(primary_key=True, max_length=64, default=generate_ai_session_id)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='ai_chat_sessions')
    title = models.CharField(max_length=255, default='AI Tutor Session')
    context_type = models.CharField(max_length=64, default='GENERAL')
    context_id = models.CharField(max_length=128, blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'lh_ai_chat_sessions'
        ordering = ['-updated_at']

    def __str__(self):
        return f"{self.user.email} - {self.title}"

class AIChatMessage(models.Model):
    SENDER_CHOICES = (
        ('USER', 'User'),
        ('AI', 'AI Tutor'),
    )

    id = models.CharField(primary_key=True, max_length=64, default=generate_ai_msg_id)
    session = models.ForeignKey(AIChatSession, on_delete=models.CASCADE, related_name='messages')
    sender = models.CharField(max_length=10, choices=SENDER_CHOICES, default='USER')
    content = models.TextField()
    tokens_used = models.IntegerField(default=50)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'lh_ai_chat_messages'
        ordering = ['created_at']

class SpacedRepetitionSchedule(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='spaced_repetition_schedules')
    topic = models.CharField(max_length=100, db_index=True)
    repetitions = models.IntegerField(default=0)
    interval_days = models.IntegerField(default=1)
    ease_factor = models.FloatField(default=2.5) # SM-2 standard ease factor
    next_review_date = models.DateField(default=timezone.localdate)
    lapses = models.IntegerField(default=0)
    last_reviewed_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'lh_spaced_repetition_schedules'
        unique_together = ('user', 'topic')

    def __str__(self):
        return f"{self.user.email} - {self.topic} (Due: {self.next_review_date})"


def generate_study_task_id():
    return f"stask-{uuid.uuid4().hex[:8]}"

def generate_study_sched_id():
    return f"ssched-{uuid.uuid4().hex[:8]}"

class StudySchedule(models.Model):
    id = models.CharField(primary_key=True, max_length=64, default=generate_study_sched_id)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='study_schedules')
    title = models.CharField(max_length=255, default='My Exam Prep Schedule')
    description = models.TextField(blank=True, default='')
    start_date = models.DateField(default=timezone.localdate)
    end_date = models.DateField(null=True, blank=True)
    daily_goal_minutes = models.IntegerField(default=120)
    preferred_study_times = models.JSONField(default=list, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'lh_study_schedules'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user.email} - {self.title}"


class StudyTask(models.Model):
    TASK_TYPE_CHOICES = (
        ('reading', 'Reading'),
        ('video', 'Video'),
        ('quiz', 'Quiz'),
        ('assignment', 'Assignment'),
        ('practice', 'Practice'),
        ('review', 'Review'),
    )
    PRIORITY_CHOICES = (
        ('low', 'Low'),
        ('medium', 'Medium'),
        ('high', 'High'),
    )
    STATUS_CHOICES = (
        ('pending', 'Pending'),
        ('in_progress', 'In Progress'),
        ('completed', 'Completed'),
        ('skipped', 'Skipped'),
    )

    id = models.CharField(primary_key=True, max_length=64, default=generate_study_task_id)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='study_tasks')
    schedule = models.ForeignKey(StudySchedule, on_delete=models.CASCADE, null=True, blank=True, related_name='tasks')
    course_id = models.CharField(max_length=64, blank=True, default='')
    course_title = models.CharField(max_length=255, blank=True, default='')
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, default='')
    task_type = models.CharField(max_length=32, choices=TASK_TYPE_CHOICES, default='practice')
    scheduled_date = models.DateField(default=timezone.localdate)
    scheduled_time = models.CharField(max_length=16, blank=True, default='')
    duration_minutes = models.IntegerField(default=45)
    priority = models.CharField(max_length=16, choices=PRIORITY_CHOICES, default='medium')
    status = models.CharField(max_length=16, choices=STATUS_CHOICES, default='pending')
    completed_at = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'lh_study_tasks'
        ordering = ['scheduled_date', 'scheduled_time']

    def __str__(self):
        return f"{self.user.email} - {self.title} ({self.status})"

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
    next_review_date = models.DateField(default=timezone.now)
    lapses = models.IntegerField(default=0)
    last_reviewed_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'lh_spaced_repetition_schedules'
        unique_together = ('user', 'topic')

    def __str__(self):
        return f"{self.user.email} - {self.topic} (Due: {self.next_review_date})"

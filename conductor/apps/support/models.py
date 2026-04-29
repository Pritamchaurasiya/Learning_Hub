from django.db import models
from django.conf import settings
from apps.core.models import BaseModel

class Feedback(BaseModel):
    """User feedback and support tickets."""
    
    class Category(models.TextChoices):
        GENERAL = 'general', 'General Inquiry'
        BUG = 'bug', 'Bug Report'
        CONTENT = 'content', 'Course Content'
        BILLING = 'billing', 'Billing & Payment'
        FEATURE = 'feature', 'Feature Request'
        OTHER = 'other', 'Other'

    class Status(models.TextChoices):
        OPEN = 'open', 'Open'
        IN_PROGRESS = 'in_progress', 'In Progress'
        ESCALATED = 'escalated', 'Escalated'
        RESOLVED = 'resolved', 'Resolved'
        CLOSED = 'closed', 'Closed'

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='feedback'
    )
    category = models.CharField(
        max_length=20,
        choices=Category.choices,
        default=Category.GENERAL
    )
    subject = models.CharField(max_length=255)
    message = models.TextField()
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.OPEN
    )
    
    # Advanced AI Auto-Triage Fields
    urgency_score = models.IntegerField(default=1, help_text="1 (Low) to 10 (Critical) calculated by AI.")
    ai_suggested_response = models.TextField(blank=True, help_text="Auto-generated triage answer.")
    
    admin_response = models.TextField(blank=True)
    
    class Meta:
        db_table = 'feedback'
        ordering = ['-created_at']
        verbose_name_plural = "Feedback"
        indexes = [
            models.Index(fields=['status', '-created_at']),
            models.Index(fields=['user', 'status']),
            models.Index(fields=['urgency_score', 'status']),
            models.Index(fields=['category']),
        ]

    def __str__(self):
        return f"{self.category.upper()} - {self.subject} ({self.user.email})"

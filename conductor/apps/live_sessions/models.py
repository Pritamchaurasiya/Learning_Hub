from django.db import models
from django.conf import settings
from apps.core.models import BaseModel
from apps.courses.models import Course

class LiveSession(BaseModel):
    """A scheduled live class session."""
    STATUS_CHOICES = (
        ('scheduled', 'Scheduled'),
        ('live', 'Live'),
        ('ended', 'Ended'),
        ('cancelled', 'Cancelled'),
    )

    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    course = models.ForeignKey(
        Course,
        on_delete=models.CASCADE,
        related_name='live_sessions',
        null=True,
        blank=True
    )
    host = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='hosted_sessions'
    )
    scheduled_time = models.DateTimeField()
    duration_minutes = models.PositiveIntegerField(default=60)
    meeting_url = models.URLField(blank=True, help_text="Zoom/Meet link")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='scheduled')
    thumbnail = models.ImageField(upload_to='live_sessions/', blank=True, null=True)

    class Meta:
        ordering = ['-scheduled_time']

    def __str__(self):
        return f"{self.title} by {self.host}"

class SessionAttendee(BaseModel):
    """Tracks who joined a live session."""
    session = models.ForeignKey(LiveSession, on_delete=models.CASCADE, related_name='attendees')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ['session', 'user']

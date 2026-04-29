from django.db import models
from apps.users.models import User
from apps.core.models import BaseModel
from apps.courses.models import Lesson

class LessonActivity(BaseModel):
    """Tracks time spent on a lesson by a user."""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='lesson_activities')
    lesson = models.ForeignKey(Lesson, on_delete=models.CASCADE, related_name='activities')
    session_id = models.CharField(max_length=100, help_text="Client-generated unique ID for the viewing session")
    started_at = models.DateTimeField(auto_now_add=True)
    last_heartbeat = models.DateTimeField(auto_now=True)
    duration_seconds = models.PositiveIntegerField(default=0)
    
    class Meta:
        db_table = "analytics_lesson_activity"
        indexes = [
            models.Index(fields=['user', 'lesson']),
            models.Index(fields=['started_at']),
        ]

class VideoInteraction(BaseModel):
    """Raw video player events for heatmaps."""
    class EventType(models.TextChoices):
        PLAY = 'play', 'Play'
        PAUSE = 'pause', 'Pause'
        SEEK = 'seek', 'Seek'
        COMPLETE = 'complete', 'Complete'
        HEARTBEAT = 'heartbeat', 'Heartbeat'

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='video_interactions')
    lesson = models.ForeignKey(Lesson, on_delete=models.CASCADE, related_name='video_interactions')
    event_type = models.CharField(max_length=20, choices=EventType.choices)
    video_timestamp = models.FloatField(help_text="Position in video (seconds)")
    real_timestamp = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = "analytics_video_interactions"
        indexes = [
            models.Index(fields=['lesson', 'video_timestamp']), # For heatmap aggregation
        ]

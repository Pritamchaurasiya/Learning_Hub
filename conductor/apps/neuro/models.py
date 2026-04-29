from django.db import models
from django.conf import settings
from apps.core.models import BaseModel
from apps.courses.models import Course, Lesson

class BrainwaveSession(BaseModel):
    """
    Records a continuous block of BCI telemetry for a specific user and lesson.
    """
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="bci_sessions")
    course = models.ForeignKey(Course, on_delete=models.CASCADE)
    lesson = models.ForeignKey(Lesson, on_delete=models.CASCADE)
    
    # Aggregated metrics for the session
    avg_attention = models.FloatField(default=0.0, help_text="Calculated from Low Beta / High Alpha ratios")
    avg_meditation = models.FloatField(default=0.0, help_text="Calculated from Alpha / Theta ratios")
    
    # Raw payload data (stored as JSON for ML batch processing later)
    # In production, this might go to an time-series DB like InfluxDB or ClickHouse
    raw_telemetry = models.JSONField(default=list, help_text="List of high-frequency temporal data points")

    is_completed = models.BooleanField(default=False)

    class Meta:
        db_table = "neuro_bci_sessions"
        verbose_name = "BCI Session"
        verbose_name_plural = "BCI Sessions"

    def __str__(self):
        return f"BCI Session: {self.user.username} - {self.lesson.title}"

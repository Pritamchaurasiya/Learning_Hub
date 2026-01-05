"""Notification models."""

from django.db import models
from apps.users.models import User
from core.models import BaseModel


class Notification(BaseModel):
    """In-app notification."""

    class Type(models.TextChoices):
        SYSTEM = "system", "System"
        COURSE = "course", "Course Update"
        ACHIEVEMENT = "achievement", "Achievement"
        REMINDER = "reminder", "Reminder"

    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="notifications"
    )

    type = models.CharField(max_length=20, choices=Type.choices, default=Type.SYSTEM)
    title = models.CharField(max_length=200)
    message = models.TextField()
    data = models.JSONField(default=dict, blank=True)  # Extra payload

    is_read = models.BooleanField(default=False)
    read_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "notifications"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.user.email} - {self.title}"


class DeviceToken(BaseModel):
    """FCM device tokens for push notifications."""

    class Platform(models.TextChoices):
        ANDROID = "android", "Android"
        IOS = "ios", "iOS"
        WEB = "web", "Web"

    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="device_tokens"
    )
    token = models.TextField()
    platform = models.CharField(max_length=20, choices=Platform.choices)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = "device_tokens"
        unique_together = ["user", "token"]

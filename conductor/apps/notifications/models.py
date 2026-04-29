"""Notification models."""

from django.db import models
from apps.users.models import User
from apps.core.models import BaseModel


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
        indexes = [
            models.Index(fields=['user', 'is_read', '-created_at']),
        ]

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


class SmartNotification(BaseModel):
    """
    Smart notification model with engagement tracking.
    AI-powered notification system that optimizes delivery timing.
    """
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='smart_notifications')
    
    # Content
    title = models.CharField(max_length=200)
    body = models.TextField()
    notification_type = models.CharField(max_length=50)
    priority = models.PositiveSmallIntegerField(default=2)
    
    # Metadata
    data = models.JSONField(default=dict, blank=True)
    action_url = models.CharField(max_length=500, blank=True)
    image_url = models.CharField(max_length=500, blank=True)
    
    # Timing
    scheduled_for = models.DateTimeField(null=True, blank=True)
    sent_at = models.DateTimeField(null=True, blank=True)
    
    # Engagement tracking
    is_read = models.BooleanField(default=False)
    read_at = models.DateTimeField(null=True, blank=True)
    is_dismissed = models.BooleanField(default=False)
    dismissed_at = models.DateTimeField(null=True, blank=True)
    
    # Delivery
    is_sent = models.BooleanField(default=False)
    delivery_channel = models.CharField(max_length=20, default='in_app')  # in_app, push, email
    
    class Meta:
        db_table = 'smart_notifications'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'is_read', 'created_at']),
            models.Index(fields=['scheduled_for', 'is_sent']),
        ]
    
    def __str__(self):
        return f"{self.title} -> {self.user.username}"
    
    def mark_read(self):
        """Mark notification as read."""
        from django.utils import timezone
        if not self.is_read:
            self.is_read = True
            self.read_at = timezone.now()
            self.save(update_fields=['is_read', 'read_at'])
    
    def dismiss(self):
        """Dismiss the notification."""
        from django.utils import timezone
        self.is_dismissed = True
        self.dismissed_at = timezone.now()
        self.save(update_fields=['is_dismissed', 'dismissed_at'])

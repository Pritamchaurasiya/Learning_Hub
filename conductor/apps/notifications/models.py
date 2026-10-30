"""Notification models."""

from django.db import models
from django.utils import timezone
from apps.users.models import User
from apps.core.models import BaseModel


class Notification(BaseModel):
    """In-app notification."""

    class Type(models.TextChoices):
        SYSTEM = "system", "System"
        COURSE = "course", "Course Update"
        ACHIEVEMENT = "achievement", "Achievement"
        REMINDER = "reminder", "Reminder"
        PAYMENT = "payment", "Payment"
        SOCIAL = "social", "Social"

    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="notifications", db_index=True
    )

    type = models.CharField(max_length=20, choices=Type.choices, default=Type.SYSTEM, db_index=True)
    title = models.CharField(max_length=200, db_index=True)
    message = models.TextField()
    data = models.JSONField(default=dict, blank=True)  # Extra payload
    action_url = models.CharField(max_length=500, blank=True)

    is_read = models.BooleanField(default=False, db_index=True)
    read_at = models.DateTimeField(null=True, blank=True, db_index=True)
    
    priority = models.PositiveSmallIntegerField(default=2, db_index=True)  # 1=high, 2=normal, 3=low
    expires_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "notifications"
        ordering = ["-created_at"]
        verbose_name = "Notification"
        verbose_name_plural = "Notifications"
        indexes = [
            models.Index(fields=['user', 'is_read', '-created_at'], name='idx_notif_user_read_created'),
            models.Index(fields=['user', 'type', '-created_at'], name='idx_notif_user_type'),
            models.Index(fields=['user', '-priority', '-created_at'], name='idx_notif_user_priority'),
            models.Index(fields=['type', 'is_read'], name='idx_notif_type_read'),
            models.Index(fields=['-created_at'], name='idx_notif_recent'),
        ]
        constraints = [
            models.CheckConstraint(
                check=models.Q(priority__gte=1, priority__lte=5),
                name='notification_priority_range'
            ),
        ]

    def __str__(self):
        return f"{self.user.email} - {self.title}"
    
    def mark_read(self):
        """Mark notification as read."""
        if not self.is_read:
            self.is_read = True
            self.read_at = timezone.now()
            self.save(update_fields=['is_read', 'read_at'])


class DeviceToken(BaseModel):
    """FCM device tokens for push notifications."""

    class Platform(models.TextChoices):
        ANDROID = "android", "Android"
        IOS = "ios", "iOS"
        WEB = "web", "Web"
        WINDOWS = "windows", "Windows"

    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="device_tokens", db_index=True
    )
    token = models.TextField(db_index=True)
    platform = models.CharField(max_length=20, choices=Platform.choices, db_index=True)
    is_active = models.BooleanField(default=True, db_index=True)
    last_used_at = models.DateTimeField(auto_now=True)
    device_name = models.CharField(max_length=100, blank=True)

    class Meta:
        db_table = "device_tokens"
        verbose_name = "Device Token"
        verbose_name_plural = "Device Tokens"
        unique_together = ["user", "token"]
        indexes = [
            models.Index(fields=['user', 'is_active'], name='idx_device_user_active'),
            models.Index(fields=['platform', 'is_active'], name='idx_device_platform_active'),
            models.Index(fields=['-last_used_at'], name='idx_device_recent'),
        ]
        
    def __str__(self):
        return f"{self.user.email} - {self.platform} - {self.token[:20]}..."
    
    def deactivate(self):
        """Deactivate device token."""
        self.is_active = False
        self.save(update_fields=['is_active'])


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

    class Status(models.TextChoices):
        PENDING = "PENDING", "Pending"
        SENT = "SENT", "Sent"
        FAILED = "FAILED", "Failed"

    status = models.CharField(max_length=10, choices=Status.choices, default=Status.PENDING)
    retry_count = models.PositiveSmallIntegerField(default=0)
    error_message = models.TextField(blank=True, default="")
    
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

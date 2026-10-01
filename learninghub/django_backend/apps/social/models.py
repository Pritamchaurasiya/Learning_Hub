"""
Models for the social app: notifications, discussions, comments, live sessions, mentors.
"""
import uuid
from django.conf import settings
from django.db import models
from django.utils import timezone


def generate_discussion_id():
    return f"disc-{uuid.uuid4().hex[:8]}"


def generate_comment_id():
    return f"cmt-{uuid.uuid4().hex[:8]}"


def generate_mentor_id():
    return f"mnt-{uuid.uuid4().hex[:8]}"


def generate_live_session_id():
    return f"live-{uuid.uuid4().hex[:8]}"


def generate_notification_id():
    return f"notif-{uuid.uuid4().hex[:12]}"


class Notification(models.Model):
    """
    Per-user notification (info, success, warning, error, achievement, etc.).

    Mirrors the Prisma Notification model so both backends expose a consistent
    shape to the frontend.
    """
    TYPE_CHOICES = (
        ('INFO', 'Info'),
        ('SUCCESS', 'Success'),
        ('WARNING', 'Warning'),
        ('ERROR', 'Error'),
        ('ACHIEVEMENT', 'Achievement'),
        ('REMINDER', 'Reminder'),
        ('SYSTEM', 'System'),
        ('TEST_RESULT', 'Test Result'),
        ('COURSE_COMPLETE', 'Course Complete'),
        ('STREAK', 'Streak'),
        ('CONTEST_START', 'Contest Start'),
        ('CONTEST_RESULT', 'Contest Result'),
        ('SUBSCRIPTION', 'Subscription'),
        ('LEVEL_UP', 'Level Up'),
    )

    id = models.CharField(primary_key=True, max_length=64, default=generate_notification_id)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='notifications',
    )
    type = models.CharField(max_length=32, choices=TYPE_CHOICES, default='INFO', db_index=True)
    title = models.CharField(max_length=200)
    message = models.TextField()
    is_read = models.BooleanField(default=False, db_index=True)
    action_url = models.URLField(max_length=500, blank=True, null=True)
    metadata = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(default=timezone.now, db_index=True)
    read_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'lh_notifications'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'is_read', '-created_at']),
            models.Index(fields=['user', 'type', '-created_at']),
            models.Index(fields=['-created_at']),
        ]

    def __str__(self):
        return f"{self.type}: {self.title[:50]}"

    def mark_read(self):
        """Idempotent mark-as-read."""
        if not self.is_read:
            self.is_read = True
            self.read_at = timezone.now()
            self.save(update_fields=['is_read', 'read_at'])


class Discussion(models.Model):
    id = models.CharField(primary_key=True, max_length=64, default=generate_discussion_id)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='discussions')
    title = models.CharField(max_length=255, db_index=True)
    content = models.TextField()
    category = models.CharField(max_length=64, default='General', db_index=True)
    tags = models.JSONField(default=list, blank=True)
    upvotes = models.IntegerField(default=0)
    views = models.IntegerField(default=1)
    is_pinned = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'lh_discussions'
        ordering = ['-is_pinned', '-created_at']

    def __str__(self):
        return self.title

    @property
    def likes(self):
        return self.upvotes

    @property
    def replies(self):
        return self.comments.count() if hasattr(self, 'comments') else 0


class Comment(models.Model):
    id = models.CharField(primary_key=True, max_length=64, default=generate_comment_id)
    discussion = models.ForeignKey(Discussion, on_delete=models.CASCADE, related_name='comments')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='discussion_comments')
    content = models.TextField()
    upvotes = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'lh_discussion_comments'
        ordering = ['created_at']


class LiveSession(models.Model):
    STATUS_CHOICES = (
        ('upcoming', 'Upcoming'),
        ('live', 'Live Now'),
        ('completed', 'Completed'),
    )

    id = models.CharField(primary_key=True, max_length=64, default=generate_live_session_id)
    title = models.CharField(max_length=255)
    instructor_name = models.CharField(max_length=150, default='Lead Faculty')
    instructor_avatar = models.URLField(max_length=500, blank=True, null=True)
    topic = models.CharField(max_length=100, default='DSA & System Design')
    start_time = models.DateTimeField(default=timezone.now)
    duration_minutes = models.IntegerField(default=60)
    meeting_url = models.URLField(max_length=500, blank=True, default='https://meet.learninghub.app/live-session')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='upcoming')
    attendees_count = models.IntegerField(default=45)

    class Meta:
        db_table = 'lh_live_sessions'
        ordering = ['start_time']

    @property
    def host_name(self):
        return self.instructor_name

    @property
    def description(self):
        return f"{self.topic} with {self.instructor_name}"


class Mentor(models.Model):
    id = models.CharField(primary_key=True, max_length=64, default=generate_mentor_id)
    name = models.CharField(max_length=150)
    title = models.CharField(max_length=200, default='Senior Software Engineer at Google')
    avatar = models.URLField(max_length=500, blank=True, null=True)
    specialization = models.CharField(max_length=150, default='DSA, System Design & Interview Prep')
    rating = models.FloatField(default=4.9)
    hourly_rate = models.DecimalField(max_digits=8, decimal_places=2, default=49.00)
    available_slots = models.JSONField(default=list, blank=True)

    class Meta:
        db_table = 'lh_mentors'

    def __str__(self):
        return self.name

    @property
    def expertise(self):
        return self.specialization

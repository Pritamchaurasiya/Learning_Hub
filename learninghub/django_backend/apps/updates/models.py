"""
Canonical Data Models for LearningHub Student Updates Hub.
"""
import uuid
import hashlib
from django.db import models
from django.conf import settings
from django.utils import timezone


def generate_id(prefix: str, length: int = 8) -> str:
    return f"{prefix}-{uuid.uuid4().hex[:length]}"


def gen_source_id() -> str:
    return generate_id('src', 10)


def gen_endpoint_id() -> str:
    return generate_id('ep', 8)


def gen_update_id() -> str:
    return generate_id('upd', 10)


def gen_version_id() -> str:
    return generate_id('ver', 8)


def gen_attachment_id() -> str:
    return generate_id('att', 8)


def gen_crosslink_id() -> str:
    return generate_id('lnk', 8)


def gen_subscription_id() -> str:
    return generate_id('sub', 8)


def gen_bookmark_id() -> str:
    return generate_id('bmk', 8)


def gen_reminder_id() -> str:
    return generate_id('rem', 8)


class UpdateSource(models.Model):
    """
    Official and approved external source registry.
    """
    SOURCE_TYPES = (
        ('UNIVERSITY', 'University'),
        ('EXAM_BOARD', 'Statutory Exam Board'),
        ('GOVERNMENT', 'Government Education Department'),
        ('COLLEGE', 'Affiliated College'),
        ('APPROVED_ORG', 'Approved Organization'),
        ('SECONDARY', 'Secondary Media Desk'),
    )

    AUTHORITY_LEVELS = (
        (1, 'Level 1: Official Authority'),
        (2, 'Level 2: Institution Controlled Portal'),
        (3, 'Level 3: Approved Educational Organization'),
        (4, 'Level 4: Trusted Secondary Source'),
        (5, 'Level 5: Unverified Community Source'),
    )

    FETCH_METHODS = (
        ('REST_API', 'Official REST/JSON API'),
        ('RSS_FEED', 'RSS / Atom Feed'),
        ('HTML_TABLE', 'Structured HTML Table'),
        ('DOM_SCRAPE', 'Targeted DOM Extraction'),
        ('MANUAL', 'Curated Manual Submission'),
    )

    source_id = models.CharField(primary_key=True, max_length=64, default=gen_source_id)
    name = models.CharField(max_length=255, db_index=True)
    domain = models.CharField(max_length=255, db_index=True)
    source_type = models.CharField(max_length=32, choices=SOURCE_TYPES, default='UNIVERSITY')
    authority_level = models.IntegerField(choices=AUTHORITY_LEVELS, default=1, db_index=True)
    category = models.CharField(max_length=64, default='ACADEMIC', db_index=True)
    country = models.CharField(max_length=64, default='India')
    state = models.CharField(max_length=64, default='Uttar Pradesh')
    institution = models.CharField(max_length=255, db_index=True)
    base_url = models.URLField(max_length=500)
    fetch_method = models.CharField(max_length=32, choices=FETCH_METHODS, default='HTML_TABLE')
    polling_interval_minutes = models.IntegerField(default=60)
    robots_policy = models.CharField(max_length=32, default='COMPLIANT')
    terms_status = models.CharField(max_length=32, default='APPROVED')
    is_enabled = models.BooleanField(default=True, db_index=True)
    verification_required = models.BooleanField(default=False)
    last_success_at = models.DateTimeField(null=True, blank=True)
    last_failure_at = models.DateTimeField(null=True, blank=True)
    failure_count = models.IntegerField(default=0)
    last_content_hash = models.CharField(max_length=64, blank=True, default='')
    last_checked_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'lh_update_sources'
        ordering = ['authority_level', 'name']
        indexes = [
            models.Index(fields=['is_enabled', 'authority_level']),
            models.Index(fields=['domain']),
        ]

    def __str__(self):
        return f"{self.name} (Level {self.authority_level})"


class UpdateSourceEndpoint(models.Model):
    """
    Specific sub-endpoints monitored under an official source.
    """
    id = models.CharField(primary_key=True, max_length=64, default=gen_endpoint_id)
    source = models.ForeignKey(UpdateSource, on_delete=models.CASCADE, related_name='endpoints')
    name = models.CharField(max_length=128)
    sub_category = models.CharField(max_length=64, default='NOTICE_BOARD')
    endpoint_url = models.URLField(max_length=500)
    css_selector = models.CharField(max_length=255, blank=True, default='')
    is_active = models.BooleanField(default=True)
    last_hash = models.CharField(max_length=64, blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'lh_update_source_endpoints'
        ordering = ['source', 'name']

    def __str__(self):
        return f"{self.source.name} - {self.name}"


class StudentUpdate(models.Model):
    """
    Canonical, normalized student notice entity.
    """
    CATEGORY_CHOICES = (
        ('ACADEMIC', 'Academic'),
        ('EXAMINATION', 'Examination'),
        ('ADMISSION', 'Admission'),
        ('SCHOLARSHIP', 'Scholarship'),
        ('CAREER', 'Career & Placement'),
        ('COMPETITIVE_EXAMS', 'Competitive Exams'),
        ('GENERAL', 'General Announcement'),
    )

    IMPORTANCE_LEVELS = (
        ('NORMAL', 'Normal'),
        ('IMPORTANT', 'Important'),
        ('URGENT', 'Urgent'),
    )

    STATUS_CHOICES = (
        ('DRAFT', 'Draft'),
        ('PUBLISHED', 'Published'),
        ('ARCHIVED', 'Archived'),
        ('REJECTED', 'Rejected'),
    )

    VERIFICATION_STATUSES = (
        ('VERIFIED', 'Verified Official'),
        ('PENDING_REVIEW', 'Pending Verification'),
        ('FLAGGED', 'Flagged / Disputed'),
    )

    id = models.CharField(primary_key=True, max_length=64, default=gen_update_id)
    source = models.ForeignKey(
        UpdateSource,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='updates'
    )
    title = models.CharField(max_length=500, db_index=True)
    summary = models.TextField()
    ai_summary = models.TextField(blank=True, default='')
    is_ai_summarized = models.BooleanField(default=False)
    source_url = models.URLField(max_length=1000)
    category = models.CharField(max_length=64, choices=CATEGORY_CHOICES, default='ACADEMIC', db_index=True)
    sub_category = models.CharField(max_length=64, blank=True, default='', db_index=True)
    institution = models.CharField(max_length=255, db_index=True)
    exam = models.CharField(max_length=255, blank=True, default='', db_index=True)
    course = models.CharField(max_length=255, blank=True, default='', db_index=True)
    semester = models.CharField(max_length=64, blank=True, default='')
    session = models.CharField(max_length=64, blank=True, default='')
    published_at = models.DateTimeField(null=True, blank=True, db_index=True)
    effective_from = models.DateTimeField(null=True, blank=True)
    effective_until = models.DateTimeField(null=True, blank=True)
    deadline = models.DateTimeField(null=True, blank=True, db_index=True)
    event_date = models.DateTimeField(null=True, blank=True)
    status = models.CharField(max_length=32, choices=STATUS_CHOICES, default='PUBLISHED', db_index=True)
    verification_status = models.CharField(
        max_length=32,
        choices=VERIFICATION_STATUSES,
        default='VERIFIED',
        db_index=True
    )
    importance = models.CharField(max_length=32, choices=IMPORTANCE_LEVELS, default='NORMAL', db_index=True)
    audience = models.JSONField(default=dict, blank=True)
    language = models.CharField(max_length=16, default='en')
    related_links = models.JSONField(default=list, blank=True)
    content_hash = models.CharField(max_length=64, db_index=True)
    version = models.IntegerField(default=1)
    last_checked_at = models.DateTimeField(default=timezone.now)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'lh_student_updates'
        ordering = ['-published_at', '-created_at']
        indexes = [
            models.Index(fields=['category', '-published_at']),
            models.Index(fields=['institution', 'category']),
            models.Index(fields=['status', 'verification_status']),
            models.Index(fields=['deadline']),
            models.Index(fields=['importance', '-created_at']),
        ]

    def __str__(self):
        return f"[{self.category}] {self.title[:60]}"

    @classmethod
    def calculate_hash(cls, title: str, source_url: str, date_str: str = '', content: str = '') -> str:
        """
        Deterministic SHA-256 hash across canonical identity fields.
        """
        raw = f"{title.strip().lower()}|{source_url.strip().lower()}|{date_str.strip()}|{content.strip()[:500]}"
        return hashlib.sha256(raw.encode('utf-8')).hexdigest()


class UpdateVersion(models.Model):
    """
    Version history tracking changes when an official notice is modified.
    """
    id = models.CharField(primary_key=True, max_length=64, default=gen_version_id)
    update = models.ForeignKey(StudentUpdate, on_delete=models.CASCADE, related_name='versions')
    version_number = models.IntegerField()
    title = models.CharField(max_length=500)
    summary = models.TextField()
    content_hash = models.CharField(max_length=64)
    diff_summary = models.TextField(blank=True, default='')
    changed_fields = models.JSONField(default=list, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'lh_update_versions'
        ordering = ['-version_number']

    def __str__(self):
        return f"{self.update.id} v{self.version_number}"


class UpdateAttachment(models.Model):
    """
    Official PDF or document circular linked to an update.
    """
    id = models.CharField(primary_key=True, max_length=64, default=gen_attachment_id)
    update = models.ForeignKey(StudentUpdate, on_delete=models.CASCADE, related_name='attachments')
    title = models.CharField(max_length=255)
    file_url = models.URLField(max_length=1000)
    file_size_bytes = models.BigIntegerField(default=0)
    mime_type = models.CharField(max_length=64, default='application/pdf')
    sha256_hash = models.CharField(max_length=64, blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'lh_update_attachments'

    def __str__(self):
        return f"{self.title} ({self.mime_type})"


class UpdateCrossLink(models.Model):
    """
    LearningHub Cross-Feature Ecosystem linking (Test A+, Ebooks, Courses, Study Planner).
    """
    LINK_TYPES = (
        ('TEST', 'Test A+ Assessment'),
        ('EBOOK', 'Ebook Chapter'),
        ('COURSE', 'Course Lesson'),
        ('STUDY_PLAN', 'Study Planner Goal'),
    )

    id = models.CharField(primary_key=True, max_length=64, default=gen_crosslink_id)
    update = models.ForeignKey(StudentUpdate, on_delete=models.CASCADE, related_name='cross_links')
    content_type = models.CharField(max_length=32, choices=LINK_TYPES)
    target_id = models.CharField(max_length=64, db_index=True)
    title = models.CharField(max_length=255)
    action_cta = models.CharField(max_length=64, default='Prepare Now')
    action_url = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'lh_update_cross_links'

    def __str__(self):
        return f"[{self.content_type}] {self.title}"


class UpdateSubscription(models.Model):
    """
    Student follow subscriptions for personalizing updates feed.
    """
    TARGET_TYPES = (
        ('INSTITUTION', 'University / Institution'),
        ('COURSE', 'Degree / Course'),
        ('SEMESTER', 'Semester'),
        ('EXAM', 'Competitive Exam'),
        ('CATEGORY', 'Category'),
    )

    id = models.CharField(primary_key=True, max_length=64, default=gen_subscription_id)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='update_subscriptions'
    )
    target_type = models.CharField(max_length=32, choices=TARGET_TYPES, db_index=True)
    target_value = models.CharField(max_length=255, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'lh_update_subscriptions'
        unique_together = ('user', 'target_type', 'target_value')
        indexes = [
            models.Index(fields=['user', 'target_type']),
        ]

    def __str__(self):
        return f"{self.user.email} -> {self.target_type}:{self.target_value}"


class UpdateBookmark(models.Model):
    """
    Saved updates by students with custom notes and collection tags.
    """
    id = models.CharField(primary_key=True, max_length=64, default=gen_bookmark_id)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='update_bookmarks'
    )
    update = models.ForeignKey(
        StudentUpdate,
        on_delete=models.CASCADE,
        related_name='bookmarks'
    )
    notes = models.TextField(blank=True, default='')
    tag = models.CharField(max_length=64, blank=True, default='General')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'lh_update_bookmarks'
        unique_together = ('user', 'update')
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.user.email} saved {self.update.id}"


class UpdateReminder(models.Model):
    """
    Scheduled reminders for deadlines (7d, 3d, 1d, 0d).
    """
    REMINDER_TYPES = (
        ('7_DAYS_BEFORE', '7 Days Before Deadline'),
        ('3_DAYS_BEFORE', '3 Days Before Deadline'),
        ('1_DAY_BEFORE', '1 Day Before Deadline'),
        ('DAY_OF', 'Morning of Deadline Day'),
    )

    id = models.CharField(primary_key=True, max_length=64, default=gen_reminder_id)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='update_reminders'
    )
    update = models.ForeignKey(
        StudentUpdate,
        on_delete=models.CASCADE,
        related_name='reminders'
    )
    reminder_type = models.CharField(max_length=32, choices=REMINDER_TYPES)
    trigger_at = models.DateTimeField(db_index=True)
    is_dispatched = models.BooleanField(default=False, db_index=True)
    dispatched_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'lh_update_reminders'
        indexes = [
            models.Index(fields=['is_dispatched', 'trigger_at']),
        ]

    def __str__(self):
        return f"Reminder {self.reminder_type} for {self.user.email}"


class UpdateFetchLog(models.Model):
    """
    Observability telemetry for source fetch attempts.
    """
    id = models.BigAutoField(primary_key=True)
    source = models.ForeignKey(UpdateSource, on_delete=models.CASCADE, related_name='fetch_logs')
    status_code = models.IntegerField(default=200)
    latency_ms = models.IntegerField(default=0)
    change_detected = models.BooleanField(default=False)
    error_message = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        db_table = 'lh_update_fetch_logs'
        ordering = ['-created_at']

    def __str__(self):
        return f"Fetch {self.source.name} [{self.status_code}] at {self.created_at}"

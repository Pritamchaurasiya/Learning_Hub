"""
Canonical Data Models for LearningHub Student Updates Hub.
"""
import uuid
import hashlib
import datetime
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


def gen_pref_id() -> str:
    return generate_id('pref', 8)


def gen_queued_id() -> str:
    return generate_id('qnotif', 8)


def gen_audit_id() -> str:
    return generate_id('naud', 8)


def gen_watcher_id() -> str:
    return generate_id('watch', 8)


def gen_engagement_id() -> str:
    return generate_id('eng', 8)


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
    department = models.CharField(max_length=255, blank=True, default='', db_index=True)
    issuer_name = models.CharField(max_length=255, blank=True, default='')
    issuer_role = models.CharField(max_length=64, blank=True, default='', db_index=True)
    circular_number = models.CharField(max_length=128, blank=True, default='', db_index=True)
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


class UpdateNotificationPreference(models.Model):
    """
    User-specific notification settings: quiet hours, rate limits, and topic filters.
    """
    id = models.CharField(primary_key=True, max_length=64, default=gen_pref_id)
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='update_preferences'
    )
    quiet_hours_enabled = models.BooleanField(default=True)
    quiet_hours_start = models.TimeField(default=datetime.time(22, 0))  # 10:00 PM
    quiet_hours_end = models.TimeField(default=datetime.time(7, 0))    # 07:00 AM
    max_daily_push = models.IntegerField(default=3)
    allow_exam_forms = models.BooleanField(default=True)
    allow_results = models.BooleanField(default=True)
    allow_timetables = models.BooleanField(default=True)
    allow_scholarships = models.BooleanField(default=True)
    allow_admit_cards = models.BooleanField(default=True)
    allow_academic = models.BooleanField(default=True)
    digest_mode = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'lh_update_notification_preferences'

    def __str__(self):
        return f"Preferences for {self.user.email} (Quiet: {self.quiet_hours_enabled})"

    def is_in_quiet_hours(self, current_time: datetime.time = None) -> bool:
        if not self.quiet_hours_enabled:
            return False
        if current_time is None:
            current_time = timezone.localtime().time()

        start = self.quiet_hours_start
        end = self.quiet_hours_end

        if start <= end:
            return start <= current_time <= end
        else:
            # Crosses midnight (e.g. 22:00 -> 07:00)
            return current_time >= start or current_time <= end

    def is_category_allowed(self, category: str, sub_category: str = "") -> bool:
        cat_upper = (category or "").upper()
        sub_upper = (sub_category or "").upper()

        if "RESULT" in sub_upper or "RESULT" in cat_upper:
            return self.allow_results
        if "EXAM_FORM" in sub_upper or "FORM" in sub_upper:
            return self.allow_exam_forms
        if "TIMETABLE" in sub_upper or "DATE_SHEET" in sub_upper or "DATESHEET" in sub_upper:
            return self.allow_timetables
        if "ADMIT_CARD" in sub_upper or "HALL_TICKET" in sub_upper:
            return self.allow_admit_cards
        if "SCHOLARSHIP" in cat_upper:
            return self.allow_scholarships
        return self.allow_academic

    def evaluate_delivery(self, update, today_delivered_count: int = 0, current_time: datetime.time = None) -> dict:
        """
        Anti-noise and priority taxonomy evaluation:
        - LEVEL 1 (URGENT / Result): Bypasses quiet hours and frequency caps.
        - LEVEL 2 / 3: Subject to category opt-in, quiet hours queuing, and daily caps.
        """
        is_urgent = update.importance == 'URGENT' or "RESULT" in (getattr(update, 'sub_category', '') or '').upper()
        if is_urgent:
            return {
                'allowed': True,
                'channel': 'IMMEDIATE',
                'reason': 'Urgent emergency notice overrides quiet hours & rate caps',
                'bypass_quiet_hours': True
            }

        # Check category filtering
        if not self.is_category_allowed(update.category, getattr(update, 'sub_category', '')):
            return {
                'allowed': False,
                'channel': 'SUPPRESSED',
                'reason': 'Category muted in user preferences',
                'bypass_quiet_hours': False
            }

        # Check digest mode
        if self.digest_mode:
            return {
                'allowed': True,
                'channel': 'DIGEST_ONLY',
                'reason': 'User opted into morning digest bundle',
                'bypass_quiet_hours': False
            }

        # Check quiet hours
        if self.is_in_quiet_hours(current_time):
            return {
                'allowed': True,
                'channel': 'QUEUED_QUIET_HOURS',
                'reason': 'Queued for morning release (quiet hours active)',
                'bypass_quiet_hours': False
            }

        # Check daily push limit
        if today_delivered_count >= self.max_daily_push:
            return {
                'allowed': False,
                'channel': 'SUPPRESSED',
                'reason': f'Daily push notification cap of {self.max_daily_push} reached',
                'bypass_quiet_hours': False
            }

        return {
            'allowed': True,
            'channel': 'IMMEDIATE',
            'reason': 'Allowed for immediate delivery',
            'bypass_quiet_hours': False
        }


class QueuedUpdateNotification(models.Model):
    """
    Notifications deferred due to quiet hours or digest bundling.
    """
    QUEUE_REASONS = (
        ('QUIET_HOURS', 'Deferred During Quiet Hours'),
        ('DIGEST', 'Queued for Daily Digest'),
        ('RATE_LIMIT', 'Deferred due to Daily Cap'),
    )

    id = models.CharField(primary_key=True, max_length=64, default=gen_queued_id)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='queued_update_notifications'
    )
    update = models.ForeignKey(
        StudentUpdate,
        on_delete=models.CASCADE,
        related_name='queued_notifications'
    )
    queue_reason = models.CharField(max_length=32, choices=QUEUE_REASONS, default='QUIET_HOURS')
    scheduled_for = models.DateTimeField(db_index=True)
    is_dispatched = models.BooleanField(default=False, db_index=True)
    dispatched_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'lh_queued_update_notifications'
        ordering = ['scheduled_for']
        indexes = [
            models.Index(fields=['is_dispatched', 'scheduled_for']),
        ]

    def __str__(self):
        return f"Queued {self.update.id} for {self.user.email} at {self.scheduled_for}"


class UpdateNotificationAudit(models.Model):
    """
    Observability audit log for all updates notification decisions.
    """
    id = models.CharField(primary_key=True, max_length=64, default=gen_audit_id)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='update_notification_audits'
    )
    update = models.ForeignKey(
        StudentUpdate,
        on_delete=models.CASCADE,
        related_name='notification_audits'
    )
    channel = models.CharField(max_length=32, default='IN_APP')
    decision = models.CharField(max_length=32)  # IMMEDIATE, QUEUED_QUIET_HOURS, DIGEST_ONLY, SUPPRESSED
    reason = models.CharField(max_length=255)
    delivered_at = models.DateTimeField(default=timezone.now, db_index=True)

    class Meta:
        db_table = 'lh_update_notification_audits'
        ordering = ['-delivered_at']
        indexes = [
            models.Index(fields=['user', '-delivered_at']),
        ]

    def __str__(self):
        return f"Audit {self.decision} for {self.user.email} -> {self.update.id}"


class ResultWatcher(models.Model):
    """
    Automated university result tracker: students register institution, course, semester,
    and optional roll number. The system monitors crawled notices and notifies immediately
    upon official publication.
    """
    STATUS_CHOICES = (
        ('ACTIVE', 'Active Tracking'),
        ('RESULT_DECLARED', 'Result Declared'),
        ('CANCELLED', 'Cancelled'),
    )

    id = models.CharField(primary_key=True, max_length=64, default=gen_watcher_id)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='result_watchers'
    )
    institution = models.CharField(max_length=255, db_index=True)
    course = models.CharField(max_length=255, db_index=True)
    semester = models.CharField(max_length=64, blank=True, default='', db_index=True)
    roll_number = models.CharField(max_length=64, blank=True, default='')
    status = models.CharField(max_length=32, choices=STATUS_CHOICES, default='ACTIVE', db_index=True)
    matched_update = models.ForeignKey(
        StudentUpdate,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='matched_watchers'
    )
    result_url = models.URLField(max_length=1000, blank=True, default='')
    notified_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'lh_result_watchers'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status', 'institution']),
            models.Index(fields=['user', 'status']),
        ]

    def __str__(self):
        return f"Watch {self.course} ({self.semester}) @ {self.institution} for {self.user.email}"


class UpdateEngagementLog(models.Model):
    """
    Anonymized engagement telemetry for read rates, link conversions, and interaction analytics.
    Preserves zero PII — clients provide an anonymous hash or session fingerprint.
    """
    EVENT_TYPES = (
        ('IMPRESSION', 'Notice Rendered in Viewport'),
        ('CLICK_DETAIL', 'Opened Full Detail Page'),
        ('CLICK_SOURCE', 'Navigated to Official Portal URL'),
        ('CALENDAR_EXPORT', 'Exported to Google/iCal Calendar'),
        ('BOOKMARK', 'Saved to Bookmarks'),
        ('REMINDER_SET', 'Configured Push Reminder'),
    )

    id = models.CharField(primary_key=True, max_length=64, default=gen_engagement_id)
    update = models.ForeignKey(StudentUpdate, on_delete=models.CASCADE, related_name='engagement_logs')
    event_type = models.CharField(max_length=32, choices=EVENT_TYPES, db_index=True)
    client_hash = models.CharField(max_length=64, blank=True, default='', db_index=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        db_table = 'lh_update_engagement_logs'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['update', 'event_type']),
            models.Index(fields=['event_type', '-created_at']),
        ]

    def __str__(self):
        return f"{self.event_type} on {self.update.id} at {self.created_at}"


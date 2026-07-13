"""
Course models for Learning Hub Backend.
"""

from django.db import models
from django.utils.text import slugify

try:
    from django.contrib.postgres.indexes import GinIndex
except ImportError:
    GinIndex = None  # Not available without PostgreSQL

try:
    from pgvector.django import HnswIndex
except ImportError:
    HnswIndex = None  # PGVector might not be installed in all envs

from apps.users.models import User
from apps.core.models import BaseModel




class Category(BaseModel):
    """Course categories with hierarchical support."""

    name = models.CharField(max_length=100)
    slug = models.SlugField(unique=True, max_length=120)
    description = models.TextField(blank=True)
    icon = models.CharField(max_length=50, blank=True)  # Material icon name
    parent = models.ForeignKey(
        "self",
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name="subcategories",
    )
    order = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = "categories"
        ordering = ["order", "name"]
        verbose_name_plural = "Categories"
        indexes = [
            models.Index(fields=["is_active", "order"], name='idx_category_active'),  # Active categories
            models.Index(fields=["parent", "order"], name='idx_category_parent'),  # Subcategories
            models.Index(fields=["slug"], name='idx_category_slug'),  # Slug lookup
        ]

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)


class Course(BaseModel):
    """Main course model."""

    class Difficulty(models.TextChoices):
        BEGINNER = "beginner", "Beginner"
        INTERMEDIATE = "intermediate", "Intermediate"
        ADVANCED = "advanced", "Advanced"

    # Basic info
    title = models.CharField(max_length=200)
    slug = models.SlugField(unique=True, max_length=220)
    description = models.TextField()
    short_description = models.CharField(max_length=300)

    # Media
    thumbnail = models.ImageField(
        upload_to="courses/thumbnails/", null=True, blank=True
    )
    preview_video = models.FileField(upload_to="courses/raw_videos/", null=True, blank=True)
    hls_playlist = models.FileField(upload_to="courses/hls/", null=True, blank=True, help_text="Path to master.m3u8")

    # Relationships
    instructor = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="courses_taught"
    )
    category = models.ForeignKey(
        Category,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="courses",
    )

    # Pricing
    price = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    is_free = models.BooleanField(default=False)

    # Course details
    difficulty = models.CharField(
        max_length=20, choices=Difficulty.choices, default=Difficulty.BEGINNER
    )
    duration_hours = models.PositiveIntegerField(default=0)
    lessons_count = models.PositiveIntegerField(default=0)

    # Stats (denormalized for performance)
    enrollment_count = models.PositiveIntegerField(default=0)
    avg_rating = models.DecimalField(max_digits=3, decimal_places=2, default=0)
    review_count = models.PositiveIntegerField(default=0)

    # Status
    is_published = models.BooleanField(default=False)
    is_featured = models.BooleanField(default=False)
    published_at = models.DateTimeField(null=True, blank=True)

    # Requirements & Learning objectives
    requirements = models.JSONField(default=list, blank=True)
    learning_objectives = models.JSONField(default=list, blank=True)

    # SEO
    meta_title = models.CharField(max_length=70, blank=True)
    meta_description = models.CharField(max_length=160, blank=True)

    # AI / Semantics
    embedding = models.JSONField(null=True, blank=True, help_text="Semantic vector embedding (384-dim)")

    class Meta:
        db_table = "courses"
        ordering = ["-created_at"]
        verbose_name = "Course"
        verbose_name_plural = "Courses"
        indexes = [
            models.Index(fields=['is_published', '-created_at'], name='course_pub_created_idx'),
            models.Index(fields=['is_featured', '-created_at'], name='course_feat_created_idx'),
            models.Index(fields=['category', 'is_published'], name='course_cat_pub_idx'),
            models.Index(fields=['instructor', 'is_published'], name='course_inst_pub_idx'),
            models.Index(fields=['difficulty', 'is_published'], name='course_diff_pub_idx'),
            models.Index(fields=['slug'], name='course_slug_idx'),
            models.Index(fields=['title'], name='course_title_idx'),
            models.Index(fields=["slug"]),
            models.Index(fields=["category", "is_published"]),
            models.Index(fields=["-enrollment_count"]),
            models.Index(fields=["instructor"]),
            models.Index(fields=["is_published", "avg_rating"]), 
            models.Index(fields=["is_published", "created_at"]), 
        ]
        # Note: Full-text search GIN indexes removed temporarily
        # See DATABASE_FULLTEXT_SEARCH_IMPLEMENTATION.md for proper implementation

    def __str__(self):
        return self.title

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.title)
            
        super().save(*args, **kwargs)

        # Semantic Embedding (Async via Celery)
        # Check if embedding is missing and description exists
        if not self.embedding and self.description:
            try:
                from .tasks import generate_course_embedding_task
                from django.db import transaction
                # Schedule task on commit to ensure data is visible to worker
                transaction.on_commit(lambda: generate_course_embedding_task.delay(self.id))
            except Exception:
                pass # Fail silently if task scheduling fails


class Module(BaseModel):
    """Course module/section."""
    course = models.ForeignKey("courses.Course", related_name='modules', on_delete=models.CASCADE)
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    order = models.PositiveIntegerField(default=0)

    class Meta:
        db_table = "course_modules"
        ordering = ["order"]
        indexes = [
            models.Index(fields=["course", "order"]),
            models.Index(fields=["course", "-created_at"], name='idx_module_recent'),  # Recent modules
            models.Index(fields=["title"], name='idx_module_title'),  # Title search
        ]
        # Note: Full-text search GIN index removed temporarily
        # See DATABASE_FULLTEXT_SEARCH_IMPLEMENTATION.md for proper implementation

    def __str__(self):
        return f"{self.course.title} - {self.title}"


class Lesson(BaseModel):
    """Individual lesson within a module."""
    class ContentType(models.TextChoices):
        VIDEO = "video", "Video"
        TEXT = "text", "Text"
        QUIZ = "quiz", "Quiz"

    module = models.ForeignKey("courses.Module", related_name='lessons', on_delete=models.CASCADE)
    title = models.CharField(max_length=200)
    slug = models.SlugField(max_length=220)
    content_type = models.CharField(max_length=20, choices=ContentType.choices, default=ContentType.TEXT)
    
    # Content fields
    text_content = models.TextField(blank=True, help_text="Markdown content")
    video_url = models.URLField(blank=True, help_text="External video URL or HLS master")
    duration_minutes = models.PositiveIntegerField(default=0)
    
    order = models.PositiveIntegerField(default=0)
    is_preview = models.BooleanField(default=False)
    is_pro_only = models.BooleanField(default=False, help_text="Requires active subscription")

    class Meta:
        db_table = "lessons"
        ordering = ["order"]
        unique_together = ["module", "slug"]
        indexes = [
            models.Index(fields=["module", "order"]),
            models.Index(fields=["content_type"], name='idx_lesson_type'),  # Filter by content type
            models.Index(fields=["is_preview"], name='idx_lesson_preview'),  # Preview lessons
            models.Index(fields=["is_pro_only"], name='idx_lesson_pro'),  # Pro content filtering
            models.Index(fields=["title"], name='idx_lesson_title'),  # Title search
        ]
        # Note: Full-text search GIN index removed temporarily
        # See DATABASE_FULLTEXT_SEARCH_IMPLEMENTATION.md for proper implementation

    def __str__(self):
        return self.title

    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.title)
        super().save(*args, **kwargs)


class Enrollment(BaseModel):
    """User course enrollment."""

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="enrollments")
    course = models.ForeignKey(
        Course, on_delete=models.CASCADE, related_name="enrollments"
    )

    # Progress
    progress_percentage = models.PositiveIntegerField(default=0)
    completed_at = models.DateTimeField(null=True, blank=True)

    # Access
    last_accessed_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "enrollments"
        unique_together = ["user", "course"]
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["completed_at"]),
            models.Index(fields=["created_at"]),
            models.Index(fields=["user", "course", "created_at"], name="idx_enroll_usr_crs_date"),
            models.Index(fields=["progress_percentage"], name="idx_enrollment_progress"),
        ]

    def __str__(self):
        return f"{self.user} - {self.course}"


class Review(BaseModel):
    """Course review by a user."""

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="reviews")
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name="reviews")

    rating = models.PositiveIntegerField()  # 1-5
    title = models.CharField(max_length=200, blank=True)
    content = models.TextField(blank=True)

    is_approved = models.BooleanField(default=True)

    class Meta:
        db_table = "reviews"
        unique_together = ["user", "course"]
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["is_approved", "created_at"]),
            models.Index(fields=["rating"], name="idx_review_rating"),
            models.Index(fields=["course", "-created_at"], name="idx_review_course"),  # Recent course reviews
            models.Index(fields=["user", "-created_at"], name="idx_review_user"),  # User review history
            models.Index(fields=["course", "-rating"], name="idx_review_course_rating"),  # Top-rated reviews
        ]
        constraints = [
            models.CheckConstraint(
                check=models.Q(rating__gte=1, rating__lte=5),
                name="review_rating_range_1_to_5",
            ),
        ]

    def __str__(self):
        return f"{self.user.email} - {self.course.title} ({self.rating}★)"


class Certificate(BaseModel):
    """Course completion certificate."""

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="certificates")
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name="certificates")
    enrollment = models.OneToOneField(Enrollment, on_delete=models.CASCADE, related_name="certificate")
    
    issued_at = models.DateTimeField(auto_now_add=True)
    certificate_code = models.CharField(max_length=50, unique=True, editable=False)
    signature = models.TextField(blank=True, help_text="Cryptographic signature")

    class Meta:
        db_table = "certificates"
        unique_together = ["user", "course"]
        ordering = ["-issued_at"]
        indexes = [
            models.Index(fields=["user", "-issued_at"], name="idx_cert_user"),
            models.Index(fields=["course", "-issued_at"], name="idx_cert_course"),
            models.Index(fields=["certificate_code"], name="idx_cert_code"),
        ]

    def __str__(self):
        return f"Certificate for {self.user.username} - {self.course.title}"

    def save(self, *args, **kwargs):
        import uuid
        import hashlib
        import hmac
        from django.conf import settings
        
        if not self.certificate_code:
            self.certificate_code = uuid.uuid4().hex[:12].upper()
            
        if not self.signature:
            # Generate valid signature
            secret = getattr(settings, 'SECRET_KEY', 'default').encode()
            data = f"{self.user.id}:{self.course.id}:{self.certificate_code}".encode()
            self.signature = hmac.new(secret, data, hashlib.sha256).hexdigest()
            
        super().save(*args, **kwargs)

class CareerTrack(BaseModel):
    """
    Ordered collection of courses forming a learning path.
    """
    title = models.CharField(max_length=200)
    slug = models.SlugField(unique=True)
    description = models.TextField()
    thumbnail = models.ImageField(upload_to="tracks/", null=True, blank=True)
    is_active = models.BooleanField(default=True)
    
    courses = models.ManyToManyField(Course, through='TrackCourse', related_name='tracks')
    
    class Meta:
        db_table = "career_tracks"

    def __str__(self):
        return self.title

class TrackCourse(BaseModel):
    """
    Through model for ordered courses in a track.
    """
    track = models.ForeignKey(CareerTrack, on_delete=models.CASCADE)
    course = models.ForeignKey(Course, on_delete=models.CASCADE)
    order = models.PositiveIntegerField(default=0)
    is_required = models.BooleanField(default=True)
    
    class Meta:
        db_table = "track_courses"
        ordering = ['order']
        unique_together = ['track', 'course']


class LessonCompletion(BaseModel):
    """Tracks completion of individual lessons."""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="completed_lessons")
    lesson = models.ForeignKey("Lesson", on_delete=models.CASCADE, related_name="completions")
    completed_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = "lesson_completions"
        unique_together = ["user", "lesson"]
        indexes = [
            models.Index(fields=["user", "-completed_at"], name="idx_lessoncomp_user"),  # User completion history
            models.Index(fields=["lesson", "-completed_at"], name="idx_lessoncomp_lesson"),  # Lesson completions
            models.Index(fields=["-completed_at"], name="idx_lessoncomp_recent"),  # Recent completions
        ]
        
    def __str__(self):
        return f"{self.user.email} - {self.lesson.title}"

class LessonProgress(BaseModel):
    """Tracks detailed progress within a lesson (video timestamp)."""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="lesson_progress")
    lesson = models.ForeignKey(Lesson, on_delete=models.CASCADE, related_name="user_progress")
    progress_seconds = models.FloatField(default=0.0)
    last_updated = models.DateTimeField(auto_now=True)
    is_completed = models.BooleanField(default=False)

    class Meta:
        db_table = "lesson_progress"
        unique_together = ["user", "lesson"]
        indexes = [
            models.Index(fields=["user", "last_updated"]),
        ]

    def __str__(self):
        return f"{self.user.username} - {self.lesson.title} ({self.progress_seconds}s)"

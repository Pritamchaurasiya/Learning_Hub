import uuid
from django.db import models
from django.conf import settings

def generate_course_id():
    return f"crs-{uuid.uuid4().hex[:8]}"

def generate_chapter_id():
    return f"chp-{uuid.uuid4().hex[:8]}"

def generate_lesson_id():
    return f"lsn-{uuid.uuid4().hex[:8]}"

class Course(models.Model):
    LEVEL_CHOICES = (
        ('Beginner', 'Beginner'),
        ('Intermediate', 'Intermediate'),
        ('Advanced', 'Advanced'),
        ('All Levels', 'All Levels'),
    )

    id = models.CharField(primary_key=True, max_length=64, default=generate_course_id)
    title = models.CharField(max_length=255, db_index=True)
    slug = models.SlugField(max_length=255, unique=True)
    description = models.TextField()
    short_description = models.TextField(blank=True, default='')
    thumbnail_url = models.URLField(max_length=500, blank=True, null=True)
    trailer_video = models.URLField(max_length=500, blank=True, null=True)
    instructor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='instructed_courses')
    instructor_name = models.CharField(max_length=150, blank=True, default='Master Faculty')
    instructor_bio = models.TextField(blank=True, default='')
    instructor_total_students = models.IntegerField(default=0)
    instructor_total_courses = models.IntegerField(default=0)
    category = models.CharField(max_length=64, db_index=True, default='General')
    level = models.CharField(max_length=32, choices=LEVEL_CHOICES, default='All Levels')
    price = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    original_price = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    rating = models.FloatField(default=4.8)
    review_count = models.IntegerField(default=128)
    student_count = models.IntegerField(default=1420)
    duration_hours = models.IntegerField(default=45)
    passing_score = models.IntegerField(default=70)
    total_marks = models.IntegerField(default=100)
    negative_marks = models.IntegerField(default=0)
    is_published = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    learning_outcomes = models.JSONField(default=list, blank=True)
    prerequisites = models.JSONField(default=list, blank=True)
    tags = models.JSONField(default=list, blank=True)
    language = models.CharField(max_length=32, default='English')
    certificate = models.BooleanField(default=True)

    class Meta:
        db_table = 'lh_courses'
        ordering = ['-created_at']

    def __str__(self):
        return self.title

class Chapter(models.Model):
    id = models.CharField(primary_key=True, max_length=64, default=generate_chapter_id)
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='chapters')
    title = models.CharField(max_length=255)
    order = models.PositiveIntegerField(default=1)

    class Meta:
        db_table = 'lh_course_chapters'
        ordering = ['order']

    def __str__(self):
        return f"{self.course.title} - {self.title}"

class Lesson(models.Model):
    id = models.CharField(primary_key=True, max_length=64, default=generate_lesson_id)
    chapter = models.ForeignKey(Chapter, on_delete=models.CASCADE, related_name='lessons')
    title = models.CharField(max_length=255)
    content = models.TextField(blank=True, default='')
    video_url = models.URLField(max_length=500, blank=True, null=True)
    duration_minutes = models.IntegerField(default=15)
    order = models.PositiveIntegerField(default=1)
    is_free_preview = models.BooleanField(default=False)

    class Meta:
        db_table = 'lh_course_lessons'
        ordering = ['order']

    def __str__(self):
        return f"{self.chapter.title} - {self.title}"

class Enrollment(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='enrollments')
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='enrollments')
    progress = models.FloatField(default=0.0)
    enrolled_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'lh_course_enrollments'
        unique_together = ('user', 'course')

class LessonProgress(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='lesson_progress')
    lesson = models.ForeignKey(Lesson, on_delete=models.CASCADE, related_name='user_progress')
    completed = models.BooleanField(default=False)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'lh_lesson_progress'
        unique_together = ('user', 'lesson')

class CourseReview(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='reviews')
    rating = models.IntegerField(default=5)
    review_text = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'lh_course_reviews'
        ordering = ['-created_at']

class CourseBookmark(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='bookmarked_courses')
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name='bookmarks')
    notes = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'lh_course_bookmarks'
        unique_together = ('user', 'course')

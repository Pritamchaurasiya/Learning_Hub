import uuid
from django.db import models
from django.conf import settings


def generate_ebook_id():
    return f"ebk-{uuid.uuid4().hex[:12]}"


def generate_chapter_id():
    return f"chp-{uuid.uuid4().hex[:12]}"


def generate_highlight_id():
    return f"hl-{uuid.uuid4().hex[:12]}"


def generate_bookmark_id():
    return f"bmk-{uuid.uuid4().hex[:12]}"


def generate_flashcard_id():
    return f"card-{uuid.uuid4().hex[:12]}"


class Ebook(models.Model):
    DIFFICULTY_CHOICES = [
        ("Beginner", "Beginner"),
        ("Intermediate", "Intermediate"),
        ("Advanced", "Advanced"),
    ]

    id = models.CharField(max_length=64, primary_key=True, default=generate_ebook_id)
    title = models.CharField(max_length=255, db_index=True)
    slug = models.SlugField(max_length=255, unique=True, db_index=True)
    author = models.CharField(max_length=255)
    cover_url = models.URLField(max_length=1024, blank=True, null=True)
    description = models.TextField()
    category = models.CharField(max_length=100, db_index=True, default="Computer Science")
    difficulty = models.CharField(max_length=32, choices=DIFFICULTY_CHOICES, default="Intermediate")
    total_chapters = models.PositiveIntegerField(default=1)
    estimated_reading_time_mins = models.PositiveIntegerField(default=60)
    rating = models.FloatField(default=5.0)
    review_count = models.PositiveIntegerField(default=0)
    file_size_bytes = models.BigIntegerField(default=0)
    tags = models.JSONField(default=list, blank=True)
    file = models.FileField(upload_to="ebooks/", blank=True, null=True)
    published_at = models.DateTimeField(auto_now_add=True)
    is_published = models.BooleanField(default=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "ebooks_ebook"
        ordering = ["-rating", "-created_at"]
        verbose_name = "Ebook"
        verbose_name_plural = "Ebooks"

    def __str__(self):
        return self.title


class EbookChapter(models.Model):
    id = models.CharField(max_length=64, primary_key=True, default=generate_chapter_id)
    ebook = models.ForeignKey(Ebook, on_delete=models.CASCADE, related_name="chapters")
    title = models.CharField(max_length=255)
    order = models.PositiveIntegerField(default=1, db_index=True)
    estimated_read_time_mins = models.PositiveIntegerField(default=15)
    summary = models.TextField(blank=True, default="")
    key_takeaways = models.JSONField(default=list, blank=True)
    glossary = models.JSONField(default=list, blank=True)
    content_markdown = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "ebooks_chapter"
        ordering = ["ebook", "order"]
        unique_together = ("ebook", "order")
        verbose_name = "Ebook Chapter"
        verbose_name_plural = "Ebook Chapters"

    def __str__(self):
        return f"{self.ebook.title} - Chapter {self.order}: {self.title}"


class EbookHighlight(models.Model):
    id = models.CharField(max_length=64, primary_key=True, default=generate_highlight_id)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="ebook_highlights")
    ebook = models.ForeignKey(Ebook, on_delete=models.CASCADE, related_name="highlights")
    chapter = models.ForeignKey(EbookChapter, on_delete=models.CASCADE, related_name="highlights")
    text = models.TextField()
    color = models.CharField(max_length=32, default="#ffeb3b")
    note = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "ebooks_highlight"
        ordering = ["-created_at"]
        verbose_name = "Ebook Highlight"
        verbose_name_plural = "Ebook Highlights"

    def __str__(self):
        return f"Highlight by {self.user} on {self.ebook}"


class EbookBookmark(models.Model):
    id = models.CharField(max_length=64, primary_key=True, default=generate_bookmark_id)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="ebook_bookmarks")
    ebook = models.ForeignKey(Ebook, on_delete=models.CASCADE, related_name="bookmarks")
    chapter = models.ForeignKey(EbookChapter, on_delete=models.CASCADE, related_name="bookmarks")
    position = models.PositiveIntegerField(default=0)
    title = models.CharField(max_length=255, blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "ebooks_bookmark"
        ordering = ["-created_at"]
        unique_together = ("user", "ebook", "chapter", "position")
        verbose_name = "Ebook Bookmark"
        verbose_name_plural = "Ebook Bookmarks"

    def __str__(self):
        return f"Bookmark by {self.user} on {self.ebook.title}"


class EbookReadingProgress(models.Model):
    id = models.CharField(max_length=64, primary_key=True, default=lambda: f"prog-{uuid.uuid4().hex[:12]}")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="ebook_progress")
    ebook = models.ForeignKey(Ebook, on_delete=models.CASCADE, related_name="user_progress")
    current_chapter = models.ForeignKey(EbookChapter, on_delete=models.SET_NULL, null=True, blank=True)
    progress_percentage = models.FloatField(default=0.0)
    time_spent_seconds = models.PositiveIntegerField(default=0)
    is_completed = models.BooleanField(default=False)
    last_read_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "ebooks_progress"
        unique_together = ("user", "ebook")
        verbose_name = "Ebook Reading Progress"
        verbose_name_plural = "Ebook Reading Progress Records"

    def __str__(self):
        return f"{self.user} - {self.ebook.title} ({self.progress_percentage:.1f}%)"


class EbookFlashcard(models.Model):
    id = models.CharField(max_length=64, primary_key=True, default=generate_flashcard_id)
    ebook = models.ForeignKey(Ebook, on_delete=models.CASCADE, related_name="flashcards")
    chapter = models.ForeignKey(EbookChapter, on_delete=models.CASCADE, related_name="flashcards")
    front = models.TextField()
    back = models.TextField()
    explanation = models.TextField(blank=True, default="")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "ebooks_flashcard"
        verbose_name = "Ebook Flashcard"
        verbose_name_plural = "Ebook Flashcards"

    def __str__(self):
        return f"Flashcard: {self.front[:40]}..."

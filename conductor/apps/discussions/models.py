from django.db import models
from django.conf import settings
from apps.core.models import BaseModel

try:
    from django.contrib.postgres.indexes import GinIndex
except ImportError:
    GinIndex = None  # Not available without PostgreSQL


class DiscussionThread(BaseModel):
    """Discussion thread for course Q&A."""
    
    course = models.ForeignKey(
        'courses.Course',
        on_delete=models.CASCADE,
        related_name='discussion_threads'
    )
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='discussion_threads'
    )
    title = models.CharField(max_length=255)
    content = models.TextField()
    is_pinned = models.BooleanField(default=False)
    is_resolved = models.BooleanField(default=False)
    views = models.PositiveIntegerField(default=0)
    like_count = models.PositiveIntegerField(default=0)
    ai_summary = models.TextField(blank=True, help_text="AI-generated summary of the discussion")
    
    class Meta:
        ordering = ['-is_pinned', '-created_at']
        indexes = [
            models.Index(fields=['course', '-created_at']),
            models.Index(fields=['author', '-created_at']),
            # Performance indexes
            models.Index(fields=['is_pinned', '-created_at'], name='idx_thread_pinned'),  # Pinned threads
            models.Index(fields=['is_resolved', '-created_at'], name='idx_thread_resolved'),  # Filter by resolved
            models.Index(fields=['-like_count'], name='idx_thread_likes'),  # Popular threads
            models.Index(fields=['-views'], name='idx_thread_views'),  # Most viewed
            models.Index(fields=['course', 'is_resolved', '-created_at'], name='idx_thread_course_status'),  # Course + status
        ]
        # Note: Full-text search GIN index removed temporarily
        # See DATABASE_FULLTEXT_SEARCH_IMPLEMENTATION.md for proper implementation
    
    def __str__(self):
        return f"{self.title} - {self.author.email}"
    
    @property
    def reply_count(self):
        return self.replies.count()


class DiscussionReply(BaseModel):
    """Reply to a discussion thread."""
    
    thread = models.ForeignKey(
        DiscussionThread,
        on_delete=models.CASCADE,
        related_name='replies'
    )
    parent = models.ForeignKey(
        'self',
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name='nested_replies',
        help_text="Parent reply for nested threaded discussions."
    )
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='discussion_replies'
    )
    content = models.TextField()
    is_accepted_answer = models.BooleanField(default=False)
    like_count = models.PositiveIntegerField(default=0)
    
    class Meta:
        ordering = ['-is_accepted_answer', 'created_at']
        indexes = [
            models.Index(fields=['thread', '-created_at']),
            # Performance indexes
            models.Index(fields=['author', '-created_at'], name='idx_reply_author'),  # User replies
            models.Index(fields=['thread', 'is_accepted_answer'], name='idx_reply_accepted'),  # Accepted answers
            models.Index(fields=['parent', 'created_at'], name='idx_reply_nested'),  # Nested replies
            models.Index(fields=['-like_count'], name='idx_reply_likes'),  # Popular replies
        ]
    
    def __str__(self):
        return f"Reply by {self.author.email} on {self.thread.title}"
    
    @property
    def is_instructor_reply(self):
        """Check if reply is from course instructor."""
        return self.thread.course.instructor == self.author


class ThreadTag(BaseModel):
    """Tags for discussion threads."""
    
    name = models.CharField(max_length=50, unique=True)
    threads = models.ManyToManyField(
        DiscussionThread,
        related_name='tags',
        blank=True
    )
    
    class Meta:
        indexes = [
            models.Index(fields=['name'], name='idx_tag_name'),  # Tag lookup
        ]
    
    def __str__(self):
        return self.name


class DiscussionVote(BaseModel):
    """Upvotes/Downvotes for threads and replies."""
    
    VOTE_TYPES = (
        (1, 'Upvote'),
        (-1, 'Downvote'),
    )
    
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    
    # Generic Relation to support both Thread and Reply voting
    from django.contrib.contenttypes.fields import GenericForeignKey
    from django.contrib.contenttypes.models import ContentType
    
    content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE)
    object_id = models.CharField(max_length=36, )
    content_object = GenericForeignKey('content_type', 'object_id')
    
    value = models.SmallIntegerField(choices=VOTE_TYPES)
    
    class Meta:
        unique_together = ['user', 'content_type', 'object_id']
        indexes = [
            models.Index(fields=['user', 'content_type', 'object_id']),
        ]

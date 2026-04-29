"""AI Engine models for Research Quizzes and Progress."""

from django.conf import settings
from django.db import models
from django.utils import timezone
from django.contrib.contenttypes.models import ContentType
from django.contrib.contenttypes.fields import GenericForeignKey
from apps.users.models import User
from apps.core.models import BaseModel


class ResearchQuiz(BaseModel):
    """Quiz associated with a research module."""
    module_slug = models.CharField(max_length=100, unique=True)
    title = models.CharField(max_length=200)
    xp_reward = models.PositiveIntegerField(default=50)

    class Meta:
        db_table = "research_quizzes"
        verbose_name_plural = "Research Quizzes"

    def __str__(self):
        return self.title


class QuizQuestion(BaseModel):
    """Question within a research quiz."""
    quiz = models.ForeignKey(ResearchQuiz, related_name='questions', on_delete=models.CASCADE)
    text = models.TextField()
    order = models.PositiveIntegerField(default=0)

    class Meta:
        db_table = "research_quiz_questions"
        ordering = ["order"]

    def __str__(self):
        return f"{self.quiz.title} - Question {self.order}"


class QuizChoice(BaseModel):
    """Choices for a quiz question."""
    question = models.ForeignKey(QuizQuestion, related_name='choices', on_delete=models.CASCADE)
    text = models.CharField(max_length=255)
    is_correct = models.BooleanField(default=False)

    class Meta:
        db_table = "quiz_choices"

    def __str__(self):
        return self.text


class ModuleProgress(BaseModel):
    """User progress tracking for research modules."""
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="module_progress")
    module_slug = models.CharField(max_length=100)
    is_completed = models.BooleanField(default=False)
    quiz_passed = models.BooleanField(default=False)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "module_progress"
        unique_together = ["user", "module_slug"]

    def __str__(self):
        return f"{self.user.email} - {self.module_slug}"


# from pgvector.django import VectorField

from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.contenttypes.models import ContentType


class CourseEmbedding(BaseModel):
    """
    Stores vector embeddings for course content (Lessons, PDFs).
    High-dimensional vectors allow semantic search (RAG).
    """
    # Link to any content (Video, Article, etc.)
    content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE)
    object_id = models.PositiveIntegerField()
    content_object = GenericForeignKey('content_type', 'object_id')

    # The actual text chunk used to generate the embedding
    chunk_text = models.TextField(help_text="Text segment used for embedding")

    # Vector Field (Dimension 768 for models/text-embedding-004)
    # Note: Requires 'pgvector' extension in PostgreSQL
    # Vector Field (Dimension 768 for models/text-embedding-004)
    # Note: Requires 'pgvector' extension in PostgreSQL
    try:
        from pgvector.django import VectorField
        embedding = VectorField(dimensions=384, help_text="Semantic Vector")
    except ImportError:
        embedding = models.TextField(help_text="Vector embedding (simulated for dev)")


    class Meta:
        db_table = "course_embeddings"
        indexes = [
            # Ivfflat index for speed (optional, good for large datasets)
            # Index(name='embedding_index', fields=['embedding'], opclasses=['vector_l2_ops'])
        ]

    def __str__(self):
        return f"Embedding {self.id} for {self.content_object}"


class ActivityLog(BaseModel):
    """
    Tracks all user activities for intelligent analytics.
    This is the foundation for engagement scoring and AI predictions.
    """
    class ActionType(models.TextChoices):
        LESSON_VIEW = 'lesson_view', 'Lesson Viewed'
        LESSON_COMPLETE = 'lesson_complete', 'Lesson Completed'
        QUIZ_START = 'quiz_start', 'Quiz Started'
        QUIZ_COMPLETE = 'quiz_complete', 'Quiz Completed'
        CODE_SUBMIT = 'code_submit', 'Code Submitted'
        CODE_RUN = 'code_run', 'Code Run'
        AI_QUESTION = 'ai_question', 'AI Question Asked'
        SEARCH = 'search', 'Search Performed'
        NOTE_CREATE = 'note_create', 'Note Created'
        BOOKMARK = 'bookmark', 'Bookmark Added'
        SESSION_START = 'session_start', 'Session Started'
        SESSION_END = 'session_end', 'Session Ended'

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='activity_logs')
    action = models.CharField(max_length=50, choices=ActionType.choices)
    
    # Generic relation to any content
    content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE, null=True, blank=True)
    object_id = models.PositiveIntegerField(null=True, blank=True)
    content_object = GenericForeignKey('content_type', 'object_id')
    
    # Session tracking
    session_id = models.CharField(max_length=64, blank=True, help_text="Browser/App session ID")
    duration_seconds = models.PositiveIntegerField(default=0, help_text="Time spent on activity")
    
    # Context data
    metadata = models.JSONField(default=dict, blank=True, help_text="Additional context")
    device_type = models.CharField(max_length=20, blank=True)  # mobile, desktop, tablet
    
    class Meta:
        db_table = "activity_logs"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=['user', 'action', 'created_at']),
            models.Index(fields=['session_id']),
        ]

    def __str__(self):
        return f"{self.user.username} - {self.action} @ {self.created_at}"


class LearningInsight(BaseModel):
    """
    AI-generated insights about user learning patterns.
    Updated daily by background Celery tasks.
    """
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='learning_insight')
    
    # Engagement Metrics (0.0 to 1.0 scale)
    engagement_score = models.FloatField(default=0.0, help_text="Overall engagement level")
    consistency_score = models.FloatField(default=0.0, help_text="How regularly user studies")
    completion_rate = models.FloatField(default=0.0, help_text="Lessons completed vs started")
    
    # Learning Style
    preferred_time = models.CharField(max_length=20, blank=True, help_text="morning/afternoon/evening/night")
    preferred_duration = models.PositiveIntegerField(default=30, help_text="Avg session length in minutes")
    learning_velocity = models.FloatField(default=1.0, help_text="Speed relative to average")
    
    # AI Predictions
    predicted_topics = models.JSONField(default=list, help_text="Topics user might enjoy")
    strength_areas = models.JSONField(default=list, help_text="User's strong subjects")
    improvement_areas = models.JSONField(default=list, help_text="Areas needing work")
    burnout_risk = models.FloatField(default=0.0, help_text="Risk of user disengaging")
    ai_narrative = models.TextField(default='', blank=True, help_text="AI-generated summary of learning patterns")
    
    # Statistics
    total_learning_hours = models.FloatField(default=0.0)
    weekly_average_hours = models.FloatField(default=0.0)
    last_analyzed_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = "learning_insights"

    def __str__(self):
        return f"Insights for {self.user.username}"


class UserBehavior(BaseModel):
    """
    Tracks detailed user behavior for AI-powered recommendations.
    Captures course views, searches, clicks, time spent, etc.
    """
    class BehaviorType(models.TextChoices):
        COURSE_VIEW = 'course_view', 'Course Viewed'
        COURSE_CLICK = 'course_click', 'Course Clicked'
        SEARCH = 'search', 'Search Performed'
        CATEGORY_FILTER = 'category_filter', 'Category Filtered'
        DIFFICULTY_FILTER = 'difficulty_filter', 'Difficulty Filtered'
        PRICE_FILTER = 'price_filter', 'Price Filtered'
        ENROLL = 'enroll', 'Course Enrolled'
        WISHLIST = 'wishlist', 'Added to Wishlist'
        REVIEW_VIEW = 'review_view', 'Reviews Viewed'
        INSTRUCTOR_VIEW = 'instructor_view', 'Instructor Profile Viewed'
        TIME_SPENT = 'time_spent', 'Time Spent on Page'
        
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='behavior_logs')
    behavior_type = models.CharField(max_length=50, choices=BehaviorType.choices)
    
    # Related course (if applicable)
    course = models.ForeignKey('courses.Course', on_delete=models.CASCADE, null=True, blank=True)
    
    # Search query or filter value
    value = models.CharField(max_length=255, blank=True, help_text="Search query or filter value")
    
    # Engagement metrics
    duration_seconds = models.PositiveIntegerField(default=0, help_text="Time spent on action")
    
    # Context
    source_page = models.CharField(max_length=100, blank=True, help_text="Page where action originated")
    device_type = models.CharField(max_length=20, blank=True)
    metadata = models.JSONField(default=dict, blank=True)
    
    class Meta:
        db_table = "user_behaviors"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=['user', 'behavior_type', 'created_at']),
            models.Index(fields=['course', 'behavior_type']),
        ]
        
    def __str__(self):
        return f"{self.user.username} - {self.behavior_type}"


class Challenge(BaseModel):
    """
    Gamification 2.0: Time-limited challenges for user engagement.
    """
    class ChallengeType(models.TextChoices):
        DAILY = 'daily', 'Daily Quest'
        WEEKLY = 'weekly', 'Weekly Challenge'
        MONTHLY = 'monthly', 'Monthly Challenge'
        EVENT = 'event', 'Special Event'
        LEARNING = 'learning', 'Learning Sprint'

    class Difficulty(models.TextChoices):
        EASY = 'easy', 'Easy'
        MEDIUM = 'medium', 'Medium'
        HARD = 'hard', 'Hard'
        LEGENDARY = 'legendary', 'Legendary'

    title = models.CharField(max_length=200)
    description = models.TextField()
    challenge_type = models.CharField(max_length=20, choices=ChallengeType.choices)
    difficulty = models.CharField(max_length=20, choices=Difficulty.choices, default=Difficulty.MEDIUM)
    
    # Rewards
    xp_reward = models.PositiveIntegerField(default=100)
    badge_reward = models.ForeignKey(
        'gamification.Badge', on_delete=models.SET_NULL, 
        null=True, blank=True, related_name='challenges'
    )
    
    # Requirements (JSON for flexibility)
    requirements = models.JSONField(default=dict, help_text="""
        Example: {"action": "lesson_complete", "count": 5, "course_id": null}
    """)
    
    # Timing
    starts_at = models.DateTimeField()
    ends_at = models.DateTimeField()
    is_active = models.BooleanField(default=True)
    
    # Stats
    participant_count = models.PositiveIntegerField(default=0)
    completion_count = models.PositiveIntegerField(default=0)
    
    class Meta:
        db_table = "challenges"
        ordering = ["-starts_at"]

    def __str__(self):
        return f"{self.title} ({self.challenge_type})"

    @property
    def completion_percentage(self):
        if self.participant_count == 0:
            return 0
        return round((self.completion_count / self.participant_count) * 100, 1)


class ChallengeParticipant(BaseModel):
    """Tracks user participation and progress in challenges."""
    challenge = models.ForeignKey(Challenge, on_delete=models.CASCADE, related_name='participants')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='challenge_participations')
    
    progress = models.PositiveIntegerField(default=0, help_text="Current progress count")
    is_completed = models.BooleanField(default=False)
    completed_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = "challenge_participants"
        unique_together = ['challenge', 'user']

    def __str__(self):
        return f"{self.user.username} in {self.challenge.title}"


class LearningSchedule(BaseModel):
    """
    AI-generated weekly study plan.
    """
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='schedules')
    week_start_date = models.DateField()
    
    # JSON Structure:
    # {
    #   "Monday": [{"task": "Intro to Python", "duration": 30, "type": "video/quiz"}],
    #   "Tuesday": ...
    # }
    days_json = models.JSONField(default=dict)
    
    goal = models.CharField(max_length=255, help_text="Goal for this week")
    is_active = models.BooleanField(default=True)
    
    class Meta:
        db_table = "learning_schedules"
        unique_together = ['user', 'week_start_date']
        ordering = ['-week_start_date']

    def __str__(self):
        return f"Schedule for {self.user.username} ({self.week_start_date})"


class RemedialPlan(BaseModel):
    """
    AI-generated remediation plan for failed modules.
    """
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    module_slug = models.CharField(max_length=100)
    
    # Analysis of why they failed
    root_cause_analysis = models.TextField(help_text="AI Analysis of weak areas")
    
    # List of suggested resources/actions
    # [{"topic": "Recursion", "action": "Review Video 2", "priority": "High"}]
    suggested_actions = models.JSONField(default=list)
    
    is_resolved = models.BooleanField(default=False)
    
    class Meta:
        db_table = "remedial_plans"
        ordering = ["-created_at"]

    def __str__(self):
        return f"Remediation for {self.user.username} - {self.module_slug}"


class HumanPreference(BaseModel):
    """
    Phase 53: RLHF & Direct Preference Optimization (DPO) Dataset.
    Stores explicit human feedback (thumbs up/down) comparing two AI generations.
    A Celery task consumes these records to mathematically shift the embedding policy 
    closer to the 'chosen' outputs and further from 'rejected' outputs (DPO).
    """
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="ai_preferences")
    prompt = models.TextField(help_text="The context or question posed to the AI")
    chosen = models.TextField(help_text="The AI generation that the user preferred (Thumbs Up)")
    rejected = models.TextField(help_text="The AI generation that the user rejected (Thumbs Down)")
    
    # Optional metadata like the specific AI model version used, latency, etc.
    metadata = models.JSONField(default=dict, blank=True)
    
    # Tracks if this specific preference pair has already been consumed by the DPO training loop
    applied_to_dpo = models.BooleanField(default=False)

    class Meta:
        db_table = "ai_human_preferences"
        ordering = ["-created_at"]

    def __str__(self):
        return f"Preference ID:{self.id} User:{self.user.username} (Applied:{self.applied_to_dpo})"


class SemanticCache(BaseModel):
    """
    Enterprise ML: Semantic Caching Layer.
    Stores previous LLM queries and their responses along with the query's vector embedding.
    Before hitting the expensive LLM API, we check if a semantically similar query (>0.98 cosine similarity) exists.
    If so, we return the cached response instantly, saving token costs and dropping response time to ~50ms.
    """
    query_text = models.TextField(help_text="The exact prompt or query asked by the user")
    response_payload = models.JSONField(help_text="The structured JSON or text response from the LLM")
    
    # Storing the vector of the query_text
    try:
        from pgvector.django import VectorField
        query_embedding = VectorField(dimensions=384, help_text="Semantic Vector of the query")
    except ImportError:
        query_embedding = models.TextField(help_text="Vector embedding (simulated for dev)")

    class Meta:
        db_table = "semantic_cache"

    def __str__(self):
        return f"Cache {self.id} - {self.query_text[:30]}..."

class UserProfile(BaseModel):
    """
    Enhanced user profile for AI-driven personalization.
    """
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='ai_profile')
    lessons_completed = models.PositiveIntegerField(default=0)
    quizzes_passed = models.PositiveIntegerField(default=0)
    courses_enrolled = models.PositiveIntegerField(default=0)
    average_quiz_score = models.FloatField(default=0.0)
    
    courses_interacted = models.ManyToManyField('courses.Course', blank=True, related_name='interested_users')
    
    # Personalization traits
    learning_style = models.CharField(max_length=20, default='visual')
    learning_velocity = models.CharField(max_length=20, default='normal')
    engagement_score = models.FloatField(default=0.5)
    
    class Meta:
        db_table = "ai_user_profiles"

    def __str__(self):
        return f"Profile: {self.user.username}"


class UserEngagement(BaseModel):
    """
    Daily engagement metrics for users.
    """
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='daily_engagement')
    date = models.DateField(default=timezone.now)
    total_actions = models.PositiveIntegerField(default=0)
    learning_actions = models.PositiveIntegerField(default=0)
    social_actions = models.PositiveIntegerField(default=0)
    last_activity = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = "ai_user_engagement"
        unique_together = ('user', 'date')

    def __str__(self):
        return f"{self.user.username} Engagement on {self.date}"


class UserPreferences(BaseModel):
    """
    User-specific preferences for AI content generation and adaptation.
    """
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='ai_preferences_data')
    preferred_difficulty = models.CharField(max_length=20, default='intermediate')
    preferred_format = models.CharField(max_length=20, default='video')
    preferred_duration = models.PositiveIntegerField(default=30)
    preferred_categories = models.ManyToManyField('courses.Category', blank=True)
    
    # Adaptation settings
    adaptation_frequency = models.CharField(max_length=20, default='moderate')
    difficulty_adjustment = models.CharField(max_length=20, default='gradual')
    
    class Meta:
        db_table = "ai_user_preferences"

    def __str__(self):
        return f"Preferences: {self.user.username}"

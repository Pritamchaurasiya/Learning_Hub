"""
Exam taxonomy models: Country → Exam → Subject → Topic hierarchy.
Foundation for AI-powered global test generation.
"""
import uuid
from django.db import models
from django.utils import timezone


class Country(models.Model):
    """Country/region for exam classification."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    code = models.CharField(max_length=3, unique=True, db_index=True)  # US, IN, UK, AU, CA
    name = models.CharField(max_length=100)
    timezone = models.CharField(max_length=50, default='UTC')
    currency = models.CharField(max_length=3, default='USD')
    language = models.CharField(max_length=5, default='en')
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'exam_countries'
        ordering = ['name']
        verbose_name_plural = 'Countries'

    def __str__(self):
        return f"{self.name} ({self.code})"

    @property
    def active_exam_count(self):
        return self.exams.filter(is_active=True).count()


class Exam(models.Model):
    """
    Exam definition with pattern configuration.
    Examples: SAT, JEE Main, UPSC CSE, GRE, GMAT, NEET, GATE
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    country = models.ForeignKey(Country, on_delete=models.CASCADE, related_name='exams')
    code = models.CharField(max_length=30, unique=True, db_index=True)
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    full_name = models.CharField(max_length=300, blank=True)

    # Exam pattern configuration (JSON for flexibility)
    # Structure: {
    #   "sections": [{"name": "Quant", "questions": 30, "marks_each": 4}, ...],
    #   "total_questions": 100,
    #   "total_marks": 400,
    #   "duration_minutes": 180,
    #   "marks_per_correct": 4,
    #   "negative_marks_per_wrong": 1,
    #   "marks_per_unattempted": 0,
    #   "question_types": ["mcq", "numerical"],
    # }
    pattern = models.JSONField(default=dict, help_text="Exam pattern: sections, marks, timing")

    # Difficulty distribution for AI generation
    # Structure: {"easy": 0.3, "medium": 0.5, "hard": 0.2}
    difficulty_distribution = models.JSONField(
        default=dict,
        help_text="Target difficulty distribution for generated tests"
    )

    # Metadata
    official_website = models.URLField(blank=True)
    conducting_body = models.CharField(max_length=200, blank=True)
    frequency = models.CharField(max_length=20, default='annual')  # annual, biannual, monthly
    next_exam_date = models.DateField(null=True, blank=True)

    # Status
    is_active = models.BooleanField(default=True, db_index=True)
    is_featured = models.BooleanField(default=False)
    popularity_score = models.IntegerField(default=0)

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'exams'
        ordering = ['-popularity_score', 'name']
        indexes = [
            models.Index(fields=['country', 'is_active']),
            models.Index(fields=['is_active', 'is_featured']),
            models.Index(fields=['code']),
        ]

    def __str__(self):
        return f"{self.name} ({self.code})"

    @property
    def total_questions(self):
        return self.pattern.get('total_questions', 0)

    @property
    def total_marks(self):
        return self.pattern.get('total_marks', 0)

    @property
    def duration_minutes(self):
        return self.pattern.get('duration_minutes', 0)

    @property
    def has_negative_marking(self):
        return self.pattern.get('negative_marks_per_wrong', 0) > 0

    @property
    def subject_count(self):
        return self.subjects.filter(is_active=True).count()


class Subject(models.Model):
    """Subject within an exam. Examples: Mathematics, Physics, General Studies."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    exam = models.ForeignKey(Exam, on_delete=models.CASCADE, related_name='subjects')
    code = models.CharField(max_length=20)
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)

    # Weightage in exam (percentage)
    weightage = models.FloatField(default=0, help_text="Percentage weight in exam (0-100)")

    # Question count distribution
    expected_questions = models.IntegerField(default=0, help_text="Expected questions in exam")

    # Status
    is_active = models.BooleanField(default=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'exam_subjects'
        ordering = ['exam', 'name']
        unique_together = ['exam', 'code']
        indexes = [
            models.Index(fields=['exam', 'is_active']),
        ]

    def __str__(self):
        return f"{self.exam.code} - {self.name}"

    @property
    def topic_count(self):
        return self.topics.filter(is_active=True).count()


class Topic(models.Model):
    """
    Topic within a subject. Supports hierarchical structure.
    Examples: Algebra → Quadratic Equations → Discriminant
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE, related_name='topics')
    parent = models.ForeignKey('self', on_delete=models.CASCADE, null=True, blank=True, related_name='children')
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)

    # Difficulty trend data (for AI generation)
    # Structure: {"avg_difficulty": 0.65, "trend": "increasing", "historical_data": [...]}
    difficulty_trend = models.JSONField(default=dict, blank=True)

    # Question bank stats
    question_count = models.IntegerField(default=0)
    avg_difficulty = models.FloatField(default=0.5, help_text="Average difficulty of questions (0-1)")

    # Status
    is_active = models.BooleanField(default=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'exam_topics'
        ordering = ['subject', 'name']
        indexes = [
            models.Index(fields=['subject', 'is_active']),
            models.Index(fields=['parent']),
        ]

    def __str__(self):
        parent_str = f" > {self.parent.name}" if self.parent else ""
        return f"{self.subject.name}{parent_str} - {self.name}"

    @property
    def full_path(self):
        """Get full topic path: Subject > Parent > Topic."""
        parts = [self.subject.name]
        current = self
        path = []
        while current:
            path.append(current.name)
            current = current.parent
        return ' > '.join(reversed(path))

    def increment_question_count(self):
        """Increment question count and update parent counts atomically."""
        from django.db.models import F
        
        # Use F() expression to prevent race conditions
        Topic.objects.filter(id=self.id).update(question_count=F('question_count') + 1)
        
        # Update parent recursively
        if self.parent_id:
            Topic.objects.filter(id=self.parent_id).update(question_count=F('question_count') + 1)

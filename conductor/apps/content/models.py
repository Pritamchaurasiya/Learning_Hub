from django.db import models
from apps.courses.models import Course
from apps.users.models import User
from core.models import BaseModel
from core.mixins import OrderMixin


class Lesson(BaseModel, OrderMixin):
    """Individual lesson within a course."""

    class ContentType(models.TextChoices):
        VIDEO = "video", "Video"
        TEXT = "text", "Text Article"
        PDF = "pdf", "PDF Document"
        QUIZ = "quiz", "Quiz"

    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name="lessons")
    title = models.CharField(max_length=200)
    content_type = models.CharField(max_length=20, choices=ContentType.choices)

    # Content based on type
    video_url = models.URLField(blank=True)
    video_duration = models.PositiveIntegerField(default=0)  # seconds
    text_content = models.TextField(blank=True)  # Markdown
    pdf_file = models.FileField(upload_to="lessons/pdfs/", blank=True)

    is_preview = models.BooleanField(default=False)  # Free preview
    is_published = models.BooleanField(default=True)

    class Meta:
        db_table = "lessons"
        ordering = ["order"]
        unique_together = ["course", "order"]

    def __str__(self):
        return f"{self.course.title} - {self.title}"


class LessonProgress(BaseModel):
    """Track user progress on lessons."""

    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="lesson_progress"
    )
    lesson = models.ForeignKey(
        Lesson, on_delete=models.CASCADE, related_name="progress"
    )

    is_completed = models.BooleanField(default=False)
    watch_time = models.PositiveIntegerField(default=0)  # seconds
    last_position = models.PositiveIntegerField(default=0)  # seconds
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "lesson_progress"
        unique_together = ["user", "lesson"]


class Quiz(BaseModel):
    """Quiz attached to a lesson."""

    lesson = models.OneToOneField(Lesson, on_delete=models.CASCADE, related_name="quiz")
    title = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    passing_score = models.PositiveIntegerField(default=70)  # percentage
    time_limit = models.PositiveIntegerField(null=True)  # minutes

    class Meta:
        db_table = "quizzes"

    def __str__(self):
        return self.title


class Question(BaseModel, OrderMixin):
    """Quiz question."""

    class QuestionType(models.TextChoices):
        MCQ = "mcq", "Multiple Choice"
        TRUE_FALSE = "true_false", "True/False"

    quiz = models.ForeignKey(Quiz, on_delete=models.CASCADE, related_name="questions")
    text = models.TextField()
    question_type = models.CharField(
        max_length=20, choices=QuestionType.choices, default=QuestionType.MCQ
    )
    options = models.JSONField(default=list)  # ["A", "B", "C", "D"]
    correct_answer = models.JSONField()  # Index for MCQ, bool for T/F
    explanation = models.TextField(blank=True)
    points = models.PositiveIntegerField(default=1)

    class Meta:
        db_table = "questions"
        ordering = ["order"]


class QuizAttempt(BaseModel):
    """User's quiz attempt."""

    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="quiz_attempts"
    )
    quiz = models.ForeignKey(Quiz, on_delete=models.CASCADE, related_name="attempts")

    score = models.PositiveIntegerField(default=0)
    total_points = models.PositiveIntegerField(default=0)
    passed = models.BooleanField(default=False)
    answers = models.JSONField(default=dict)  # {question_id: answer}
    time_taken = models.PositiveIntegerField(default=0)  # seconds

    class Meta:
        db_table = "quiz_attempts"
        ordering = ["-created_at"]

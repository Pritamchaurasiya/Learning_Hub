"""Content admin."""

from django.contrib import admin
from .models import Lesson, Quiz, Question, QuizAttempt


@admin.register(Lesson)
class LessonAdmin(admin.ModelAdmin):
    list_display = [
        "title",
        "course",
        "content_type",
        "order",
        "is_preview",
        "is_published",
    ]
    list_filter = ["content_type", "is_preview", "is_published"]
    search_fields = ["title", "course__title"]


@admin.register(Quiz)
class QuizAdmin(admin.ModelAdmin):
    list_display = ["title", "lesson", "passing_score", "time_limit"]


@admin.register(Question)
class QuestionAdmin(admin.ModelAdmin):
    list_display = ["text", "quiz", "question_type", "points", "order"]


@admin.register(QuizAttempt)
class QuizAttemptAdmin(admin.ModelAdmin):
    list_display = ["user", "quiz", "score", "passed", "created_at"]

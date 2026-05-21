"""
Quiz admin configuration.
"""

from django.contrib import admin
from .models import Quiz, Question, Option, QuizAttempt, QuizAnswer


class OptionInline(admin.TabularInline):
    """Inline admin for options."""

    model = Option
    extra = 4


class QuestionInline(admin.TabularInline):
    """Inline admin for questions."""

    model = Question
    extra = 5
    show_change_link = True


class QuizAnswerInline(admin.TabularInline):
    """Inline admin for quiz answers."""

    model = QuizAnswer
    extra = 0
    readonly_fields = [
        "question",
        "selected_option",
        "text_answer",
        "is_correct",
        "marks_obtained",
    ]


@admin.register(Quiz)
class QuizAdmin(admin.ModelAdmin):
    """Admin for Quiz model."""

    list_display = [
        "title",
        "course",
        "time_limit_minutes",
        "passing_score",
        "is_published",
        "created_at",
    ]
    list_filter = ["is_published", "created_at", "course"]
    search_fields = ["title", "description"]
    inlines = [QuestionInline]
    date_hierarchy = "created_at"


@admin.register(Question)
class QuestionAdmin(admin.ModelAdmin):
    """Admin for Question model."""

    list_display = ["text_preview", "quiz", "question_type", "marks", "order"]
    list_filter = ["question_type", "quiz"]
    search_fields = ["text"]
    inlines = [OptionInline]

    def text_preview(self, obj):
        return obj.text[:50] + "..." if len(obj.text) > 50 else obj.text

    text_preview.short_description = "Question"


@admin.register(Option)
class OptionAdmin(admin.ModelAdmin):
    """Admin for Option model."""

    list_display = ["text", "question", "is_correct", "order"]
    list_filter = ["is_correct"]
    search_fields = ["text", "question__text"]


@admin.register(QuizAttempt)
class QuizAttemptAdmin(admin.ModelAdmin):
    """Admin for QuizAttempt model."""

    list_display = [
        "user",
        "quiz",
        "status",
        "score",
        "percentage_score",
        "attempt_number",
        "started_at",
    ]
    list_filter = ["status", "started_at"]
    search_fields = ["user__username", "quiz__title"]
    inlines = [QuizAnswerInline]
    readonly_fields = ["score", "max_score", "percentage_score", "time_taken_seconds"]


@admin.register(QuizAnswer)
class QuizAnswerAdmin(admin.ModelAdmin):
    """Admin for QuizAnswer model."""

    list_display = ["attempt", "question_preview", "is_correct", "marks_obtained"]
    list_filter = ["is_correct"]
    readonly_fields = [
        "attempt",
        "question",
        "selected_option",
        "text_answer",
        "is_correct",
        "marks_obtained",
    ]

    def question_preview(self, obj):
        return (
            obj.question.text[:50] + "..."
            if len(obj.question.text) > 50
            else obj.question.text
        )

    question_preview.short_description = "Question"

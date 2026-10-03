"""
Test A+ Supreme Assessment Engine administration for learninghub/django_backend.
"""

from django.contrib import admin
from .models import (
    AttemptAnswer,
    Option,
    Question,
    QuestionBookmark,
    SpacedRepetitionCard,
    Test,
    TestAttempt,
    TestSection,
    TopicPerformance,
)


class OptionInline(admin.TabularInline):
    model = Option
    extra = 0
    fields = ("text", "is_correct", "order")


@admin.register(Question)
class QuestionAdmin(admin.ModelAdmin):
    list_display = ["prompt_short", "test", "section", "question_type", "difficulty", "marks", "negative_marks"]
    list_filter = ["question_type", "test", "topic"]
    search_fields = ["prompt", "topic"]
    list_select_related = ["test", "section"]
    autocomplete_fields = ["test", "section"]
    inlines = [OptionInline]

    def prompt_short(self, obj):
        return obj.prompt[:75] + "..." if len(obj.prompt) > 75 else obj.prompt
    prompt_short.short_description = "Prompt"


class TestSectionInline(admin.TabularInline):
    model = TestSection
    extra = 0
    fields = ("order", "title", "duration_minutes", "is_timed", "cut_off_marks")
    show_change_link = True


@admin.register(Test)
class TestAdmin(admin.ModelAdmin):
    list_display = ["title", "category", "duration_minutes", "total_marks", "is_adaptive", "is_published", "created_at"]
    list_filter = ["is_published", "is_adaptive", "category"]
    search_fields = ["title", "slug", "description"]
    prepopulated_fields = {"slug": ("title",)}
    inlines = [TestSectionInline]
    actions = ["publish_tests", "unpublish_tests"]

    @admin.action(description="Publish selected tests")
    def publish_tests(self, request, queryset):
        count = queryset.update(is_published=True)
        self.message_user(request, f"{count} tests published successfully.")

    @admin.action(description="Unpublish selected tests")
    def unpublish_tests(self, request, queryset):
        count = queryset.update(is_published=False)
        self.message_user(request, f"{count} tests unpublished.")


@admin.register(TestSection)
class TestSectionAdmin(admin.ModelAdmin):
    list_display = ["title", "test", "order", "duration_minutes", "is_timed"]
    list_filter = ["is_timed", "test"]
    search_fields = ["title", "test__title"]
    list_select_related = ["test"]
    autocomplete_fields = ["test"]


class AttemptAnswerInline(admin.TabularInline):
    model = AttemptAnswer
    extra = 0
    fields = ("question", "is_correct", "marks_awarded", "time_spent_sec")
    readonly_fields = ("question", "is_correct", "marks_awarded", "time_spent_sec")
    can_delete = False


@admin.register(TestAttempt)
class TestAttemptAdmin(admin.ModelAdmin):
    """Authoritative test attempt administration with protected scores."""

    list_display = ["user", "test", "attempt_number", "status", "score", "percentage", "passed", "started_at"]
    list_filter = ["status", "passed", "test"]
    search_fields = ["user__email", "test__title"]
    list_select_related = ["user", "test"]
    autocomplete_fields = ["user", "test"]
    readonly_fields = [
        "user",
        "test",
        "attempt_number",
        "status",
        "score",
        "percentage",
        "accuracy",
        "passed",
        "irt_ability_theta",
        "predicted_rank",
        "time_spent_seconds",
        "started_at",
        "submitted_at",
    ]
    inlines = [AttemptAnswerInline]


@admin.register(TopicPerformance)
class TopicPerformanceAdmin(admin.ModelAdmin):
    list_display = ["user", "topic", "accuracy", "correct_count", "total_count", "ability_theta"]
    search_fields = ["user__email", "topic"]
    list_select_related = ["user"]
    autocomplete_fields = ["user"]
    readonly_fields = ["user", "topic", "accuracy", "correct_count", "total_count", "ability_theta"]


@admin.register(QuestionBookmark)
class QuestionBookmarkAdmin(admin.ModelAdmin):
    list_display = ["user", "question", "created_at"]
    list_select_related = ["user", "question"]
    autocomplete_fields = ["user", "question"]


@admin.register(SpacedRepetitionCard)
class SpacedRepetitionCardAdmin(admin.ModelAdmin):
    list_display = [
        "id", "user", "card_type", "topic", "interval_days",
        "ease_factor", "repetitions", "lapses", "stability",
        "retention_display", "next_review_at"
    ]
    list_filter = ["card_type", "topic", "repetitions", "lapses"]
    search_fields = ["user__email", "front", "topic", "subject"]
    list_select_related = ["user", "question"]
    autocomplete_fields = ["user", "question"]
    readonly_fields = ["id", "created_at", "last_reviewed_at"]

    @admin.display(description="Retention %")
    def retention_display(self, obj):
        return f"{round(obj.retention_probability * 100, 1)}%"


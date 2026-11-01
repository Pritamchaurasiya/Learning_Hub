"""Admin configuration for exam taxonomy and Node parity models (PYQ, Formula, RevisionNote)."""

from django.contrib import admin
from .models import Country, Exam, Formula, PYQ, RevisionNote, Subject, Topic


@admin.register(Country)
class CountryAdmin(admin.ModelAdmin):
    list_display = (
        "code",
        "name",
        "timezone",
        "currency",
        "is_active",
        "active_exam_count",
    )
    list_filter = ("is_active",)
    search_fields = ("name", "code")


class SubjectInline(admin.TabularInline):
    model = Subject
    extra = 0
    fields = ("code", "name", "weightage", "expected_questions", "is_active")


@admin.register(Exam)
class ExamAdmin(admin.ModelAdmin):
    list_display = (
        "code",
        "name",
        "country",
        "is_active",
        "is_featured",
        "popularity_score",
        "subject_count",
    )
    list_filter = ("is_active", "is_featured", "country", "frequency")
    search_fields = ("name", "code", "full_name")
    list_select_related = ("country",)
    autocomplete_fields = ["country"]
    inlines = [SubjectInline]
    fieldsets = (
        (
            "Basic Info",
            {"fields": ("country", "code", "name", "full_name", "description")},
        ),
        ("Pattern", {"fields": ("pattern", "difficulty_distribution")}),
        (
            "Metadata",
            {
                "fields": (
                    "official_website",
                    "conducting_body",
                    "frequency",
                    "next_exam_date",
                )
            },
        ),
        ("Status", {"fields": ("is_active", "is_featured", "popularity_score")}),
    )


class TopicInline(admin.TabularInline):
    model = Topic
    extra = 0
    fields = ("name", "parent", "question_count", "avg_difficulty", "is_active")


@admin.register(Subject)
class SubjectAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "exam",
        "weightage",
        "expected_questions",
        "is_active",
        "topic_count",
    )
    list_filter = ("is_active", "exam")
    search_fields = ("name", "code")
    list_select_related = ("exam",)
    autocomplete_fields = ["exam"]
    inlines = [TopicInline]


@admin.register(Topic)
class TopicAdmin(admin.ModelAdmin):
    list_display = (
        "name",
        "subject",
        "parent",
        "question_count",
        "avg_difficulty",
        "is_active",
    )
    list_filter = ("is_active", "subject")
    search_fields = ("name", "description")
    list_select_related = ("subject", "parent")
    autocomplete_fields = ["subject", "parent"]


@admin.register(PYQ)
class PYQAdmin(admin.ModelAdmin):
    """Previous Year Questions admin."""

    list_display = ("exam", "subject", "topic", "year", "difficulty", "marks")
    list_filter = ("year", "difficulty", "exam")
    search_fields = ("question_text", "solution_text")
    list_select_related = ("exam", "subject", "topic")
    autocomplete_fields = ["exam", "subject", "topic"]


@admin.register(Formula)
class FormulaAdmin(admin.ModelAdmin):
    """High-yield LaTeX formulas repository admin."""

    list_display = ("title", "subject", "topic", "is_important")
    list_filter = ("is_important", "subject")
    search_fields = ("title", "formula_latex", "description")
    list_select_related = ("subject", "topic")
    autocomplete_fields = ["subject", "topic"]


@admin.register(RevisionNote)
class RevisionNoteAdmin(admin.ModelAdmin):
    """Exam revision notes admin."""

    list_display = ("title", "subject", "topic", "estimated_read_time_mins")
    list_filter = ("subject",)
    search_fields = ("title", "content_markdown", "summary")
    list_select_related = ("subject", "topic")
    autocomplete_fields = ["subject", "topic"]

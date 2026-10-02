"""
DSA Problems and Code Sandbox administration for learninghub/django_backend.
"""

from django.contrib import admin
from .models import Problem, ProblemSubmission, TestCase


class TestCaseInline(admin.TabularInline):
    model = TestCase
    extra = 0
    fields = ("order", "input_data", "expected_output", "is_hidden")


@admin.register(Problem)
class ProblemAdmin(admin.ModelAdmin):
    list_display = ["title", "difficulty", "category", "acceptance_rate", "submissions_count", "created_at"]
    list_filter = ["difficulty", "category"]
    search_fields = ["title", "slug"]
    prepopulated_fields = {"slug": ("title",)}
    inlines = [TestCaseInline]


@admin.register(TestCase)
class TestCaseAdmin(admin.ModelAdmin):
    list_display = ["problem", "order", "is_hidden"]
    list_filter = ["is_hidden"]
    search_fields = ["problem__title"]
    list_select_related = ["problem"]
    autocomplete_fields = ["problem"]


@admin.register(ProblemSubmission)
class ProblemSubmissionAdmin(admin.ModelAdmin):
    list_display = ["user", "problem", "language", "status", "runtime_ms", "memory_mb", "created_at"]
    list_filter = ["status", "language", "created_at"]
    search_fields = ["user__email", "problem__title"]
    list_select_related = ["user", "problem"]
    autocomplete_fields = ["user", "problem"]
    readonly_fields = ["user", "problem", "language", "code", "status", "runtime_ms", "memory_mb", "stdout", "stderr", "created_at"]

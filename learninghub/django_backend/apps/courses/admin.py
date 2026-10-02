"""
Courses and curriculum admin for learninghub/django_backend.
"""

from django.contrib import admin
from .models import (
    Chapter,
    Course,
    CourseBookmark,
    CourseReview,
    Enrollment,
    Lesson,
    LessonProgress,
)


class ChapterInline(admin.TabularInline):
    model = Chapter
    extra = 0
    fields = ("order", "title")
    show_change_link = True
    ordering = ("order",)


class LessonInline(admin.TabularInline):
    model = Lesson
    extra = 0
    fields = ("order", "title", "duration_minutes", "is_free_preview")
    show_change_link = True
    ordering = ("order",)


@admin.register(Course)
class CourseAdmin(admin.ModelAdmin):
    list_display = ["title", "instructor", "category", "level", "price", "is_published", "created_at"]
    list_filter = ["is_published", "level", "category"]
    search_fields = ["title", "slug", "instructor__email"]
    prepopulated_fields = {"slug": ("title",)}
    list_select_related = ["instructor"]
    autocomplete_fields = ["instructor"]
    inlines = [ChapterInline]
    actions = ["publish_courses", "unpublish_courses"]

    @admin.action(description="Publish selected courses")
    def publish_courses(self, request, queryset):
        count = queryset.update(is_published=True)
        self.message_user(request, f"{count} courses published successfully.")

    @admin.action(description="Unpublish selected courses")
    def unpublish_courses(self, request, queryset):
        count = queryset.update(is_published=False)
        self.message_user(request, f"{count} courses unpublished.")


@admin.register(Chapter)
class ChapterAdmin(admin.ModelAdmin):
    list_display = ["title", "course", "order"]
    list_filter = ["course"]
    search_fields = ["title", "course__title"]
    list_select_related = ["course"]
    autocomplete_fields = ["course"]
    inlines = [LessonInline]
    ordering = ["course", "order"]


@admin.register(Lesson)
class LessonAdmin(admin.ModelAdmin):
    list_display = ["title", "chapter", "duration_minutes", "is_free_preview", "order"]
    list_filter = ["is_free_preview", "chapter__course"]
    search_fields = ["title", "chapter__title", "chapter__course__title"]
    list_select_related = ["chapter", "chapter__course"]
    autocomplete_fields = ["chapter"]
    ordering = ["chapter", "order"]


@admin.register(Enrollment)
class EnrollmentAdmin(admin.ModelAdmin):
    list_display = ["user", "course", "progress", "enrolled_at", "completed_at"]
    list_filter = ["enrolled_at", "completed_at"]
    search_fields = ["user__email", "course__title"]
    list_select_related = ["user", "course"]
    autocomplete_fields = ["user", "course"]


@admin.register(LessonProgress)
class LessonProgressAdmin(admin.ModelAdmin):
    list_display = ["user", "lesson", "completed", "updated_at"]
    list_filter = ["completed"]
    search_fields = ["user__email", "lesson__title"]
    list_select_related = ["user", "lesson"]
    autocomplete_fields = ["user", "lesson"]


@admin.register(CourseReview)
class CourseReviewAdmin(admin.ModelAdmin):
    list_display = ["user", "course", "rating", "created_at"]
    list_filter = ["rating", "created_at"]
    search_fields = ["user__email", "course__title", "review_text"]
    list_select_related = ["user", "course"]
    autocomplete_fields = ["user", "course"]


@admin.register(CourseBookmark)
class CourseBookmarkAdmin(admin.ModelAdmin):
    list_display = ["user", "course", "created_at"]
    search_fields = ["user__email", "course__title", "notes"]
    list_select_related = ["user", "course"]
    autocomplete_fields = ["user", "course"]

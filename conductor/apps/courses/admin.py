"""
Course and Curriculum admin configuration with hierarchical inlines and autocomplete.
"""

from django.contrib import admin
from django.db import transaction

from .models import (
    CareerTrack,
    Category,
    Certificate,
    Course,
    Enrollment,
    Lesson,
    Module,
    Review,
    TrackCourse,
)


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    """Admin for Category model."""

    list_display = ["name", "slug", "parent", "order", "is_active"]
    list_filter = ["is_active", "parent"]
    search_fields = ["name"]
    prepopulated_fields = {"slug": ("name",)}
    ordering = ["order", "name"]
    autocomplete_fields = ["parent"]


class ModuleInline(admin.TabularInline):
    model = Module
    extra = 0
    fields = ("order", "title")
    show_change_link = True
    ordering = ("order",)


@admin.register(Course)
class CourseAdmin(admin.ModelAdmin):
    """Admin for Course model."""

    actions = ["duplicate_course", "publish_courses", "unpublish_courses"]

    @admin.action(description="Duplicate selected courses")
    def duplicate_course(self, request, queryset):
        with transaction.atomic():
            for course in queryset:
                old_modules = list(course.modules.all())
                course.pk = None
                course.slug = f"{course.slug}-copy"
                course.title = f"{course.title} (Copy)"
                course.is_published = False
                course.save()

                # Duplicate modules and lessons
                for mod in old_modules:
                    old_lessons = list(mod.lessons.all())
                    mod.pk = None
                    mod.course = course
                    mod.save()
                    for les in old_lessons:
                        les.pk = None
                        les.module = mod
                        les.slug = f"{les.slug}-copy"
                        les.save()

        self.message_user(
            request, f"{queryset.count()} courses duplicated successfully."
        )

    @admin.action(description="Publish selected courses")
    def publish_courses(self, request, queryset):
        count = queryset.update(is_published=True)
        self.message_user(request, f"{count} courses published.")

    @admin.action(description="Unpublish selected courses")
    def unpublish_courses(self, request, queryset):
        count = queryset.update(is_published=False)
        self.message_user(request, f"{count} courses unpublished.")

    list_display = [
        "title",
        "instructor",
        "category",
        "price",
        "is_published",
        "enrollment_count",
        "avg_rating",
    ]
    list_filter = ["is_published", "is_featured", "is_free", "difficulty", "category"]
    search_fields = ["title", "description", "instructor__email"]
    prepopulated_fields = {"slug": ("title",)}
    readonly_fields = [
        "enrollment_count",
        "avg_rating",
        "review_count",
        "created_at",
        "updated_at",
    ]
    date_hierarchy = "created_at"
    list_select_related = ["instructor", "category"]
    autocomplete_fields = ["instructor", "category"]
    inlines = [ModuleInline]

    fieldsets = (
        (
            "Basic Info",
            {"fields": ("title", "slug", "description", "short_description")},
        ),
        ("Media", {"fields": ("thumbnail", "preview_video")}),
        ("Relationships", {"fields": ("instructor", "category")}),
        ("Pricing", {"fields": ("price", "is_free")}),
        ("Details", {"fields": ("difficulty", "duration_hours", "lessons_count")}),
        ("Stats", {"fields": ("enrollment_count", "avg_rating", "review_count")}),
        ("Status", {"fields": ("is_published", "is_featured", "published_at")}),
        ("Content", {"fields": ("requirements", "learning_objectives")}),
        ("SEO", {"fields": ("meta_title", "meta_description")}),
        ("Timestamps", {"fields": ("created_at", "updated_at")}),
    )


class LessonInline(admin.TabularInline):
    model = Lesson
    extra = 0
    fields = (
        "order",
        "title",
        "content_type",
        "duration_minutes",
        "is_preview",
        "is_pro_only",
    )
    show_change_link = True
    ordering = ("order",)


@admin.register(Module)
class ModuleAdmin(admin.ModelAdmin):
    """Course Module / Section Admin."""

    list_display = ["title", "course", "order", "created_at"]
    list_filter = ["course"]
    search_fields = ["title", "course__title"]
    list_select_related = ["course"]
    autocomplete_fields = ["course"]
    inlines = [LessonInline]
    ordering = ["course", "order"]


@admin.register(Lesson)
class LessonAdmin(admin.ModelAdmin):
    """Individual Lesson Admin."""

    list_display = [
        "title",
        "module",
        "content_type",
        "duration_minutes",
        "is_preview",
        "is_pro_only",
        "order",
    ]
    list_filter = ["content_type", "is_preview", "is_pro_only"]
    search_fields = ["title", "module__title", "module__course__title"]
    list_select_related = ["module", "module__course"]
    autocomplete_fields = ["module"]
    prepopulated_fields = {"slug": ("title",)}
    ordering = ["module", "order"]


@admin.register(Enrollment)
class EnrollmentAdmin(admin.ModelAdmin):
    """Admin for Enrollment model."""

    list_display = [
        "user",
        "course",
        "progress_percentage",
        "created_at",
        "completed_at",
    ]
    list_filter = ["created_at", "completed_at"]
    search_fields = ["user__email", "course__title"]
    readonly_fields = ["created_at"]
    list_select_related = ["user", "course"]
    autocomplete_fields = ["user", "course"]


@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    """Course Review & Moderation Admin."""

    list_display = ["user", "course", "rating", "is_approved", "created_at"]
    list_filter = ["is_approved", "rating", "created_at"]
    search_fields = ["user__email", "course__title", "title", "content"]
    list_select_related = ["user", "course"]
    autocomplete_fields = ["user", "course"]
    actions = ["approve_reviews", "reject_reviews"]

    @admin.action(description="Approve selected reviews")
    def approve_reviews(self, request, queryset):
        count = queryset.update(is_approved=True)
        self.message_user(request, f"{count} reviews approved.")

    @admin.action(description="Reject selected reviews")
    def reject_reviews(self, request, queryset):
        count = queryset.update(is_approved=False)
        self.message_user(request, f"{count} reviews rejected.")


@admin.register(Certificate)
class CertificateAdmin(admin.ModelAdmin):
    """Course Completion Certificate Admin."""

    list_display = ["certificate_code", "user", "course", "issued_at"]
    search_fields = ["certificate_code", "user__email", "course__title"]
    readonly_fields = ["certificate_code", "signature", "issued_at"]
    list_select_related = ["user", "course"]
    autocomplete_fields = ["user", "course"]


class TrackCourseInline(admin.TabularInline):
    model = TrackCourse
    extra = 0
    autocomplete_fields = ["course"]


@admin.register(CareerTrack)
class CareerTrackAdmin(admin.ModelAdmin):
    """Career Track curriculum admin."""

    list_display = ["title", "slug", "is_active", "created_at"]
    list_filter = ["is_active"]
    search_fields = ["title", "description"]
    prepopulated_fields = {"slug": ("title",)}
    inlines = [TrackCourseInline]

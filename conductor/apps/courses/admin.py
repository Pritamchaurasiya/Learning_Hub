"""
Course admin configuration.
"""

from django.contrib import admin

from .models import Category, Course, Enrollment, Review


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    """Admin for Category model."""

    list_display = ["name", "slug", "parent", "order", "is_active"]
    list_filter = ["is_active", "parent"]
    search_fields = ["name"]
    prepopulated_fields = {"slug": ("name",)}
    ordering = ["order", "name"]


@admin.register(Course)
class CourseAdmin(admin.ModelAdmin):
    """Admin for Course model."""
    
    actions = ["duplicate_course", "publish_courses", "unpublish_courses"]

    @admin.action(description="Duplicate selected courses")
    def duplicate_course(self, request, queryset):
        for course in queryset:
            course.pk = None
            course.slug = f"{course.slug}-copy"
            course.title = f"{course.title} (Copy)"
            course.is_published = False
            course.save()
        self.message_user(request, f"{queryset.count()} courses duplicated successfully.")

    @admin.action(description="Publish selected courses")
    def publish_courses(self, request, queryset):
        queryset.update(is_published=True)
    
    @admin.action(description="Unpublish selected courses")
    def unpublish_courses(self, request, queryset):
        queryset.update(is_published=False)


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


@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    """Admin for Review model."""

    list_display = ["user", "course", "rating", "is_approved", "created_at"]
    list_filter = ["rating", "is_approved", "created_at"]
    search_fields = ["user__email", "course__title", "content"]
    readonly_fields = ["created_at"]
    list_select_related = ["user", "course"]


from .models import Certificate

@admin.register(Certificate)
class CertificateAdmin(admin.ModelAdmin):
    """Admin for Certificate model."""
    
    list_display = ["certificate_code", "user", "course", "issued_at"]
    list_filter = ["issued_at"]
    search_fields = ["certificate_code", "user__email", "course__title"]
    readonly_fields = ["certificate_code", "issued_at"]
    list_select_related = ["user", "course"]


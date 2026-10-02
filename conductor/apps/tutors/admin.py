"""
Tutors and 1-on-1 booking session administration.
"""

from django.contrib import admin
from .models import Booking, TutorProfile


@admin.register(TutorProfile)
class TutorProfileAdmin(admin.ModelAdmin):
    """Tutor profile and verification administration."""

    list_display = ["user", "hourly_rate", "rating", "total_reviews", "is_verified", "created_at"]
    list_filter = ["is_verified"]
    search_fields = ["user__email", "user__username", "skills"]
    list_select_related = ["user"]
    autocomplete_fields = ["user"]
    actions = ["verify_tutors", "unverify_tutors"]

    @admin.action(description="Verify selected tutor profiles")
    def verify_tutors(self, request, queryset):
        count = queryset.update(is_verified=True)
        self.message_user(request, f"{count} tutors verified successfully.")

    @admin.action(description="Revoke tutor verification")
    def unverify_tutors(self, request, queryset):
        count = queryset.update(is_verified=False)
        self.message_user(request, f"{count} tutor verifications revoked.")


@admin.register(Booking)
class BookingAdmin(admin.ModelAdmin):
    """Tutor booking session administration."""

    list_display = ["student", "tutor", "start_time", "end_time", "status", "created_at"]
    list_filter = ["status", "start_time"]
    search_fields = ["student__email", "tutor__user__email", "meeting_link"]
    list_select_related = ["student", "tutor", "tutor__user"]
    autocomplete_fields = ["student", "tutor"]

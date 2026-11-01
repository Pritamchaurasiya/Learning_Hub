"""
Support and Feedback ticket management with AI-assisted triage.
"""

from django.contrib import admin
from .models import Feedback


@admin.register(Feedback)
class FeedbackAdmin(admin.ModelAdmin):
    """Customer support and bug ticket administration."""

    list_display = [
        "subject",
        "user",
        "category",
        "urgency_score",
        "status",
        "created_at",
    ]
    list_filter = ["status", "category", "urgency_score", "created_at"]
    search_fields = ["subject", "message", "user__email", "admin_response"]
    list_select_related = ["user"]
    autocomplete_fields = ["user"]
    readonly_fields = [
        "created_at",
        "updated_at",
        "urgency_score",
        "ai_suggested_response",
    ]
    actions = ["mark_resolved", "escalate_ticket"]

    fieldsets = (
        (
            "Ticket Overview",
            {"fields": ("user", "category", "status", "subject", "message")},
        ),
        ("AI Triage Analysis", {"fields": ("urgency_score", "ai_suggested_response")}),
        ("Staff Resolution", {"fields": ("admin_response",)}),
        ("Audit", {"fields": ("created_at", "updated_at")}),
    )

    @admin.action(description="Mark selected tickets as Resolved")
    def mark_resolved(self, request, queryset):
        count = queryset.update(status=Feedback.Status.RESOLVED)
        self.message_user(request, f"{count} tickets marked as resolved.")

    @admin.action(description="Escalate selected tickets")
    def escalate_ticket(self, request, queryset):
        count = queryset.update(status=Feedback.Status.ESCALATED)
        self.message_user(request, f"{count} tickets escalated.")

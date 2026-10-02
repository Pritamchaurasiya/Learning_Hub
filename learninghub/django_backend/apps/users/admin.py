"""
User admin configuration for learninghub/django_backend.
"""

from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.utils import timezone
from .models import Profile, User


class ProfileInline(admin.StackedInline):
    model = Profile
    can_delete = False
    extra = 0


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    """Admin for custom LearningHub User model."""

    list_display = [
        "email",
        "username",
        "role",
        "level",
        "xp",
        "streak",
        "is_active",
        "is_locked_badge",
    ]
    list_filter = ["role", "is_active", "is_staff", "mfa_enabled"]
    search_fields = ["email", "username"]
    ordering = ["-date_joined"]
    inlines = [ProfileInline]
    actions = ["unlock_accounts", "activate_users", "deactivate_users"]

    readonly_fields = [
        "failed_logins",
        "mfa_secret",
        "token_version",
        "last_active",
        "last_login_at",
        "date_joined",
    ]

    fieldsets = (
        (None, {"fields": ("email", "password")}),
        ("Personal Info", {"fields": ("username", "avatar", "timezone")}),
        (
            "Role & Permissions",
            {"fields": ("role", "is_active", "is_staff", "is_superuser", "groups", "user_permissions")},
        ),
        ("Gamification & Engagement", {"fields": ("xp", "level", "streak", "longest_streak", "streak_freezes")}),
        (
            "Security & Lockout",
            {"fields": ("failed_logins", "locked_until", "mfa_enabled", "mfa_secret", "token_version")},
        ),
        ("Timestamps", {"fields": ("last_active", "last_login_at", "date_joined")}),
    )

    @admin.display(description="Locked?", boolean=True)
    def is_locked_badge(self, obj):
        return obj.is_locked

    @admin.action(description="Unlock selected user accounts")
    def unlock_accounts(self, request, queryset):
        count = queryset.update(failed_logins=0, locked_until=None)
        self.message_user(request, f"{count} accounts unlocked successfully.")

    @admin.action(description="Activate selected users")
    def activate_users(self, request, queryset):
        count = queryset.update(is_active=True)
        self.message_user(request, f"{count} accounts activated.")

    @admin.action(description="Deactivate selected users")
    def deactivate_users(self, request, queryset):
        count = queryset.update(is_active=False)
        self.message_user(request, f"{count} accounts deactivated.")


@admin.register(Profile)
class ProfileAdmin(admin.ModelAdmin):
    """User profile administration."""

    list_display = ["user", "headline", "target_exam", "college_target", "created_at"]
    search_fields = ["user__email", "headline", "target_exam", "college_target"]
    list_select_related = ["user"]
    autocomplete_fields = ["user"]

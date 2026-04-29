"""
User admin configuration.
"""

from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.utils import timezone

from .models import PasswordResetToken, User, Bookmark


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    """Custom admin for User model."""
    
    actions = ["verify_users", "deactivate_users"]

    @admin.action(description="Verify selected users")
    def verify_users(self, request, queryset):
        queryset.update(is_verified=True, verified_at=timezone.now())
        self.message_user(request, f"{queryset.count()} users verified successfully.")

    @admin.action(description="Deactivate selected users")
    def deactivate_users(self, request, queryset):
        queryset.update(is_active=False)
        self.message_user(request, f"{queryset.count()} users deactivated.")


    list_display = [
        "email",
        "username",
        "display_name",
        "role",
        "is_active",
        "is_verified",
        "created_at",
    ]
    list_filter = ["role", "is_active", "is_verified", "is_staff", "created_at"]
    search_fields = ["email", "username", "display_name"]
    ordering = ["-created_at"]

    fieldsets = (
        (None, {"fields": ("email", "password")}),
        (
            "Personal Info",
            {"fields": ("username", "display_name", "bio", "phone", "avatar")},
        ),
        (
            "Role & Status",
            {
                "fields": (
                    "role",
                    "is_active",
                    "is_verified",
                    "is_staff",
                    "is_superuser",
                )
            },
        ),
        ("Preferences", {"fields": ("preferences",)}),
        (
            "Timestamps",
            {"fields": ("created_at", "updated_at", "last_login_at", "verified_at")},
        ),
    )

    readonly_fields = ["created_at", "updated_at", "last_login_at", "verified_at"]

    add_fieldsets = (
        (
            None,
            {
                "classes": ("wide",),
                "fields": ("email", "username", "password1", "password2", "role"),
            },
        ),
    )


@admin.register(PasswordResetToken)
class PasswordResetTokenAdmin(admin.ModelAdmin):
    """Admin for PasswordResetToken model."""

    list_display = ["user", "token", "created_at", "expires_at", "is_used"]
    list_filter = ["is_used", "created_at"]
    search_fields = ["user__email", "token"]
    readonly_fields = ["token", "created_at"]
    list_select_related = ["user"]


@admin.register(Bookmark)
class BookmarkAdmin(admin.ModelAdmin):
    """Admin for Bookmark model."""

    list_display = ["user", "course", "created_at"]
    list_filter = ["created_at"]
    search_fields = ["user__email", "user__username", "course__title"]
    readonly_fields = ["created_at"]
    list_select_related = ["user", "course"]

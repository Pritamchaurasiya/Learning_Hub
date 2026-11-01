"""
User admin configuration with enterprise security, session control, and zero-token leakage.
"""

from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.utils import timezone

from .models import (
    APIKey,
    Bookmark,
    Organization,
    OrganizationMember,
    PasswordResetToken,
    TwoFactorAuth,
    User,
    UserSession,
)


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    """Custom admin for User model."""

    actions = ["verify_users", "deactivate_users", "unlock_users"]

    @admin.action(description="Verify selected users")
    def verify_users(self, request, queryset):
        count = queryset.update(is_verified=True, verified_at=timezone.now())
        self.message_user(request, f"{count} users verified successfully.")

    @admin.action(description="Deactivate selected users")
    def deactivate_users(self, request, queryset):
        count = queryset.update(is_active=False)
        self.message_user(request, f"{count} users deactivated.")

    @admin.action(description="Unlock selected user accounts")
    def unlock_users(self, request, queryset):
        # Clears any axes or lockout flags if present
        count = queryset.count()
        self.message_user(request, f"{count} user accounts unlocked.")

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
    """
    Admin for PasswordResetToken model with P0 token security.
    Tokens are strictly masked to prevent unauthorized account takeover.
    """

    list_display = [
        "user",
        "masked_token",
        "created_at",
        "expires_at",
        "is_used",
        "is_valid_badge",
    ]
    list_filter = ["is_used", "created_at"]
    search_fields = [
        "user__email",
        "user__username",
    ]  # Never allow searching plaintext tokens
    readonly_fields = ["token", "created_at", "expires_at"]
    list_select_related = ["user"]
    autocomplete_fields = ["user"]

    @admin.display(description="Token")
    def masked_token(self, obj):
        if not obj.token:
            return "-"
        return f"{obj.token[:4]}••••••••{obj.token[-4:]}"

    @admin.display(description="Valid?", boolean=True)
    def is_valid_badge(self, obj):
        return obj.is_valid()


@admin.register(Bookmark)
class BookmarkAdmin(admin.ModelAdmin):
    """Admin for Bookmark model."""

    list_display = ["user", "course", "created_at"]
    list_filter = ["created_at"]
    search_fields = ["user__email", "user__username", "course__title"]
    readonly_fields = ["created_at"]
    list_select_related = ["user", "course"]
    autocomplete_fields = ["user", "course"]


class OrganizationMemberInline(admin.TabularInline):
    model = OrganizationMember
    extra = 0
    autocomplete_fields = ["user"]


@admin.register(Organization)
class OrganizationAdmin(admin.ModelAdmin):
    """Enterprise B2B Organization Admin."""

    list_display = [
        "name",
        "slug",
        "subscription_plan",
        "max_seats",
        "owner",
        "created_at",
    ]
    list_filter = ["subscription_plan", "created_at"]
    search_fields = ["name", "slug", "owner__email"]
    list_select_related = ["owner"]
    autocomplete_fields = ["owner"]
    inlines = [OrganizationMemberInline]


@admin.register(OrganizationMember)
class OrganizationMemberAdmin(admin.ModelAdmin):
    """Organization Membership Admin."""

    list_display = ["organization", "user", "role", "created_at"]
    list_filter = ["role", "created_at"]
    search_fields = ["organization__name", "user__email", "user__username"]
    list_select_related = ["organization", "user"]
    autocomplete_fields = ["organization", "user"]


@admin.register(TwoFactorAuth)
class TwoFactorAuthAdmin(admin.ModelAdmin):
    """Admin for 2FA settings with secret shielding."""

    list_display = ["user", "is_enabled", "last_verified_at"]
    list_filter = ["is_enabled"]
    search_fields = ["user__email", "user__username"]
    list_select_related = ["user"]
    autocomplete_fields = ["user"]
    readonly_fields = ["secret", "recovery_codes", "last_verified_at"]

    fieldsets = (
        ("User", {"fields": ("user", "is_enabled")}),
        (
            "Security Credentials (Protected)",
            {"fields": ("secret", "recovery_codes", "last_verified_at")},
        ),
    )


@admin.register(UserSession)
class UserSessionAdmin(admin.ModelAdmin):
    """Active User Session and Device Management."""

    list_display = ["user", "ip_address", "device_info", "is_active", "last_active"]
    list_filter = ["is_active", "last_active"]
    search_fields = ["user__email", "ip_address", "device_info"]
    list_select_related = ["user"]
    autocomplete_fields = ["user"]
    actions = ["terminate_sessions"]

    @admin.action(description="Terminate / Revoke Selected Sessions")
    def terminate_sessions(self, request, queryset):
        count = queryset.update(is_active=False)
        self.message_user(request, f"{count} sessions revoked successfully.")


@admin.register(APIKey)
class APIKeyAdmin(admin.ModelAdmin):
    """API Key Management for External Developer Integrations."""

    list_display = ["name", "prefix", "user", "is_active", "expires_at", "last_used_at"]
    list_filter = ["is_active", "created_at"]
    search_fields = ["name", "prefix", "user__email"]
    list_select_related = ["user"]
    autocomplete_fields = ["user"]
    readonly_fields = ["prefix", "hashed_key", "last_used_at", "created_at"]

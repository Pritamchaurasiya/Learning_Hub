"""
Core system admin configuration with immutable audit logs and security monitoring.
"""

from django.contrib import admin
from .models import AuditLog


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    """
    Immutable Security Audit Log Admin.
    Tamper-proof: deletion and additions are strictly disabled.
    """

    list_display = [
        "actor",
        "action",
        "resource",
        "severity",
        "ip_address",
        "created_at",
    ]
    list_filter = ["severity", "action", "created_at"]
    search_fields = [
        "resource",
        "details",
        "actor__username",
        "actor__email",
        "ip_address",
    ]
    list_select_related = ["actor"]
    autocomplete_fields = ["actor"]
    date_hierarchy = "created_at"
    ordering = ["-created_at"]

    def get_readonly_fields(self, request, obj=None):
        """All fields are strictly read-only to preserve legal and operational audit integrity."""
        return [f.name for f in self.model._meta.fields]

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False

    def has_change_permission(self, request, obj=None):
        # Allow viewing the changeform in readonly mode
        return True

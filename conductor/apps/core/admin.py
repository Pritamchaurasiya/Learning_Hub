from django.contrib import admin
from .models import AuditLog


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ['actor', 'action', 'resource', 'severity', 'ip_address', 'created_at']
    list_filter = ['severity', 'action', 'created_at']
    search_fields = ['resource', 'details', 'actor__username', 'actor__email', 'ip_address']
    list_select_related = ['actor']
    readonly_fields = ['created_at', 'updated_at']
    date_hierarchy = 'created_at'

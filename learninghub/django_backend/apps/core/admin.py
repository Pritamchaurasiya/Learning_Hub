from django.contrib import admin
from .models import AuditLog


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ('id', 'action', 'actor', 'target_user', 'ip_address', 'entry_hash_short', 'created_at')
    list_filter = ('action', 'created_at')
    search_fields = ('actor__email', 'target_user__email', 'action', 'entry_hash', 'ip_address')
    readonly_fields = [f.name for f in AuditLog._meta.fields]
    autocomplete_fields = ['actor', 'target_user']
    list_select_related = ['actor', 'target_user']
    ordering = ('-id',)

    @admin.display(description="Entry Hash")
    def entry_hash_short(self, obj):
        return f"{obj.entry_hash[:12]}..." if obj.entry_hash else "-"

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False

from django.contrib import admin
from .models import StudyGroup, GroupMembership, GroupMessage


@admin.register(StudyGroup)
class StudyGroupAdmin(admin.ModelAdmin):
    list_display = ['name', 'creator', 'topic', 'is_public', 'max_members', 'created_at']
    list_filter = ['is_public', 'topic', 'created_at']
    search_fields = ['name', 'description', 'creator__username', 'creator__email']
    list_select_related = ['creator']
    readonly_fields = ['created_at', 'updated_at']


@admin.register(GroupMembership)
class GroupMembershipAdmin(admin.ModelAdmin):
    list_display = ['user', 'group', 'role', 'joined_at']
    list_filter = ['role', 'joined_at']
    search_fields = ['user__username', 'user__email', 'group__name']
    list_select_related = ['user', 'group']


@admin.register(GroupMessage)
class GroupMessageAdmin(admin.ModelAdmin):
    list_display = ['sender', 'group', 'content_snippet', 'created_at']
    list_filter = ['created_at']
    search_fields = ['content', 'sender__username', 'group__name']
    list_select_related = ['sender', 'group']
    readonly_fields = ['created_at']

    def content_snippet(self, obj):
        return obj.content[:50] + '...' if len(obj.content) > 50 else obj.content
    content_snippet.short_description = 'Content'

from django.contrib import admin
from .models import DiscussionThread, DiscussionReply


@admin.register(DiscussionThread)
class DiscussionThreadAdmin(admin.ModelAdmin):
    list_display = ['title', 'author', 'course', 'is_pinned', 'is_resolved', 'views', 'created_at']
    list_filter = ['is_pinned', 'is_resolved', 'created_at']
    search_fields = ['title', 'content', 'author__username', 'course__title']
    list_select_related = ['author', 'course']
    readonly_fields = ['created_at', 'updated_at']


@admin.register(DiscussionReply)
class DiscussionReplyAdmin(admin.ModelAdmin):
    list_display = ['id', 'thread', 'author', 'is_accepted_answer', 'like_count', 'created_at']
    list_filter = ['is_accepted_answer', 'created_at']
    search_fields = ['content', 'author__username', 'thread__title']
    list_select_related = ['author', 'thread', 'parent']
    readonly_fields = ['created_at', 'updated_at']

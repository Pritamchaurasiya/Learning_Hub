from django.contrib import admin
from .models import ChatRoom, Message


@admin.register(ChatRoom)
class ChatRoomAdmin(admin.ModelAdmin):
    list_display = ['id', 'name', 'type', 'last_message_at', 'created_at']
    list_filter = ['type', 'created_at']
    search_fields = ['name']
    readonly_fields = ['created_at', 'updated_at']

    def get_queryset(self, request):
        return super().get_queryset(request).prefetch_related('participants')


@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = ['sender', 'conversation', 'content_snippet', 'is_encrypted', 'created_at']
    list_filter = ['is_encrypted', 'created_at']
    search_fields = ['content', 'sender__username']
    list_select_related = ['sender', 'conversation']
    readonly_fields = ['created_at']

    def content_snippet(self, obj):
        return obj.content[:50] + '...' if len(obj.content) > 50 else obj.content
    content_snippet.short_description = 'Content'

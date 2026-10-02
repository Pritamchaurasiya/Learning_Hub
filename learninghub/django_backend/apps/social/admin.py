from django.contrib import admin
from .models import Notification, Discussion, Comment, LiveSession, Mentor


class CommentInline(admin.TabularInline):
    model = Comment
    extra = 0
    autocomplete_fields = ['user']
    fields = ('user', 'content', 'upvotes', 'created_at')
    readonly_fields = ('created_at',)


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'type', 'title', 'is_read', 'created_at')
    list_filter = ('type', 'is_read', 'created_at')
    search_fields = ('id', 'user__email', 'user__username', 'title', 'message')
    autocomplete_fields = ['user']
    list_select_related = ['user']
    readonly_fields = ('created_at', 'read_at')
    ordering = ('-created_at',)


@admin.register(Discussion)
class DiscussionAdmin(admin.ModelAdmin):
    list_display = ('id', 'title', 'user', 'category', 'is_pinned', 'upvotes', 'views', 'created_at')
    list_filter = ('category', 'is_pinned', 'created_at')
    search_fields = ('id', 'title', 'content', 'user__email', 'user__username')
    autocomplete_fields = ['user']
    list_select_related = ['user']
    inlines = [CommentInline]
    ordering = ('-is_pinned', '-created_at')


@admin.register(Comment)
class CommentAdmin(admin.ModelAdmin):
    list_display = ('id', 'discussion', 'user', 'upvotes', 'created_at')
    search_fields = ('id', 'discussion__title', 'user__email', 'content')
    autocomplete_fields = ['discussion', 'user']
    list_select_related = ['discussion', 'user']
    readonly_fields = ('created_at',)
    ordering = ('-created_at',)


@admin.register(LiveSession)
class LiveSessionAdmin(admin.ModelAdmin):
    list_display = (
        'id',
        'title',
        'instructor_name',
        'topic',
        'status',
        'start_time',
        'duration_minutes',
        'attendees_count',
    )
    list_filter = ('status', 'start_time')
    search_fields = ('id', 'title', 'instructor_name', 'topic')
    ordering = ('start_time',)


@admin.register(Mentor)
class MentorAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'title', 'specialization', 'rating', 'hourly_rate')
    list_filter = ('rating',)
    search_fields = ('id', 'name', 'title', 'specialization')
    ordering = ('name',)

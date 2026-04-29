from django.contrib import admin
from .models import LiveSession, SessionAttendee


@admin.register(LiveSession)
class LiveSessionAdmin(admin.ModelAdmin):
    list_display = ['title', 'host', 'course', 'scheduled_time', 'status', 'duration_minutes']
    list_filter = ['status', 'scheduled_time']
    search_fields = ['title', 'description', 'host__username', 'course__title']
    list_select_related = ['host', 'course']
    readonly_fields = ['created_at', 'updated_at']


@admin.register(SessionAttendee)
class SessionAttendeeAdmin(admin.ModelAdmin):
    list_display = ['user', 'session', 'joined_at']
    list_filter = ['joined_at']
    search_fields = ['user__username', 'session__title']
    list_select_related = ['user', 'session']

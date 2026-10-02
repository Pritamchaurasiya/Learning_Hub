from django.contrib import admin
from .models import AIChatSession, AIChatMessage, SpacedRepetitionSchedule


class AIChatMessageInline(admin.TabularInline):
    model = AIChatMessage
    extra = 0
    fields = ('sender', 'content', 'tokens_used', 'created_at')
    readonly_fields = ('sender', 'content', 'tokens_used', 'created_at')
    can_delete = False


@admin.register(AIChatSession)
class AIChatSessionAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'title', 'context_type', 'context_id', 'created_at', 'updated_at')
    list_filter = ('context_type', 'created_at')
    search_fields = ('id', 'user__email', 'user__username', 'title', 'context_id')
    autocomplete_fields = ['user']
    list_select_related = ['user']
    inlines = [AIChatMessageInline]
    ordering = ('-updated_at',)


@admin.register(AIChatMessage)
class AIChatMessageAdmin(admin.ModelAdmin):
    list_display = ('id', 'session', 'sender', 'tokens_used', 'created_at')
    list_filter = ('sender', 'created_at')
    search_fields = ('id', 'session__id', 'content')
    autocomplete_fields = ['session']
    list_select_related = ['session']
    readonly_fields = ('created_at',)
    ordering = ('-created_at',)


@admin.register(SpacedRepetitionSchedule)
class SpacedRepetitionScheduleAdmin(admin.ModelAdmin):
    list_display = (
        'user',
        'topic',
        'repetitions',
        'interval_days',
        'ease_factor',
        'next_review_date',
        'lapses',
        'last_reviewed_at',
    )
    list_filter = ('next_review_date',)
    search_fields = ('user__email', 'user__username', 'topic')
    autocomplete_fields = ['user']
    list_select_related = ['user']
    ordering = ('next_review_date',)

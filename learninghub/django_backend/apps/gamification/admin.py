from django.contrib import admin
from .models import Badge, UserBadge, DailyGoal, XPTransaction


@admin.register(Badge)
class BadgeAdmin(admin.ModelAdmin):
    list_display = ('id', 'title', 'category', 'xp_bonus', 'requirement', 'icon')
    list_filter = ('category',)
    search_fields = ('id', 'title', 'description')
    ordering = ('category', 'requirement')


@admin.register(UserBadge)
class UserBadgeAdmin(admin.ModelAdmin):
    list_display = ('user', 'badge', 'current_progress', 'earned_at')
    list_filter = ('badge__category', 'earned_at')
    search_fields = ('user__email', 'user__username', 'badge__title')
    autocomplete_fields = ['user', 'badge']
    list_select_related = ['user', 'badge']
    ordering = ('-earned_at',)


@admin.register(DailyGoal)
class DailyGoalAdmin(admin.ModelAdmin):
    list_display = ('user', 'date', 'target_xp', 'earned_xp', 'is_completed')
    list_filter = ('is_completed', 'date')
    search_fields = ('user__email', 'user__username')
    autocomplete_fields = ['user']
    list_select_related = ['user']
    ordering = ('-date',)


@admin.register(XPTransaction)
class XPTransactionAdmin(admin.ModelAdmin):
    list_display = ('user', 'amount', 'source', 'description', 'created_at')
    list_filter = ('source', 'created_at')
    search_fields = ('user__email', 'user__username', 'description', 'source')
    autocomplete_fields = ['user']
    list_select_related = ['user']
    readonly_fields = ('created_at',)
    ordering = ('-created_at',)

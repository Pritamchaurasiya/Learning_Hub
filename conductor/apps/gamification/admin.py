from django.contrib import admin
from .models import Badge, UserBadge, UserXP, Streak, Guild, GuildMembership


@admin.register(Badge)
class BadgeAdmin(admin.ModelAdmin):
    list_display = ['name', 'criteria_type', 'criteria_value', 'xp_reward']
    list_filter = ['criteria_type']
    search_fields = ['name', 'description']


@admin.register(UserBadge)
class UserBadgeAdmin(admin.ModelAdmin):
    list_display = ['user', 'badge', 'earned_at']
    list_filter = ['earned_at']
    search_fields = ['user__username', 'user__email', 'badge__name']
    list_select_related = ['user', 'badge']


@admin.register(UserXP)
class UserXPAdmin(admin.ModelAdmin):
    list_display = ['user', 'level', 'total_xp', 'weekly_xp', 'current_streak']
    search_fields = ['user__username', 'user__email']
    list_filter = ['level']
    list_select_related = ['user']


@admin.register(Streak)
class StreakAdmin(admin.ModelAdmin):
    list_display = ['user', 'current_streak', 'longest_streak', 'last_activity_date']
    list_filter = ['last_activity_date']
    search_fields = ['user__username', 'user__email']
    list_select_related = ['user']


@admin.register(Guild)
class GuildAdmin(admin.ModelAdmin):
    list_display = ['name', 'leader', 'level', 'total_xp']
    list_filter = ['level']
    search_fields = ['name', 'description', 'leader__username']
    list_select_related = ['leader']


@admin.register(GuildMembership)
class GuildMembershipAdmin(admin.ModelAdmin):
    list_display = ['user', 'guild', 'role', 'contribution_xp']
    list_filter = ['role']
    search_fields = ['user__username', 'guild__name']
    list_select_related = ['user', 'guild']

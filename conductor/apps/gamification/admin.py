"""Gamification admin."""

from django.contrib import admin
from .models import UserXP, Badge, UserBadge, Streak


@admin.register(UserXP)
class UserXPAdmin(admin.ModelAdmin):
    list_display = ["user", "total_xp", "level", "weekly_xp"]


@admin.register(Badge)
class BadgeAdmin(admin.ModelAdmin):
    list_display = ["name", "criteria_type", "criteria_value", "xp_reward"]


@admin.register(UserBadge)
class UserBadgeAdmin(admin.ModelAdmin):
    list_display = ["user", "badge", "earned_at"]


@admin.register(Streak)
class StreakAdmin(admin.ModelAdmin):
    list_display = ["user", "current_streak", "longest_streak", "last_activity_date"]

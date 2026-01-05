"""Gamification serializers."""

from rest_framework import serializers
from .models import UserXP, UserBadge, Streak, Badge


class UserXPSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserXP
        fields = ["total_xp", "level", "weekly_xp"]


class BadgeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Badge
        fields = ["id", "name", "description", "icon", "xp_reward"]


class UserBadgeSerializer(serializers.ModelSerializer):
    badge = BadgeSerializer(read_only=True)

    class Meta:
        model = UserBadge
        fields = ["badge", "earned_at"]


class StreakSerializer(serializers.ModelSerializer):
    class Meta:
        model = Streak
        fields = ["current_streak", "longest_streak", "last_activity_date"]


class GamificationStatsResponseSerializer(serializers.Serializer):
    xp = UserXPSerializer()
    streak = StreakSerializer()
    badges = UserBadgeSerializer(many=True)


class LeaderboardEntrySerializer(serializers.Serializer):
    rank = serializers.IntegerField()
    username = serializers.CharField()
    display_name = serializers.CharField()
    total_xp = serializers.IntegerField()
    level = serializers.IntegerField()

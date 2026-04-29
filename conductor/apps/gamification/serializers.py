"""
Gamification Serializers - DRF serializers for XP, badges, streaks, and leaderboard.
"""
from rest_framework import serializers
from .models import UserXP, Streak, Badge, UserBadge, Guild, GuildMembership


class UserXPSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)

    class Meta:
        model = UserXP
        fields = [
            'id', 'username', 'total_xp', 'weekly_xp',
            'level', 'current_streak', 'last_activity_date',
        ]
        read_only_fields = fields


class StreakSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)

    class Meta:
        model = Streak
        fields = ['id', 'username', 'current_streak', 'longest_streak', 'last_activity_date']
        read_only_fields = fields


class BadgeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Badge
        fields = ['id', 'name', 'description', 'icon', 'criteria_type', 'criteria_value', 'xp_reward']
        read_only_fields = fields


class UserBadgeSerializer(serializers.ModelSerializer):
    badge = BadgeSerializer(read_only=True)
    username = serializers.CharField(source='user.username', read_only=True)

    class Meta:
        model = UserBadge
        fields = ['id', 'username', 'badge', 'earned_at']
        read_only_fields = fields


class LeaderboardEntrySerializer(serializers.Serializer):
    rank = serializers.IntegerField()
    username = serializers.CharField()
    total_xp = serializers.IntegerField()
    level = serializers.IntegerField()
    avatar_url = serializers.CharField(required=False, allow_blank=True, default='')


class GuildSerializer(serializers.ModelSerializer):
    leader_name = serializers.CharField(source='leader.username', read_only=True, default=None)
    member_count = serializers.SerializerMethodField()

    class Meta:
        model = Guild
        fields = ['id', 'name', 'description', 'emblem', 'leader_name', 'total_xp', 'level', 'max_members', 'member_count']
        read_only_fields = fields

    def get_member_count(self, obj):
        return obj.memberships.count()


class AddXPSerializer(serializers.Serializer):
    amount = serializers.IntegerField(min_value=1, max_value=10000)
    reason = serializers.CharField(max_length=200, required=False, default='Activity')


class UnlockAchievementSerializer(serializers.Serializer):
    achievementId = serializers.CharField(max_length=200)

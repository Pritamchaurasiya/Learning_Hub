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
    reason = serializers.CharField(max_length=200, required=False, default='Activity', allow_blank=False)
    
    def validate_amount(self, value):
        """Validate XP amount is reasonable."""
        if value <= 0:
            raise serializers.ValidationError("XP amount must be positive")
        if value > 10000:
            raise serializers.ValidationError("XP amount too large (max 10000)")
        return value
    
    def validate_reason(self, value):
        """Validate reason is not empty."""
        if value and not value.strip():
            raise serializers.ValidationError("Reason cannot be empty")
        return value.strip() if value else 'Activity'


class UnlockAchievementSerializer(serializers.Serializer):
    achievementId = serializers.CharField(max_length=200, allow_blank=False)
    
    def validate_achievementId(self, value):
        """Validate achievement ID exists."""
        if not value or not value.strip():
            raise serializers.ValidationError("Achievement ID is required")
        return value.strip()


class GuildCreateSerializer(serializers.Serializer):
    """Serializer for creating a new guild."""
    name = serializers.CharField(max_length=50, min_length=3)
    description = serializers.CharField(max_length=500, required=False, allow_blank=True)
    emblem = serializers.CharField(max_length=20, default='🛡️')
    
    def validate_name(self, value):
        """Validate guild name is unique and valid."""
        if not value or not value.strip():
            raise serializers.ValidationError("Guild name is required")
        
        # Check uniqueness
        from .models import Guild
        if Guild.objects.filter(name__iexact=value.strip()).exists():
            raise serializers.ValidationError("A guild with this name already exists")
        
        return value.strip()


class GuildJoinSerializer(serializers.Serializer):
    """Serializer for joining a guild."""
    guild_id = serializers.UUIDField()
    
    def validate_guild_id(self, value):
        """Validate guild exists and has space."""
        from .models import Guild
        try:
            guild = Guild.objects.get(id=value)
            current_members = guild.memberships.count()
            if current_members >= guild.max_members:
                raise serializers.ValidationError("Guild is full")
            return value
        except Guild.DoesNotExist:
            raise serializers.ValidationError("Guild not found")

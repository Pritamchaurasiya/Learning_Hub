from rest_framework import serializers
from .models import Badge, UserBadge, DailyGoal

class BadgeSerializer(serializers.ModelSerializer):
    earned = serializers.SerializerMethodField()
    earned_at = serializers.SerializerMethodField()
    current_progress = serializers.SerializerMethodField()

    class Meta:
        model = Badge
        fields = [
            'id', 'title', 'description', 'icon', 'category',
            'xp_bonus', 'requirement', 'earned', 'earned_at', 'current_progress'
        ]

    def get_earned(self, obj):
        user_badge = self._get_user_badge(obj)
        return bool(user_badge and user_badge.earned_at)

    def get_earned_at(self, obj):
        user_badge = self._get_user_badge(obj)
        return user_badge.earned_at.isoformat() if (user_badge and user_badge.earned_at) else None

    def get_current_progress(self, obj):
        user_badge = self._get_user_badge(obj)
        return user_badge.current_progress if user_badge else 0

    def _get_user_badge(self, obj):
        user_badges_map = self.context.get('user_badges_map', {})
        return user_badges_map.get(obj.id)

class DailyGoalSerializer(serializers.ModelSerializer):
    class Meta:
        model = DailyGoal
        fields = ['date', 'target_xp', 'earned_xp', 'is_completed']

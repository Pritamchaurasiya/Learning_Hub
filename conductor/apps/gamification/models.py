"""Gamification models."""

from django.db import models
from apps.users.models import User
from core.models import BaseModel


class UserXP(BaseModel):
    """User experience points and level."""

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="xp")
    total_xp = models.PositiveIntegerField(default=0)
    level = models.PositiveIntegerField(default=1)
    weekly_xp = models.PositiveIntegerField(default=0)

    class Meta:
        db_table = "user_xp"

    def add_xp(self, amount):
        """Add XP and update level."""
        self.total_xp += amount
        self.weekly_xp += amount
        # Level up every 1000 XP
        # God Mode: Logarithmic scaling
        # Formula: Level = (Total XP / 100) ^ (1/1.5)
        # Inverse: XP needed = 100 * Level ^ 1.5
        if self.total_xp > 0:
            # Calculate raw level
            raw_level = (self.total_xp / 100) ** (1 / 1.5)
            self.level = int(raw_level)

            # Ensure minimum level is 1
            if self.level < 1:
                self.level = 1
        else:
            self.level = 1
        self.save()


class Badge(BaseModel):
    """Achievement badges."""

    name = models.CharField(max_length=100)
    description = models.TextField()
    icon = models.CharField(max_length=50)
    criteria_type = models.CharField(
        max_length=50
    )  # 'courses_completed', 'streak_days'
    criteria_value = models.PositiveIntegerField()
    xp_reward = models.PositiveIntegerField(default=0)

    class Meta:
        db_table = "badges"

    def __str__(self):
        return self.name


class UserBadge(BaseModel):
    """Earned badges."""

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="badges")
    badge = models.ForeignKey(Badge, on_delete=models.CASCADE)
    earned_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "user_badges"
        unique_together = ["user", "badge"]


class Streak(BaseModel):
    """Learning streak tracking."""

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name="streak")
    current_streak = models.PositiveIntegerField(default=0)
    longest_streak = models.PositiveIntegerField(default=0)
    last_activity_date = models.DateField(null=True)

    class Meta:
        db_table = "streaks"

    def update_streak(self):
        """Update streak based on today's activity."""
        from django.utils import timezone

        today = timezone.now().date()

        if self.last_activity_date == today:
            return  # Already logged today

        if self.last_activity_date and (today - self.last_activity_date).days == 1:
            self.current_streak += 1
        else:
            self.current_streak = 1

        self.longest_streak = max(self.longest_streak, self.current_streak)
        self.last_activity_date = today
        self.save()

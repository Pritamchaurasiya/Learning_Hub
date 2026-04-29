from django.db import models
from django.conf import settings
from django.utils import timezone
from datetime import timedelta
from apps.core.models import BaseModel

class UserXP(BaseModel):
    """
    Persistent storage for user gamification stats.
    Synced from Redis asynchronously.
    """
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='xp_profile')
    total_xp = models.PositiveIntegerField(default=0)
    weekly_xp = models.PositiveIntegerField(default=0)  # Reset weekly
    level = models.PositiveIntegerField(default=1)
    current_streak = models.PositiveIntegerField(default=0)
    last_activity_date = models.DateField(null=True, blank=True)
    
    class Meta:
        indexes = [
            models.Index(fields=['-total_xp']),  # Efficient DB leaderboard fallback
        ]

    def add_xp(self, amount):
        """Add XP to user and update level if needed."""
        self.total_xp += amount
        self.weekly_xp += amount
        # Simple level calculation: 100 XP per level
        new_level = (self.total_xp // 100) + 1
        if new_level > self.level:
            self.level = new_level
        self.save()

    def __str__(self):
        return f"{self.user.username} - Lvl {self.level} ({self.total_xp} XP)"



class Streak(BaseModel):
    """
    Tracks daily login/activity streaks separately.
    """
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='streak_profile')
    current_streak = models.PositiveIntegerField(default=0)
    longest_streak = models.PositiveIntegerField(default=0)
    last_activity_date = models.DateField(null=True, blank=True)

    def update_streak(self):
        """Update streak based on current activity."""
        today = timezone.now().date()
        
        if self.last_activity_date is None:
            # First activity ever
            self.current_streak = 1
        elif self.last_activity_date == today:
            # Already recorded activity today
            pass
        elif self.last_activity_date == today - timedelta(days=1):
            # Consecutive day - continue streak
            self.current_streak += 1
        else:
            # Streak broken - reset to 1
            self.current_streak = 1
        
        # Update longest streak if current is higher
        if self.current_streak > self.longest_streak:
            self.longest_streak = self.current_streak
        
        self.last_activity_date = today
        self.save()

    def __str__(self):
        return f"{self.user.username} - Streak: {self.current_streak}"


class Badge(BaseModel):
    """
    Achievements/Badges that users can earn.
    """
    name = models.CharField(max_length=100)
    description = models.TextField()
    icon = models.CharField(max_length=50, help_text="Emoji or icon identifier", default="🏅")
    criteria_type = models.CharField(max_length=50, help_text="Type of action required (e.g., 'courses_completed')")
    criteria_value = models.PositiveIntegerField(help_text="Count required to earn")
    xp_reward = models.PositiveIntegerField(default=50)
    
    # We might need a ManyToMany with User through a UserBadge model to track earned badges, 
    # but for now let's just define the Badge model itself as requested by conftest.
    
    def __str__(self):
        return self.name


class UserBadge(BaseModel):
    """
    Connects Users to Badges (M2M with extra data).
    """
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='badges')
    badge = models.ForeignKey(Badge, on_delete=models.CASCADE, related_name='awarded_to')
    earned_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ['user', 'badge']
        indexes = [
            models.Index(fields=['user', '-earned_at']),
        ]

    def __str__(self):
        return f"{self.user.username} earned {self.badge.name}"


class Guild(BaseModel):
    """
    A social group/tribe of users competing together.
    """
    name = models.CharField(max_length=50, unique=True)
    description = models.TextField(blank=True)
    emblem = models.CharField(max_length=20, default="🛡️", help_text="Emoji or Icon")
    
    leader = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, related_name='led_guilds')
    
    # Collective Stats
    total_xp = models.PositiveIntegerField(default=0)
    level = models.PositiveIntegerField(default=1)
    
    # Capacity
    max_members = models.PositiveIntegerField(default=50)
    
    class Meta:
        ordering = ['-total_xp']

    def __str__(self):
        return f"{self.name} (Lvl {self.level})"


class GuildMembership(BaseModel):
    """
    Link between User and Guild with role.
    """
    class Role(models.TextChoices):
        LEADER = 'leader', 'Leader'
        ELDER = 'elder', 'Elder'
        MEMBER = 'member', 'Member'

    guild = models.ForeignKey(Guild, on_delete=models.CASCADE, related_name='memberships')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='guild_membership')
    
    role = models.CharField(max_length=20, choices=Role.choices, default=Role.MEMBER)
    contribution_xp = models.PositiveIntegerField(default=0, help_text="XP contributed to this guild")
    
    class Meta:
        unique_together = ['guild', 'user']

    def __str__(self):
        return f"{self.user.username} in {self.guild.name}"



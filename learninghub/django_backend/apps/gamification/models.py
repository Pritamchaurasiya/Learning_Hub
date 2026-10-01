from django.db import models
from django.conf import settings
from django.utils import timezone

class Badge(models.Model):
    CATEGORY_CHOICES = (
        ('STREAK', 'Streak & Consistency'),
        ('MASTERY', 'Subject Mastery'),
        ('SPEED', 'Speed & Precision'),
        ('COMMUNITY', 'Community Contributor'),
    )

    id = models.CharField(primary_key=True, max_length=64)
    title = models.CharField(max_length=150)
    description = models.TextField()
    icon = models.CharField(max_length=64, default='Award')
    category = models.CharField(max_length=32, choices=CATEGORY_CHOICES, default='MASTERY')
    xp_bonus = models.IntegerField(default=100)
    requirement = models.IntegerField(default=1)

    class Meta:
        db_table = 'lh_badges'

    def __str__(self):
        return f"{self.title} ({self.category})"

class UserBadge(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='badges')
    badge = models.ForeignKey(Badge, on_delete=models.CASCADE, related_name='awarded_users')
    earned_at = models.DateTimeField(null=True, blank=True)
    current_progress = models.IntegerField(default=0)

    class Meta:
        db_table = 'lh_user_badges'
        unique_together = ('user', 'badge')

    def __str__(self):
        return f"{self.user.email} - {self.badge.title} ({'Earned' if self.earned_at else 'In Progress'})"

class DailyGoal(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='daily_goals')
    date = models.DateField(default=timezone.now)
    target_xp = models.IntegerField(default=100)
    earned_xp = models.IntegerField(default=0)
    is_completed = models.BooleanField(default=False)

    class Meta:
        db_table = 'lh_daily_goals'
        unique_together = ('user', 'date')

class XPTransaction(models.Model):
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='xp_transactions')
    amount = models.IntegerField()
    source = models.CharField(max_length=64, default='TEST_PASS')
    description = models.CharField(max_length=255, blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'lh_xp_transactions'
        ordering = ['-created_at']

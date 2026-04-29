from django.db import models
from django.conf import settings


class StudyGroup(models.Model):
    """
    Model for Study Groups feature.
    """
    name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    topic = models.CharField(max_length=100)
    creator = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='created_groups'
    )
    members = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        through='GroupMembership',
        related_name='study_groups'
    )
    max_members = models.PositiveIntegerField(default=10)
    is_public = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return self.name

    @property
    def member_count(self):
        if hasattr(self, '_member_count'):
            return self._member_count
        return self.memberships.count()
        
    @member_count.setter
    def member_count(self, value):
        self._member_count = value


class GroupMembership(models.Model):
    """
    Through model for group membership.
    """
    group = models.ForeignKey(StudyGroup, on_delete=models.CASCADE, related_name='memberships')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    role = models.CharField(max_length=20, choices=[
        ('member', 'Member'),
        ('moderator', 'Moderator'),
        ('admin', 'Admin'),
    ], default='member')
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ['group', 'user']


class GroupMessage(models.Model):
    """
    Chat message within a study group.
    """
    group = models.ForeignKey(StudyGroup, on_delete=models.CASCADE, related_name='messages')
    sender = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    
    # Optional: Attachments, Reply-To, etc.
    
    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f"{self.sender.username}: {self.content[:20]}..."

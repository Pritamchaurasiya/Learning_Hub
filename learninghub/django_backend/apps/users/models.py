import uuid
from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.db import models
from django.utils import timezone as dj_timezone

def generate_user_id():
    return str(uuid.uuid4())

class CustomUserManager(BaseUserManager):
    def create_user(self, email, username=None, password=None, **extra_fields):
        if not email:
            raise ValueError('Email address is required')
        email = self.normalize_email(email).lower()
        if not username:
            username = email.split('@')[0]
        user = self.model(email=email, username=username, **extra_fields)
        if password:
            user.set_password(password)
        else:
            user.set_unusable_password()
        user.save(using=self._db)
        return user

    def create_superuser(self, email, username=None, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('role', 'SUPERADMIN')
        return self.create_user(email, username, password, **extra_fields)

class User(AbstractUser):
    ROLE_CHOICES = (
        ('STUDENT', 'Student'),
        ('INSTRUCTOR', 'Instructor'),
        ('ADMIN', 'Admin'),
        ('SUPERADMIN', 'Super Admin'),
        ('MODERATOR', 'Moderator'),
        ('ENTERPRISE', 'Enterprise'),
    )

    id = models.CharField(primary_key=True, max_length=64, default=generate_user_id)
    email = models.EmailField(unique=True, db_index=True)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='STUDENT', db_index=True)
    avatar = models.URLField(max_length=500, blank=True, null=True)
    xp = models.IntegerField(default=0)
    level = models.IntegerField(default=1)
    streak = models.IntegerField(default=0)
    longest_streak = models.IntegerField(default=0)
    streak_freezes = models.IntegerField(default=1)
    timezone = models.CharField(max_length=64, default='UTC')
    token_version = models.IntegerField(default=1)
    last_active = models.DateTimeField(default=dj_timezone.now)
    failed_logins = models.IntegerField(default=0)
    locked_until = models.DateTimeField(null=True, blank=True)
    mfa_enabled = models.BooleanField(default=False)
    mfa_secret = models.CharField(max_length=128, blank=True, null=True)
    login_count = models.IntegerField(default=0)
    last_login_at = models.DateTimeField(null=True, blank=True)
    deleted_at = models.DateTimeField(null=True, blank=True)

    objects = CustomUserManager()

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username']

    class Meta:
        db_table = 'lh_users'
        indexes = [
            models.Index(fields=['email']),
            models.Index(fields=['role']),
        ]

    def __str__(self):
        return f"{self.email} ({self.role})"

    @property
    def is_locked(self):
        if self.locked_until and self.locked_until > dj_timezone.now():
            return True
        return False

class Profile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    headline = models.CharField(max_length=255, blank=True, null=True)
    bio = models.TextField(blank=True, null=True)
    github_url = models.URLField(max_length=300, blank=True, null=True)
    linkedin_url = models.URLField(max_length=300, blank=True, null=True)
    target_exam = models.CharField(max_length=100, blank=True, default='JEE Advanced / DSA')
    college_target = models.CharField(max_length=100, blank=True, default='IIT Bombay')
    preferences = models.JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'lh_user_profiles'

    def __str__(self):
        return f"Profile of {self.user.email}"

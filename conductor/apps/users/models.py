"""
User models for Learning Hub Backend.
"""

import uuid
from django.contrib.auth.models import (
    AbstractBaseUser,
    BaseUserManager,
    PermissionsMixin,
)
from django.db import models
from django.utils import timezone

from apps.core.mixins import TimestampMixin, UUIDMixin
from apps.core.models import BaseModel
from typing import cast


class UserManager(BaseUserManager):
    """Custom manager for User model."""

    def create_user(self, email, password=None, **extra_fields):
        """Create and return a regular user with an email and password."""
        if not email:
            raise ValueError("Users must have an email address")

        # Normalize and lowercase entire email address
        email = self.normalize_email(email.lower())
        user = cast(User, self.model(email=email, **extra_fields))
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        """Create and return a superuser with an email and password."""
        extra_fields.setdefault("is_staff", True)
        extra_fields.setdefault("is_superuser", True)
        extra_fields.setdefault("role", User.Role.ADMIN)
        extra_fields.setdefault("is_verified", True)

        if extra_fields.get("is_staff") is not True:
            raise ValueError("Superuser must have is_staff=True.")
        if extra_fields.get("is_superuser") is not True:
            raise ValueError("Superuser must have is_superuser=True.")

        return self.create_user(email, password, **extra_fields)


class Organization(BaseModel):
    """B2B Organization/Company."""
    name = models.CharField(max_length=200)
    slug = models.SlugField(unique=True)
    subscription_plan = models.CharField(max_length=50, default='free') # 'enterprise', 'scale'
    max_seats = models.PositiveIntegerField(default=5)
    
    owner = models.ForeignKey('User', on_delete=models.CASCADE, related_name='owned_organizations')

    class Meta:
        db_table = "organizations"

    def __str__(self):
        return self.name

class OrganizationMember(BaseModel):
    """Employee in an organization."""
    class Role(models.TextChoices):
        ADMIN = 'admin', 'Admin'
        MEMBER = 'member', 'Member'
        MANAGER = 'manager', 'Manager'
        
    organization = models.ForeignKey(Organization, on_delete=models.CASCADE, related_name='members')
    user = models.ForeignKey('User', on_delete=models.CASCADE, related_name='organization_memberships')
    role = models.CharField(max_length=20, choices=Role.choices, default=Role.MEMBER)
    
    class Meta:
        unique_together = ['organization', 'user']
        db_table = "organization_members"

class User(AbstractBaseUser, PermissionsMixin, UUIDMixin, TimestampMixin):
    """
    Custom User model with email authentication.

    Supports three roles: Student, Instructor, and Admin.
    """

    class Role(models.TextChoices):
        STUDENT = "student", "Student"
        INSTRUCTOR = "instructor", "Instructor"
        ADMIN = "admin", "Admin"

    # Authentication fields
    email = models.EmailField(unique=True, db_index=True, max_length=255)
    username = models.CharField(max_length=50, unique=True)

    # Role
    role = models.CharField(
        max_length=20, choices=Role.choices, default=Role.STUDENT, db_index=True
    )

    # Profile fields
    display_name = models.CharField(max_length=100, blank=True)
    avatar = models.ImageField(upload_to="avatars/", null=True, blank=True)
    bio = models.TextField(max_length=500, blank=True)
    phone = models.CharField(max_length=20, blank=True)

    # Status flags
    is_active = models.BooleanField(default=True)
    is_staff = models.BooleanField(default=False)
    is_verified = models.BooleanField(default=False)

    # Timestamps (from TimestampMixin)
    last_login_at = models.DateTimeField(null=True, blank=True)
    verified_at = models.DateTimeField(null=True, blank=True)

    # User preferences (JSON field for flexibility)
    preferences = models.JSONField(default=dict, blank=True)

    # Manager
    objects = UserManager()

    # Auth configuration
    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["username"]

    class Meta:
        db_table = "users"
        verbose_name = "User"
        verbose_name_plural = "Users"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["email"]),
            models.Index(fields=["username"]),
            models.Index(fields=["role"]),
            models.Index(fields=["is_active", "is_verified"]),
        ]

    def __str__(self):
        return self.email

    def get_full_name(self):
        """Return the display name or email."""
        return self.display_name or self.email

    def get_short_name(self):
        """Return the username."""
        return self.username

    @property
    def is_instructor(self):
        """Check if user is an instructor."""
        return self.role == self.Role.INSTRUCTOR

    @property
    def is_admin(self):
        """Check if user is an admin."""
        return self.role == self.Role.ADMIN

    @property
    def is_pro(self):
        """Check if user has active Pro subscription."""
        return hasattr(self, 'subscription') and self.subscription.is_valid()

    def update_last_login(self):
        """Update the last login timestamp."""
        self.last_login_at = timezone.now()
        self.save(update_fields=["last_login_at"])


class PasswordResetToken(BaseModel):
    """
    Token for password reset functionality.

    Inherits id (UUID), created_at, updated_at from BaseModel.
    """

    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="password_reset_tokens"
    )
    token = models.CharField(max_length=100, unique=True)
    expires_at = models.DateTimeField()
    is_used = models.BooleanField(default=False)

    class Meta:
        db_table = "password_reset_tokens"

    def is_valid(self):
        """Check if the token is still valid."""
        return not self.is_used and timezone.now() < self.expires_at


class Bookmark(models.Model):
    """
    User bookmark model for saving courses.
    
    Inherits id (UUID), created_at, updated_at from BaseModel.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name="bookmarks"
    )
    course = models.ForeignKey(
        "courses.Course", on_delete=models.CASCADE, related_name="bookmarked_by"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    notes = models.TextField(blank=True, help_text="User notes about this bookmark")

    class Meta:
        db_table = "user_bookmarks"
        verbose_name = "Bookmark"
        verbose_name_plural = "Bookmarks"
        ordering = ["-created_at"]
        unique_together = ["user", "course"]
        indexes = [
            models.Index(fields=["user", "created_at"]),
            models.Index(fields=["course"]),
        ]

    def __str__(self):
        return f"{self.user.email} - {self.course.title}"

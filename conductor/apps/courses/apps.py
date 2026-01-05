"""Courses app configuration."""

from django.apps import AppConfig


class CoursesConfig(AppConfig):
    """Configuration for Courses app."""

    default_auto_field = "django.db.models.BigAutoField"
    name = "apps.courses"
    verbose_name = "Course Management"

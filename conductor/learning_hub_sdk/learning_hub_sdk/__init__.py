"""
Learning Hub Python SDK

A comprehensive Python SDK for the Learning Hub API, providing easy integration
with authentication, course management, user management, and more.
"""

from .client import LearningHubClient
from .auth import Auth
from .exceptions import (
    LearningHubError,
    AuthenticationError,
    APIError,
    NotFoundError,
    ValidationError,
)
from .models import (
    User,
    Course,
    Enrollment,
    Category,
    Review,
    Progress,
)

__version__ = "1.0.0"
__author__ = "Learning Hub Team"
__email__ = "support@learninghub.com"

__all__ = [
    "LearningHubClient",
    "Auth",
    "LearningHubError",
    "AuthenticationError", 
    "APIError",
    "NotFoundError",
    "ValidationError",
    "User",
    "Course",
    "Enrollment",
    "Category",
    "Review",
    "Progress",
]

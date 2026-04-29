"""
Core signals for the application.
"""
from django.dispatch import Signal

# Signal triggered when a user enrolls in a course
# providing_args: ["user", "course", "enrollment"]
user_enrolled = Signal()

# Signal for cache invalidation
# providing_args: ["user_id", "course_id"]
cache_invalidated = Signal()

# Signal for bookmark changes
cache_bookmarks_changed = Signal()

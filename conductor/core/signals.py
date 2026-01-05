"""
Global Domain Signals for Event-Driven Architecture.

These signals decouple the core business logic (Enrollment, Completion) from
side-effects like Gamification, Notifications, and Analytics.
"""

from django.dispatch import Signal

# User Lifecycle
user_registered = Signal()  # user

# Course Domain
user_enrolled = Signal()  # user, course, enrollment
course_completed = Signal()  # user, course, enrollment

# Content Domain
lesson_completed = Signal()  # user, lesson, progress
quiz_passed = Signal()  # user, quiz, attempt
quiz_failed = Signal()  # user, quiz, attempt

# Gamification Domain (Reverse signals if needed, usually receivers handle this)
xp_awarded = Signal()  # user, amount, source
badge_earned = Signal()  # user, badge
streak_updated = Signal()  # user, current_streak

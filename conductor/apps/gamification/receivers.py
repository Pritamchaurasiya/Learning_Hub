"""
Signal receivers for Gamification.
"""

from django.dispatch import receiver
from django.db import transaction

from core.signals import lesson_completed, quiz_passed, course_completed
from apps.notifications.services import NotificationService
from apps.notifications.models import Notification
from .models import UserXP, Streak

XP_LESSON_COMPLETION = 10
XP_QUIZ_PASSED = 50
XP_COURSE_COMPLETION = 100  # Bonus


@receiver(lesson_completed)
def handle_lesson_completion(sender, user, lesson, **kwargs):
    """Award XP for completing a lesson."""
    _award_xp(user, XP_LESSON_COMPLETION)
    _update_streak(user)


@receiver(quiz_passed)
def handle_quiz_passed(sender, user, quiz, **kwargs):
    """Award XP for passing a quiz."""
    _award_xp(user, XP_QUIZ_PASSED)

    NotificationService.create_notification(
        user=user,
        title="Quiz Passed!",
        message=f"You successfully passed {quiz.title} and earned {XP_QUIZ_PASSED} XP.",
        type=Notification.Type.ACHIEVEMENT,
    )


@receiver(course_completed)
def handle_course_completion(sender, user, course, **kwargs):
    """Award XP for finishing a course."""
    _award_xp(user, XP_COURSE_COMPLETION)

    NotificationService.create_notification(
        user=user,
        title="Course Completed!",
        message=f"Congratulations! You've completed {course.title}.",
        type=Notification.Type.ACHIEVEMENT,
    )


def _award_xp(user, amount):
    """Atomic XP update."""
    with transaction.atomic():
        xp, _ = UserXP.objects.get_or_create(user=user)
        xp.add_xp(amount)


def _update_streak(user):
    """Update daily streak."""
    with transaction.atomic():
        streak, _ = Streak.objects.get_or_create(user=user)
        streak.update_streak()

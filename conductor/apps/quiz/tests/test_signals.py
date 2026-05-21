import pytest
from apps.quiz.models import QuizAttempt, Quiz
from django.contrib.auth import get_user_model
from django.utils import timezone
from apps.courses.models import Course, Category

User = get_user_model()


@pytest.mark.django_db
def test_quiz_attempt_completion_awards_xp():
    user = User.objects.create(
        username="testuser_gamification", email="test@gamification.com"
    )
    instructor = User.objects.create(
        username="instructor1", email="instructor1@gamification.com"
    )

    category = Category.objects.create(name="Test Category", slug="test-category")
    course = Course.objects.create(
        title="Test Course", category=category, instructor=instructor
    )

    quiz = Quiz.objects.create(
        course=course, title="Test Quiz", is_published=True, passing_score=70
    )

    user.xp_profile.refresh_from_db()
    initial_xp = user.xp_profile.total_xp

    attempt = QuizAttempt.objects.create(
        user=user, quiz=quiz, status="in_progress", max_score=100
    )

    # Simulate completion with passing score
    attempt.status = "completed"
    attempt.percentage_score = 80
    attempt.score = 80
    attempt.completed_at = timezone.now()
    attempt.save()  # This triggers the signal

    user.xp_profile.refresh_from_db()

    # Assert XP was awarded (default is 100 for >= 70%)
    assert user.xp_profile.total_xp == initial_xp + 100


@pytest.mark.django_db
def test_quiz_attempt_high_score_awards_more_xp():
    user = User.objects.create(
        username="testuser_gamification2", email="test2@gamification.com"
    )
    instructor = User.objects.create(
        username="instructor2", email="instructor2@gamification.com"
    )

    category = Category.objects.create(name="Test Category", slug="test-category2")
    course = Course.objects.create(
        title="Test Course", category=category, instructor=instructor
    )

    quiz = Quiz.objects.create(
        course=course, title="Test Quiz", is_published=True, passing_score=70
    )

    user.xp_profile.refresh_from_db()
    initial_xp = user.xp_profile.total_xp

    attempt = QuizAttempt.objects.create(
        user=user, quiz=quiz, status="in_progress", max_score=100
    )

    # Simulate completion with 90+ score
    attempt.status = "completed"
    attempt.percentage_score = 95
    attempt.score = 95
    attempt.completed_at = timezone.now()
    attempt.save()  # This triggers the signal

    user.xp_profile.refresh_from_db()

    # Assert XP was awarded (150 for >= 90%)
    assert user.xp_profile.total_xp == initial_xp + 150

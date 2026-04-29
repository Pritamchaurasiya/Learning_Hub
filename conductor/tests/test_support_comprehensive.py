"""
Comprehensive tests for Support module.
"""

import pytest
from django.utils import timezone

from apps.support.models import Feedback


@pytest.mark.django_db
class TestFeedbackModel:
    """Tests for Feedback model."""

    def test_feedback_creation(self, user):
        """Test feedback is created correctly."""
        feedback = Feedback.objects.create(
            user=user,
            subject="Test Subject",
            message="Test Description",
            category=Feedback.Category.GENERAL,
            status=Feedback.Status.OPEN,
        )
        
        assert feedback.user == user
        assert feedback.subject == "Test Subject"
        assert feedback.status == Feedback.Status.OPEN

    def test_feedback_status_update(self, user):
        """Test feedback status can be updated."""
        feedback = Feedback.objects.create(
            user=user,
            subject="Test",
            message="Test",
            status=Feedback.Status.OPEN,
        )
        
        feedback.status = Feedback.Status.RESOLVED
        feedback.save()
        
        feedback.refresh_from_db()
        assert feedback.status == Feedback.Status.RESOLVED

    def test_feedback_categories(self, user):
        """Test all categories work."""
        categories = [
            Feedback.Category.GENERAL,
            Feedback.Category.BUG,
            Feedback.Category.CONTENT,
            Feedback.Category.BILLING,
            Feedback.Category.FEATURE,
            Feedback.Category.OTHER,
        ]
        
        for i, category in enumerate(categories):
            feedback = Feedback.objects.create(
                user=user,
                subject=f"Test {i}",
                message=f"Test {i}",
                category=category,
            )
            assert feedback.category == category

    def test_feedback_status_choices(self, user):
        """Test all status choices work."""
        statuses = [
            Feedback.Status.OPEN,
            Feedback.Status.IN_PROGRESS,
            Feedback.Status.ESCALATED,
            Feedback.Status.RESOLVED,
            Feedback.Status.CLOSED,
        ]
        
        for i, fb_status in enumerate(statuses):
            feedback = Feedback.objects.create(
                user=user,
                subject=f"Status Test {i}",
                message=f"Status Test {i}",
                status=fb_status,
            )
            assert feedback.status == fb_status

    def test_feedback_str_representation(self, user):
        """Test string representation of feedback."""
        feedback = Feedback.objects.create(
            user=user,
            subject="Test Subject",
            message="Test Message",
            category=Feedback.Category.BUG,
        )
        
        result = str(feedback)
        assert "Test Subject" in result
        assert user.email in result

    def test_feedback_ordering(self, user):
        """Test feedback is ordered by created_at desc."""
        f1 = Feedback.objects.create(
            user=user,
            subject="First",
            message="First feedback",
        )
        f2 = Feedback.objects.create(
            user=user,
            subject="Second",
            message="Second feedback",
        )
        
        feedbacks = list(Feedback.objects.filter(user=user))
        # Most recent should be first
        assert feedbacks[0].id == f2.id

    def test_feedback_urgency_score(self, user):
        """Test urgency score default and update."""
        feedback = Feedback.objects.create(
            user=user,
            subject="Urgent",
            message="Critical issue",
        )
        
        assert feedback.urgency_score == 1  # Default
        
        feedback.urgency_score = 10
        feedback.save()
        
        feedback.refresh_from_db()
        assert feedback.urgency_score == 10

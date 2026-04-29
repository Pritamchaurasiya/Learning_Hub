import pytest
from django.db import transaction, IntegrityError
from django.core.exceptions import ValidationError

@pytest.mark.django_db
class TestSystemEdgeCases:
    """
    Tests specific complex edge cases uncovered during backend hardening.
    Focuses on race conditions, limits, and state consistency.
    """
    
    def test_study_group_overflow_prevention(self, db, create_user):
        """Ensure Study Groups strictly enforce max_members even under concurrent-like loads."""
        from apps.study_groups.models import StudyGroup, GroupMembership
        from apps.study_groups.serializers import GroupMembershipSerializer
        
        creator = create_user(username="creator1", email="creator1@example.com")
        # Create a group with max_members = 2
        group = StudyGroup.objects.create(name="Small Group", topic="Python", creator=creator, max_members=2)
        
        # Creator is not automatically a member unless they join. Let's add 2 members.
        user1 = create_user(username="user1", email="user1@example.com")
        user2 = create_user(username="user2", email="user2@example.com")
        user3 = create_user(username="user3", email="user3@example.com")
        
        GroupMembership.objects.create(group=group, user=user1)
        GroupMembership.objects.create(group=group, user=user2)
        
        from rest_framework.test import APIClient
        client = APIClient()
        client.force_authenticate(user=user3)
        
        from unittest.mock import patch
        with patch('django.db.models.query.QuerySet.select_for_update', lambda self, **kwargs: self):
            response = client.post(f"/api/v1/study/groups/{group.id}/join/")
            
        assert response.status_code == 400
        assert "Group is full" in response.data.get("message", "")
            
    def test_payment_duplicate_order_prevention(self, db, create_user, course):
        """Ensure the same user cannot enroll twice in the same course."""
        from apps.courses.models import Enrollment
        
        user = create_user(username="buyer", email="buyer@example.com")
        
        # Enroll the user once (directly, to simulate completed purchase)
        Enrollment.objects.create(user=user, course=course)
        
        # Try to enroll again via the API — should get 400 (already enrolled)
        from rest_framework.test import APIClient
        client = APIClient()
        client.force_authenticate(user=user)
        response = client.post(f"/api/v1/courses/{course.slug}/enroll/")
        assert response.status_code in [400, 409]
            
    def test_gamification_streak_resilience(self, db, create_user):
        """Test daily streak increments handle fast-clicking gracefully."""
        from apps.gamification.models import Streak
        from django.utils import timezone
        
        user = create_user(username="streaker")
        streak = Streak.objects.create(user=user)
        
        # Update streak multiple times on the same day
        streak.update_streak()
        count1 = streak.current_streak
        
        streak.update_streak()
        count2 = streak.current_streak
        
        assert count1 == count2 == 1, "Streak should not increment multiple times on the same day"

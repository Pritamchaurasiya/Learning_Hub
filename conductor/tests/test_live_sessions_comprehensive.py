"""
Comprehensive tests for Live Sessions module.
"""

import pytest
from django.utils import timezone
from datetime import timedelta

from apps.live_sessions.models import LiveSession, SessionAttendee


@pytest.mark.django_db
class TestLiveSessionModel:
    """Tests for LiveSession model."""

    def test_live_session_creation(self, instructor, course):
        """Test live session is created correctly."""
        session = LiveSession.objects.create(
            title="Test Live Session",
            description="Test Description",
            host=instructor,
            course=course,
            scheduled_time=timezone.now() + timedelta(hours=1),
            duration_minutes=60,
        )
        
        assert session.title == "Test Live Session"
        assert session.host == instructor
        assert session.status == 'scheduled'

    def test_live_session_status_transitions(self, instructor, course):
        """Test live session status transitions."""
        session = LiveSession.objects.create(
            title="Test",
            host=instructor,
            course=course,
            scheduled_time=timezone.now(),
            duration_minutes=60,
        )
        
        # Start session
        session.status = 'live'
        session.save()
        
        session.refresh_from_db()
        assert session.status == 'live'

    def test_session_attendee_creation(self, instructor, user, course):
        """Test session attendee is created correctly."""
        session = LiveSession.objects.create(
            title="Test",
            host=instructor,
            course=course,
            scheduled_time=timezone.now(),
            duration_minutes=60,
        )
        
        attendee = SessionAttendee.objects.create(
            session=session,
            user=user,
        )
        
        assert attendee.session == session
        assert attendee.user == user

    def test_unique_attendee_per_session(self, instructor, user, course):
        """Test same user cannot join session twice."""
        session = LiveSession.objects.create(
            title="Test",
            host=instructor,
            course=course,
            scheduled_time=timezone.now(),
            duration_minutes=60,
        )
        
        SessionAttendee.objects.create(session=session, user=user)
        
        from django.db import IntegrityError
        with pytest.raises(IntegrityError):
            SessionAttendee.objects.create(session=session, user=user)

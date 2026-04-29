"""
Comprehensive tests for Tutors module.
"""

import pytest
from django.utils import timezone
from datetime import timedelta

from apps.tutors.models import TutorProfile, Booking


@pytest.mark.django_db
class TestTutorProfileModel:
    """Tests for TutorProfile model."""

    def test_tutor_profile_creation(self, instructor):
        """Test tutor profile is created correctly."""
        profile = TutorProfile.objects.create(
            user=instructor,
            bio="Expert Python Developer",
            hourly_rate=50.00,
            is_verified=True,
            skills="Python, Django, AI",
        )
        
        assert profile.user == instructor
        assert profile.hourly_rate == 50.00
        assert profile.is_verified is True
        assert "Python" in profile.skills

    def test_tutor_rating_update(self, instructor):
        """Test tutor rating can be updated."""
        profile = TutorProfile.objects.create(
            user=instructor,
            bio="Test",
            hourly_rate=50.00,
            rating=4.5,
            total_reviews=10,
            skills="Testing",
        )
        
        # Add new review
        profile.rating = 4.6
        profile.total_reviews = 11
        profile.save()
        
        profile.refresh_from_db()
        assert profile.rating == 4.6
        assert profile.total_reviews == 11

    def test_tutor_str_representation(self, instructor):
        """Test string representation."""
        profile = TutorProfile.objects.create(
            user=instructor,
            bio="Expert",
            hourly_rate=75.00,
            skills="Django, Python",
        )
        
        result = str(profile)
        assert "Tutor" in result


@pytest.mark.django_db
class TestBookingModel:
    """Tests for Booking model."""

    def test_booking_creation(self, instructor, user):
        """Test booking is created correctly."""
        profile = TutorProfile.objects.create(
            user=instructor,
            bio="Expert",
            hourly_rate=50.00,
            skills="Python",
        )
        
        now = timezone.now()
        booking = Booking.objects.create(
            student=user,
            tutor=profile,
            start_time=now + timedelta(hours=1),
            end_time=now + timedelta(hours=2),
            status='pending',
        )
        
        assert booking.student == user
        assert booking.tutor == profile
        assert booking.status == 'pending'

    def test_booking_status_transitions(self, instructor, user):
        """Test booking status transitions."""
        profile = TutorProfile.objects.create(
            user=instructor,
            bio="Expert",
            hourly_rate=50.00,
            skills="Python",
        )
        
        now = timezone.now()
        booking = Booking.objects.create(
            student=user,
            tutor=profile,
            start_time=now + timedelta(hours=1),
            end_time=now + timedelta(hours=2),
        )
        
        # Confirm booking
        booking.status = 'confirmed'
        booking.save()
        
        booking.refresh_from_db()
        assert booking.status == 'confirmed'
        
        # Complete booking
        booking.status = 'completed'
        booking.save()
        
        booking.refresh_from_db()
        assert booking.status == 'completed'

"""
Tests for Phase 3: Multi-Channel Notifications, Anti-Noise Engine, and Quiet Hours in Student Updates Hub.
"""
import datetime
from django.utils import timezone
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
import pytest

from apps.updates.models import (
    StudentUpdate,
    UpdateSource,
    UpdateSubscription,
    UpdateNotificationPreference,
    QueuedUpdateNotification,
    UpdateNotificationAudit,
)
from apps.updates.services import StudentUpdateService

User = get_user_model()


@pytest.fixture
def test_user(db):
    user = User.objects.create_user(
        email='student_notifications@test.com',
        username='student_notif',
        password='ValidPassword123!',
        role='STUDENT'
    )
    return user


@pytest.fixture
def staff_user(db):
    user = User.objects.create_user(
        email='admin_notifications@test.com',
        username='admin_notif',
        password='ValidPassword123!',
        role='ADMIN',
        is_staff=True,
        is_superuser=True
    )
    return user


@pytest.fixture
def sample_source(db):
    return UpdateSource.objects.create(
        source_id='src-test-notifications',
        name='Notification Test University',
        domain='notif-univ.ac.in',
        source_type='OFFICIAL_UNIVERSITY',
        authority_level=1,
        category='ACADEMIC',
        institution='Notification Test University',
        base_url='https://notif-univ.ac.in'
    )


@pytest.fixture
def urgent_update(db, sample_source):
    return StudentUpdate.objects.create(
        source=sample_source,
        title='URGENT: Semester Examination Postponed',
        summary='Due to emergency state elections, all undergraduate examinations scheduled for tomorrow are postponed.',
        source_url='https://notif-univ.ac.in/emergency-circular-1',
        category='EXAMINATION',
        sub_category='TIMETABLE_CHANGE',
        institution='Notification Test University',
        course='B.Tech',
        importance='URGENT',
        status='PUBLISHED',
        content_hash='hash-urgent-test-1',
    )


@pytest.fixture
def regular_update(db, sample_source):
    return StudentUpdate.objects.create(
        source=sample_source,
        title='Annual Sports Meet Registration Form Open',
        summary='Students interested in inter-college basketball and cricket tournaments must register before weekend.',
        source_url='https://notif-univ.ac.in/sports-meet-2026',
        category='GENERAL',
        sub_category='SPORTS',
        institution='Notification Test University',
        course='B.Tech',
        importance='NORMAL',
        status='PUBLISHED',
        content_hash='hash-regular-test-1',
    )


@pytest.mark.django_db
class TestAntiNoiseAndQuietHoursLogic:
    def test_default_preferences_creation(self, test_user):
        pref = StudentUpdateService.get_or_create_user_preferences(test_user)
        assert pref.user == test_user
        assert pref.quiet_hours_enabled is True
        assert pref.quiet_hours_start == datetime.time(22, 0)
        assert pref.quiet_hours_end == datetime.time(7, 0)
        assert pref.max_daily_push == 3
        assert pref.digest_mode is False

    def test_quiet_hours_evaluation(self, test_user):
        pref = StudentUpdateService.get_or_create_user_preferences(test_user)
        # Inside quiet hours: 23:30 (11:30 PM)
        assert pref.is_in_quiet_hours(datetime.time(23, 30)) is True
        # Inside quiet hours: 03:00 (3:00 AM)
        assert pref.is_in_quiet_hours(datetime.time(3, 0)) is True
        # Inside quiet hours: 06:59 (6:59 AM)
        assert pref.is_in_quiet_hours(datetime.time(6, 59)) is True
        # Outside quiet hours: 14:00 (2:00 PM)
        assert pref.is_in_quiet_hours(datetime.time(14, 0)) is False
        # Outside quiet hours: 10:00 (10:00 AM)
        assert pref.is_in_quiet_hours(datetime.time(10, 0)) is False

    def test_urgent_notice_bypasses_quiet_hours(self, test_user, urgent_update):
        pref = StudentUpdateService.get_or_create_user_preferences(test_user)
        # Midnight 01:00 AM
        eval_res = pref.evaluate_delivery(
            urgent_update,
            today_delivered_count=10,
            current_time=datetime.time(1, 0)
        )
        assert eval_res['channel'] == 'IMMEDIATE'
        assert eval_res['bypass_quiet_hours'] is True

    def test_regular_notice_queued_during_quiet_hours(self, test_user, regular_update):
        pref = StudentUpdateService.get_or_create_user_preferences(test_user)
        eval_res = pref.evaluate_delivery(
            regular_update,
            today_delivered_count=0,
            current_time=datetime.time(23, 0)  # 11 PM
        )
        assert eval_res['channel'] == 'QUEUED_QUIET_HOURS'
        assert eval_res['bypass_quiet_hours'] is False

    def test_daily_push_cap_enforced(self, test_user, regular_update):
        pref = StudentUpdateService.get_or_create_user_preferences(test_user)
        # Daytime 12:00 PM, but student already received 3 notices today (cap is 3)
        eval_res = pref.evaluate_delivery(
            regular_update,
            today_delivered_count=3,
            current_time=datetime.time(12, 0)
        )
        assert eval_res['channel'] == 'SUPPRESSED'
        assert 'reached' in eval_res['reason']


@pytest.mark.django_db
class TestNotificationDispatcherService:
    def test_dispatch_to_subscribers_immediate(self, test_user, sample_source, urgent_update):
        # Follow the university
        UpdateSubscription.objects.create(
            user=test_user,
            target_type='INSTITUTION',
            target_value='Notification Test University'
        )

        res = StudentUpdateService.dispatch_update_notification(urgent_update, force_immediate=True)
        assert res['total_subscribers'] == 1
        assert res['immediate_delivered'] == 1

        # Check audit log
        audit = UpdateNotificationAudit.objects.filter(user=test_user, update=urgent_update).first()
        assert audit is not None
        assert audit.decision == 'IMMEDIATE'

    def test_dispatch_during_quiet_hours_creates_queued_notification(self, test_user, sample_source, regular_update):
        UpdateSubscription.objects.create(
            user=test_user,
            target_type='CATEGORY',
            target_value='GENERAL'
        )

        # Force quiet hours
        pref = StudentUpdateService.get_or_create_user_preferences(test_user)
        pref.quiet_hours_start = datetime.time(0, 0)
        pref.quiet_hours_end = datetime.time(23, 59)
        pref.save()

        res = StudentUpdateService.dispatch_update_notification(regular_update)
        assert res['total_subscribers'] == 1
        assert res['queued_quiet_hours'] == 1

        queued = QueuedUpdateNotification.objects.filter(user=test_user, update=regular_update).first()
        assert queued is not None
        assert queued.queue_reason == 'QUIET_HOURS'
        assert queued.is_dispatched is False

    def test_release_queued_notifications(self, test_user, regular_update):
        past_time = timezone.now() - datetime.timedelta(minutes=10)
        queued = QueuedUpdateNotification.objects.create(
            user=test_user,
            update=regular_update,
            queue_reason='QUIET_HOURS',
            scheduled_for=past_time,
            is_dispatched=False
        )

        released_ids = StudentUpdateService.release_queued_notifications()
        assert queued.id in released_ids
        queued.refresh_from_db()
        assert queued.is_dispatched is True
        assert queued.dispatched_at is not None


@pytest.mark.django_db
class TestNotificationAPIEndpoints:
    def test_get_and_patch_notification_preferences(self, test_user):
        client = APIClient()
        client.force_authenticate(user=test_user)

        # GET default
        get_res = client.get('/api/v1/updates/preferences/')
        assert get_res.status_code == 200
        data = get_res.json()['data']
        assert data['quiet_hours_enabled'] is True
        assert data['max_daily_push'] == 3

        # PATCH update
        patch_res = client.patch(
            '/api/v1/updates/preferences/',
            {'quiet_hours_start': '21:00:00', 'max_daily_push': 5, 'digest_mode': True},
            format='json'
        )
        assert patch_res.status_code == 200
        updated_data = patch_res.json()['data']
        assert updated_data['max_daily_push'] == 5
        assert updated_data['digest_mode'] is True

    def test_broadcast_endpoint_requires_staff(self, test_user, staff_user, urgent_update):
        # Regular student cannot broadcast
        client = APIClient()
        client.force_authenticate(user=test_user)
        res = client.post(f'/api/v1/updates/{urgent_update.id}/broadcast/')
        assert res.status_code == 403

        # Staff can broadcast
        staff_client = APIClient()
        staff_client.force_authenticate(user=staff_user)
        broadcast_res = staff_client.post(
            f'/api/v1/updates/{urgent_update.id}/broadcast/',
            {'force_immediate': True},
            format='json'
        )
        assert broadcast_res.status_code == 200
        assert 'total_subscribers' in broadcast_res.json()['data']

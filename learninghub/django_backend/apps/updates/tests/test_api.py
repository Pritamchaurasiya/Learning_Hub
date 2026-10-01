"""
API Integration Tests for Student Updates Hub.
"""
import pytest
from django.utils import timezone
from datetime import timedelta
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model

from apps.updates.models import UpdateSource, StudentUpdate

User = get_user_model()


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def auth_user(db):
    user = User.objects.create_user(
        email="student@learninghub.io",
        username="student1",
        password="TestPassword123!"
    )
    return user


@pytest.fixture
def seed_data(db):
    source = UpdateSource.objects.create(
        source_id="src-mgkvp",
        name="MGKVP Official",
        domain="mgkvp.ac.in",
        authority_level=1,
        category="ACADEMIC",
        institution="Mahatma Gandhi Kashi Vidyapith (MGKVP)",
        base_url="https://mgkvp.ac.in",
        is_enabled=True
    )
    now = timezone.now()
    update1 = StudentUpdate.objects.create(
        id="upd-test-1",
        source=source,
        title="MGKVP BCA Exam Form Extended",
        summary="Examination form filling extended.",
        source_url="https://mgkvp.ac.in/notice/1",
        category="EXAMINATION",
        sub_category="EXAM_FORM",
        institution="Mahatma Gandhi Kashi Vidyapith (MGKVP)",
        course="BCA",
        semester="2nd",
        published_at=now,
        deadline=now + timedelta(days=5),
        importance="URGENT",
        status="PUBLISHED",
        verification_status="VERIFIED",
        content_hash="hash-1"
    )
    update2 = StudentUpdate.objects.create(
        id="upd-test-2",
        source=source,
        title="General College Holiday List",
        summary="Annual festival holidays announced.",
        source_url="https://mgkvp.ac.in/notice/2",
        category="ACADEMIC",
        sub_category="UNIVERSITY_NOTICE",
        institution="Mahatma Gandhi Kashi Vidyapith (MGKVP)",
        published_at=now - timedelta(days=2),
        importance="NORMAL",
        status="PUBLISHED",
        verification_status="VERIFIED",
        content_hash="hash-2"
    )
    return source, update1, update2


@pytest.mark.django_db
def test_list_updates_api(api_client, seed_data):
    res = api_client.get('/api/v1/updates/')
    assert res.status_code == 200
    data = res.json()
    assert data['status'] == 'success'
    assert len(data['data']) == 2
    assert data['meta']['count'] == 2


@pytest.mark.django_db
def test_filter_updates_by_category(api_client, seed_data):
    res = api_client.get('/api/v1/updates/?category=EXAMINATION')
    assert res.status_code == 200
    data = res.json()
    assert data['status'] == 'success'
    assert len(data['data']) == 1
    assert data['data'][0]['category'] == 'EXAMINATION'


@pytest.mark.django_db
def test_get_update_detail_api(api_client, seed_data):
    res = api_client.get('/api/v1/updates/upd-test-1/')
    assert res.status_code == 200
    data = res.json()
    assert data['status'] == 'success'
    assert data['data']['id'] == 'upd-test-1'
    assert data['data']['source']['name'] == 'MGKVP Official'
    assert data['data']['source']['authority_level'] == 1


@pytest.mark.django_db
def test_upcoming_deadlines_api(api_client, seed_data):
    res = api_client.get('/api/v1/updates/deadlines/')
    assert res.status_code == 200
    data = res.json()
    assert data['status'] == 'success'
    assert len(data['data']) >= 1
    assert data['data'][0]['id'] == 'upd-test-1'


@pytest.mark.django_db
def test_bookmark_flow_authenticated(api_client, auth_user, seed_data):
    api_client.force_authenticate(user=auth_user)

    # Bookmark
    post_res = api_client.post('/api/v1/updates/upd-test-1/bookmark/', {'notes': 'Check soon'})
    assert post_res.status_code == 200
    assert post_res.json()['data']['is_bookmarked'] is True

    # List bookmarks
    list_res = api_client.get('/api/v1/updates/bookmarks/')
    assert list_res.status_code == 200
    assert len(list_res.json()['data']) == 1

    # Unbookmark
    del_res = api_client.delete('/api/v1/updates/upd-test-1/bookmark/')
    assert del_res.status_code == 200
    assert del_res.json()['data']['is_bookmarked'] is False


@pytest.mark.django_db
def test_notification_preferences_api(api_client, auth_user):
    api_client.force_authenticate(user=auth_user)

    # Fetch preferences (lazily created)
    res = api_client.get('/api/v1/updates/preferences/')
    assert res.status_code == 200
    data = res.json()['data']
    assert data['quiet_hours_enabled'] is True
    assert data['max_daily_push'] == 3

    # Update preferences
    patch_res = api_client.patch('/api/v1/updates/preferences/', {
        'max_daily_push': 5,
        'quiet_hours_enabled': False,
        'allow_exam_forms': True,
    })
    assert patch_res.status_code == 200
    updated_data = patch_res.json()['data']
    assert updated_data['max_daily_push'] == 5
    assert updated_data['quiet_hours_enabled'] is False


@pytest.mark.django_db
def test_auto_schedule_deadline_reminders_api(api_client, auth_user, seed_data):
    api_client.force_authenticate(user=auth_user)

    res = api_client.post('/api/v1/updates/upd-test-1/auto-remind/')
    assert res.status_code == 201
    data = res.json()
    assert data['status'] == 'success'
    # Should schedule upcoming tiers
    assert len(data['data']) >= 1


@pytest.mark.django_db
def test_result_watcher_workflow_and_match(api_client, auth_user, seed_data):
    api_client.force_authenticate(user=auth_user)

    # 1. Register a Result Watcher
    create_res = api_client.post('/api/v1/updates/result-watchers/', {
        'institution': 'MGKVP',
        'course': 'BCA',
        'semester': 'Semester 4',
        'roll_number': '210100456',
    })
    assert create_res.status_code == 201
    watcher_data = create_res.json()['data']
    assert watcher_data['status'] == 'ACTIVE'
    watcher_id = watcher_data['id']

    # 2. List result watchers
    list_res = api_client.get('/api/v1/updates/result-watchers/')
    assert list_res.status_code == 200
    assert len(list_res.json()['data']) == 1

    # 3. Ingest a matching result notice
    from apps.updates.services import StudentUpdateService
    result_notice = StudentUpdateService.ingest_notice_from_source(
        source_or_id='src-mgkvp',
        raw_payload={
            'title': 'Declaration of MGKVP BCA Semester 4 Examination Results 2026',
            'summary': 'Official marksheets and scorecards released online.',
            'category': 'RESULT',
            'institution': 'MGKVP',
            'course': 'BCA',
            'semester': 'Semester 4',
            'url': 'https://mgkvp.ac.in/results/bca-sem4.html',
            'status': 'PUBLISHED',
        }
    )

    # 4. Verify the watcher status became RESULT_DECLARED
    detail_res = api_client.get(f'/api/v1/updates/result-watchers/{watcher_id}/')
    assert detail_res.status_code == 200
    w_detail = detail_res.json()['data']
    assert w_detail['status'] == 'RESULT_DECLARED'
    assert w_detail['result_url'] == 'https://mgkvp.ac.in/results/bca-sem4.html'
    assert w_detail['matched_update'] == result_notice.id

    # 5. Delete watcher
    del_res = api_client.delete(f'/api/v1/updates/result-watchers/{watcher_id}/')
    assert del_res.status_code == 200


@pytest.mark.django_db
def test_sync_update_to_planner_api(api_client, auth_user, seed_data):
    api_client.force_authenticate(user=auth_user)

    res = api_client.post(
        '/api/v1/updates/upd-test-1/sync-planner/',
        {'note': 'Revise DSA Chapter 1-5'}
    )
    assert res.status_code == 200
    data = res.json()
    assert data['status'] == 'success'
    assert data['data']['update_id'] == 'upd-test-1'
    assert data['data']['is_synced'] is True
    assert 'calendar.google.com' in data['data']['google_calendar_url']
    assert '/api/v1/updates/upd-test-1/calendar.ics' in data['data']['ical_download_url']


@pytest.mark.django_db
def test_calendar_ics_export_api(api_client, seed_data):
    res = api_client.get('/api/v1/updates/upd-test-1/calendar.ics')
    assert res.status_code == 200
    assert 'text/calendar' in res['Content-Type']
    content = res.content.decode('utf-8')
    assert 'BEGIN:VCALENDAR' in content
    assert 'BEGIN:VEVENT' in content
    assert 'UID:lh-update-upd-test-1@learninghub.com' in content
    assert 'END:VCALENDAR' in content


@pytest.mark.django_db
def test_crosslink_ecosystem_synthesis(api_client, seed_data):
    from apps.updates.services import StudentUpdateService
    update = StudentUpdateService.ingest_notice_from_source(
        source_or_id='src-mgkvp',
        raw_payload={
            'title': 'AKTU B.Tech Engineering Examination Carry Over Form 2026',
            'summary': 'Core Engineering and Computer Systems branch form submission date.',
            'category': 'EXAMINATION',
            'institution': 'AKTU',
            'course': 'B.Tech',
            'deadline_str': '25-10-2026',
            'url': 'https://aktu.ac.in/notice-eng.html',
            'status': 'PUBLISHED',
        }
    )

    detail_res = api_client.get(f'/api/v1/updates/{update.id}/')
    assert detail_res.status_code == 200
    cross_links = detail_res.json()['data'].get('cross_links', [])
    assert len(cross_links) >= 2
    types = [cl['content_type'] for cl in cross_links]
    assert 'TEST' in types or 'STUDY_PLAN' in types


@pytest.mark.django_db
def test_college_circular_publish_and_list_api(api_client, auth_user):
    api_client.force_authenticate(user=auth_user)

    payload = {
        'title': 'Computer Science Department Lab Exam Schedule Notice',
        'summary': 'All BCA and MCA students must report for practical lab examinations on 12th October.',
        'department': 'Computer Science & Engineering',
        'institution': 'Kashi Institute of Technology',
        'issuer_name': 'Prof. Rajesh Sharma',
        'issuer_role': 'HEAD_OF_DEPARTMENT',
        'circular_number': 'KIT/CSE/2026/089',
        'category': 'ACADEMIC',
        'sub_category': 'DEPARTMENTAL_CIRCULAR',
        'importance': 'IMPORTANT',
        'course': 'BCA',
        'semester': '5th Semester',
    }

    create_res = api_client.post('/api/v1/updates/college-circulars/publish/', payload)
    assert create_res.status_code == 201
    res_data = create_res.json()
    assert res_data['status'] == 'success'
    circ_id = res_data['data']['id']
    assert 'upd-dept-' in circ_id
    assert res_data['data']['department'] == 'Computer Science & Engineering'
    assert res_data['data']['issuer_name'] == 'Prof. Rajesh Sharma'
    assert res_data['data']['authority_level'] == 2

    # Query departmental circulars list
    list_res = api_client.get('/api/v1/updates/college-circulars/?department=Computer+Science')
    assert list_res.status_code == 200
    list_data = list_res.json()['data']
    assert list_data['total_count'] >= 1
    assert any(c['id'] == circ_id for c in list_data['results'])


@pytest.mark.django_db
def test_notice_engagement_and_analytics_api(api_client, seed_data):
    # 1. Post impressions and clicks
    imp_res = api_client.post(
        '/api/v1/updates/upd-test-1/engagement/',
        {'event_type': 'IMPRESSION', 'client_hash': 'anon-hash-123'}
    )
    assert imp_res.status_code == 201

    clk_res = api_client.post(
        '/api/v1/updates/upd-test-1/engagement/',
        {'event_type': 'CLICK_DETAIL', 'client_hash': 'anon-hash-123'}
    )
    assert clk_res.status_code == 201

    # 2. Get notice analytics
    analytics_res = api_client.get('/api/v1/updates/upd-test-1/analytics/')
    assert analytics_res.status_code == 200
    adata = analytics_res.json()['data']
    assert adata['update_id'] == 'upd-test-1'
    assert adata['impressions'] >= 1
    assert adata['detail_clicks'] >= 1
    assert adata['click_through_rate'] > 0

    # 3. Get platform overview analytics
    global_res = api_client.get('/api/v1/updates/analytics/overview/')
    assert global_res.status_code == 200
    gdata = global_res.json()['data']
    assert gdata['total_events'] >= 2
    assert gdata['total_impressions'] >= 1




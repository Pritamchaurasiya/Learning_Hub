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

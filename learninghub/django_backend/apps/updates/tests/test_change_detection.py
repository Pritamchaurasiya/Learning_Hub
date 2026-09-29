"""
Tests for Change Detection, SHA-256 Hashing, and Version Diffing.
"""
import pytest
from apps.updates.models import UpdateSource, StudentUpdate
from apps.updates.services import ingest_notice_from_source


@pytest.fixture
def test_source(db):
    return UpdateSource.objects.create(
        source_id="src-test-university",
        name="Test University",
        domain="testuni.edu.in",
        source_type="UNIVERSITY",
        authority_level=1,
        category="ACADEMIC",
        institution="Test University",
        base_url="https://testuni.edu.in",
        fetch_method="HTML_TABLE",
        is_enabled=True
    )


@pytest.mark.django_db
def test_ingestion_and_change_detection(test_source):
    # 1. Initial ingestion
    notice_v1 = {
        'title': 'BCA 2nd Sem Examination Form Released',
        'url': 'https://testuni.edu.in/notices/exam-form-101.html',
        'date_str': '10-10-2026',
        'deadline_str': '25-10-2026',
        'summary': 'Students can submit forms online until 25th October.',
        'category': 'EXAMINATION',
        'sub_category': 'EXAM_FORM',
        'course': 'BCA',
        'semester': '2nd',
        'importance': 'IMPORTANT',
        'attachments': [
            {'title': 'Form_Guidelines.pdf', 'url': 'https://testuni.edu.in/docs/form.pdf'}
        ]
    }

    update, created, modified = ingest_notice_from_source(test_source, notice_v1)
    assert created is True
    assert modified is False
    assert update.version == 1
    assert update.status == 'PUBLISHED'
    assert update.verification_status == 'VERIFIED'
    assert update.attachments.count() == 1

    # 2. Re-ingesting identical content causes NO duplicate and NO modification
    update_same, created_same, modified_same = ingest_notice_from_source(test_source, notice_v1)
    assert created_same is False
    assert modified_same is False
    assert update_same.version == 1
    assert StudentUpdate.objects.count() == 1

    # 3. Ingesting modified notice (e.g. deadline extended)
    notice_v2 = {
        'title': 'BCA 2nd Sem Examination Form Extended to 30th Oct',
        'url': 'https://testuni.edu.in/notices/exam-form-101.html',
        'date_str': '10-10-2026',
        'deadline_str': '30-10-2026',
        'summary': 'Deadline extended to 30th October 2026.',
        'category': 'EXAMINATION',
        'sub_category': 'EXAM_FORM',
        'course': 'BCA',
        'semester': '2nd',
        'importance': 'URGENT',
    }

    update_v2, created_v2, modified_v2 = ingest_notice_from_source(test_source, notice_v2)
    assert created_v2 is False
    assert modified_v2 is True
    assert update_v2.version == 2
    assert update_v2.importance == 'URGENT'
    assert update_v2.versions.count() == 1
    prev_ver = update_v2.versions.first()
    assert prev_ver.version_number == 1
    assert 'Examination Form Released' in prev_ver.title

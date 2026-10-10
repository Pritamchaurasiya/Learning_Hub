import pytest
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model
from django.utils import timezone

from apps.exams.models import Country, Exam, Subject
from apps.test_engine.models import (
    Test,
    Question,
    Option,
    TestQuestion,
    TestAttempt,
)
from apps.test_engine.services import TestSessionManager

User = get_user_model()


@pytest.fixture
def verification_setup(db):
    user = User.objects.create_user(
        username='scorecard_tester',
        email='scorecard@example.com',
        first_name='Ananya',
        last_name='Sharma',
    )
    country = Country.objects.create(name='India', code='IN')
    exam = Exam.objects.create(country=country, name='National Entrance Exam', code='NEE_2026')
    test = Test.objects.create(
        exam=exam,
        title='National Mathematics Invitational',
        mode='mock',
        time_limit_minutes=60,
        total_marks=100.0,
        is_published=True,
    )
    attempt = TestAttempt.objects.create(
        user=user,
        test=test,
        status='submitted',
        mode='mock',
        score=88.0,
        percentage=88.0,
        passed=True,
        time_taken_seconds=2400,
        started_at=timezone.now(),
        submitted_at=timezone.now(),
        metadata={'proctoring_risk_level': 'EXCELLENT', 'proctoring_incidents': []},
    )
    return {'exam': exam, 'test': test, 'attempt': attempt, 'user': user}


@pytest.mark.django_db
def test_compute_scorecard_audit_digest():
    digest = TestSessionManager.compute_scorecard_audit_digest(
        attempt_id='att-1234',
        score=85,
        percentage=85,
        timestamp='2026-10-10T12:00:00Z',
    )
    assert digest == 'LH-118FE82C-4BD5B272-2DB3D418-4BD5B271'
    assert digest.startswith('LH-')


@pytest.mark.django_db
def test_verify_scorecard_malformed():
    res = TestSessionManager.verify_scorecard(code='invalid-code-123')
    assert res['valid'] is False
    assert res['status'] == 'MALFORMED_CODE'


@pytest.mark.django_db
def test_verify_scorecard_authentic(verification_setup):
    attempt = verification_setup['attempt']
    issued_at = attempt.submitted_at.isoformat()
    expected_code = TestSessionManager.compute_scorecard_audit_digest(
        str(attempt.id),
        attempt.score,
        attempt.percentage,
        issued_at,
    )

    res = TestSessionManager.verify_scorecard(code=expected_code, attempt_id=str(attempt.id))
    assert res['valid'] is True
    assert res['status'] == 'AUTHENTIC_VERIFIED'
    assert res['score'] == 88.0
    assert res['percentage'] == 88.0
    assert res['passed'] is True
    assert res['integrity_risk_level'] == 'EXCELLENT'
    assert res['proctoring_verified'] is True
    assert res['candidate_name'] == 'Ananya Sharma'


@pytest.mark.django_db
def test_verify_scorecard_tampered(verification_setup):
    attempt = verification_setup['attempt']
    tampered_code = 'LH-00000001-11111111-22222222-33333333'
    res = TestSessionManager.verify_scorecard(code=tampered_code, attempt_id=str(attempt.id))
    assert res['valid'] is False
    assert res['status'] == 'TAMPERED_OR_CORRUPT'


@pytest.mark.django_db
def test_verify_scorecard_api_endpoint(verification_setup):
    client = APIClient()
    attempt = verification_setup['attempt']
    issued_at = attempt.submitted_at.isoformat()
    expected_code = TestSessionManager.compute_scorecard_audit_digest(
        str(attempt.id),
        attempt.score,
        attempt.percentage,
        issued_at,
    )

    url = f'/api/v1/tests/verify-scorecard/?code={expected_code}&attempt={attempt.id}'
    response = client.get(url)
    assert response.status_code == 200
    data = response.json()
    assert data['status'] == 'success'
    assert data['data']['valid'] is True
    assert data['data']['status'] == 'AUTHENTIC_VERIFIED'
    assert data['data']['candidate_name'] == 'Ananya Sharma'

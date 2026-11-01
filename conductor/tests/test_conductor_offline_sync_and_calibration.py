"""
Unit and integration tests for Conductor's Offline Sync Reconciliation and IRT Parameter Calibration.
Validates:
- Offline attempt ingestion, grading, and duplicate idempotency.
- Single and batch offline reconciliation endpoints (POST /api/v1/tests/{id}/offline-sync/).
- Empirical IRT calibration worker tasks (recalculate_question_stats and calibrate_question_bank_irt_parameters).
"""

import pytest
from rest_framework import status
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model
from django.utils import timezone

from apps.exams.models import Country, Exam, Subject, Topic
from apps.test_engine.models import (
    Test,
    Question,
    Option,
    TestQuestion,
    TestAttempt,
    AttemptAnswer,
)
from apps.test_engine.services import TestSessionManager
from apps.test_engine.tasks import (
    recalculate_question_stats,
    calibrate_question_bank_irt_parameters,
)

User = get_user_model()


@pytest.fixture
def auth_client(db):
    client = APIClient()
    user = User.objects.create_user(
        username="offline_sync_tester",
        email="sync_tester@learninghub.app",
        password="TestPassword123!",
    )
    client.force_authenticate(user=user)
    return client, user


@pytest.fixture
def test_setup(db):
    country, _ = Country.objects.get_or_create(code="IN", defaults={"name": "India"})
    exam = Exam.objects.create(
        name="Offline Sync Assessment Exam",
        code="OFFLINE_EXAM_01",
        country=country,
        pattern={"total_questions": 3, "duration_minutes": 20},
        is_active=True,
    )
    subject = Subject.objects.create(
        exam=exam, name="Physics", code="PHY", is_active=True
    )
    topic = Topic.objects.create(subject=subject, name="Mechanics", is_active=True)

    test = Test.objects.create(
        exam=exam,
        title="Offline Mechanics Diagnostic Exam",
        mode="practice",
        difficulty="medium",
        time_limit_minutes=20,
        passing_score=50,
        total_marks=6,
        marks_per_correct=2,
        negative_marks_per_question=0.5,
        is_published=True,
    )

    questions = []
    options_correct = []
    options_wrong = []

    for i in range(1, 4):
        q = Question.objects.create(
            topic=topic,
            text=f"Mechanics Question {i}",
            question_type="mcq",
            difficulty=0.5,
            discrimination=1.0,
            guess_factor=0.25,
            explanation=f"Explanation for question {i}",
        )
        opt_c = Option.objects.create(
            question=q, text=f"Correct Option {i}", is_correct=True, order=1
        )
        opt_w = Option.objects.create(
            question=q, text=f"Incorrect Option {i}", is_correct=False, order=2
        )
        TestQuestion.objects.create(test=test, question=q, order=i, marks=2)
        questions.append(q)
        options_correct.append(opt_c)
        options_wrong.append(opt_w)

    return {
        "exam": exam,
        "test": test,
        "questions": questions,
        "options_correct": options_correct,
        "options_wrong": options_wrong,
    }


@pytest.mark.django_db
def test_reconcile_offline_attempt_single(auth_client, test_setup):
    _, user = auth_client
    test = test_setup["test"]
    questions = test_setup["questions"]
    opt_c = test_setup["options_correct"]
    opt_w = test_setup["options_wrong"]

    # Client answers: Q1 correct, Q2 wrong, Q3 correct
    payload = {
        "attemptId": "offline-client-uuid-101",
        "bundleId": "bundle-phys-01",
        "bundleSignature": "sig-hmac-sha256-verified",
        "answers": {
            str(questions[0].id): str(opt_c[0].id),
            str(questions[1].id): str(opt_w[1].id),
            str(questions[2].id): str(opt_c[2].id),
        },
        "timesSpent": {
            str(questions[0].id): 35,
            str(questions[1].id): 45,
            str(questions[2].id): 20,
        },
        "totalElapsedSeconds": 100,
        "clientStartedAt": "2026-10-10T10:00:00Z",
        "clientCompletedAt": "2026-10-10T10:01:40Z",
    }

    result = TestSessionManager.reconcile_offline_attempt(
        user=user,
        test=test,
        submission_data=payload,
    )

    assert result["status"] == "synced"
    assert result["is_duplicate"] is False
    attempt = result["attempt"]
    assert attempt.mode == "offline"
    assert attempt.status == "submitted"
    assert attempt.correct_count == 2
    assert attempt.incorrect_count == 1
    # 2 correct * 2 marks = 4; 1 wrong * -0.5 = -0.5 => 3.5 marks obtained
    assert attempt.score == 3.5
    assert attempt.total_marks == 6.0
    # percentage = 3.5 / 6.0 * 100 = 58.33%
    assert attempt.percentage == 58.33
    assert attempt.passed is True  # passing score is 50%
    assert attempt.metadata.get("client_attempt_id") == "offline-client-uuid-101"
    assert attempt.metadata.get("bundle_signature") == "sig-hmac-sha256-verified"


@pytest.mark.django_db
def test_reconcile_offline_attempt_idempotency(auth_client, test_setup):
    _, user = auth_client
    test = test_setup["test"]
    questions = test_setup["questions"]
    opt_c = test_setup["options_correct"]

    payload = {
        "attemptId": "offline-client-uuid-idempotent-202",
        "answers": {
            str(questions[0].id): str(opt_c[0].id),
        },
        "totalElapsedSeconds": 50,
    }

    res1 = TestSessionManager.reconcile_offline_attempt(
        user=user, test=test, submission_data=payload
    )
    assert res1["is_duplicate"] is False
    first_attempt_id = res1["attempt"].id

    # Second submission with identical client attempt ID
    res2 = TestSessionManager.reconcile_offline_attempt(
        user=user, test=test, submission_data=payload
    )
    assert res2["is_duplicate"] is True
    assert str(res2["attempt"].id) == str(first_attempt_id)

    # Verify no second attempt was created in DB
    assert TestAttempt.objects.filter(user=user, test=test).count() == 1


@pytest.mark.django_db
def test_offline_sync_api_single_payload(auth_client, test_setup):
    client, user = auth_client
    test = test_setup["test"]
    questions = test_setup["questions"]
    opt_c = test_setup["options_correct"]

    url = f"/api/v1/tests/{test.id}/offline-sync/"
    payload = {
        "attemptId": "offline-api-client-303",
        "answers": {
            str(questions[0].id): str(opt_c[0].id),
            str(questions[1].id): str(opt_c[1].id),
            str(questions[2].id): str(opt_c[2].id),
        },
        "timesSpent": {
            str(questions[0].id): 30,
            str(questions[1].id): 30,
            str(questions[2].id): 30,
        },
        "totalElapsedSeconds": 90,
    }

    resp = client.post(url, payload, format="json")
    assert resp.status_code == status.HTTP_200_OK
    data = resp.data.get("data", {})
    assert data.get("reconciled") is True
    assert data.get("score") == 6.0
    assert data.get("percentage") == 100.0
    assert data.get("passed") is True
    assert data.get("is_duplicate") is False


@pytest.mark.django_db
def test_offline_sync_api_batch_payload(auth_client, test_setup):
    client, user = auth_client
    test = test_setup["test"]
    questions = test_setup["questions"]
    opt_c = test_setup["options_correct"]

    url = f"/api/v1/tests/{test.id}/offline-sync/"
    sync_data = [
        {
            "attemptId": "offline-batch-item-1",
            "answers": {str(questions[0].id): str(opt_c[0].id)},
            "totalElapsedSeconds": 40,
        },
        {
            "attemptId": "offline-batch-item-2",
            "answers": {str(questions[1].id): str(opt_c[1].id)},
            "totalElapsedSeconds": 55,
        },
    ]

    resp = client.post(url, {"sync_data": sync_data}, format="json")
    assert resp.status_code == status.HTTP_200_OK
    data = resp.data.get("data", {})
    assert data.get("reconciled") is True
    assert data.get("batch_count") == 2
    results = data.get("results", [])
    assert len(results) == 2
    assert results[0]["reconciled"] is True
    assert results[1]["reconciled"] is True


@pytest.mark.django_db
def test_offline_sync_fallback_ping(auth_client, test_setup):
    client, user = auth_client
    test = test_setup["test"]

    url = f"/api/v1/tests/{test.id}/offline-sync/"
    resp = client.post(url, {}, format="json")
    assert resp.status_code == status.HTTP_200_OK
    data = resp.data.get("data", {})
    assert data.get("reconciled") is True
    assert data.get("test_id") == str(test.id)


@pytest.mark.django_db
def test_irt_parameter_calibration_worker(auth_client, test_setup):
    test = test_setup["test"]
    questions = test_setup["questions"]
    opt_c = test_setup["options_correct"]
    opt_w = test_setup["options_wrong"]

    # Create 6 distinct users to generate responses for statistical calibration
    for i in range(6):
        u = User.objects.create_user(
            username=f"irt_student_{i}",
            email=f"irt_{i}@learninghub.app",
            password="TestPassword123!",
        )
        attempt = TestAttempt.objects.create(
            user=u,
            test=test,
            session_token=f"token-{i}",
            status="submitted",
            score=5.0 if i < 4 else 1.0,
            total_marks=6.0,
            percentage=83.3 if i < 4 else 16.7,
            passed=i < 4,
            started_at=timezone.now(),
            submitted_at=timezone.now(),
        )

        # Question 0: High accuracy (answered correctly by first 5 users)
        is_corr_q0 = i < 5
        ans_q0 = AttemptAnswer.objects.create(
            attempt=attempt,
            question=questions[0],
            is_correct=is_corr_q0,
            marks_obtained=2.0 if is_corr_q0 else 0.0,
            time_spent_seconds=25,
            answered_at=timezone.now(),
        )
        ans_q0.selected_options.set([opt_c[0] if is_corr_q0 else opt_w[0]])

        # Question 1: Lower accuracy (answered correctly by only 1 user)
        is_corr_q1 = i == 0
        ans_q1 = AttemptAnswer.objects.create(
            attempt=attempt,
            question=questions[1],
            is_correct=is_corr_q1,
            marks_obtained=2.0 if is_corr_q1 else 0.0,
            time_spent_seconds=50,
            answered_at=timezone.now(),
        )
        ans_q1.selected_options.set([opt_c[1] if is_corr_q1 else opt_w[1]])

    # Execute calibration tasks
    task_res = recalculate_question_stats()
    assert task_res["updated"] >= 2

    alias_res = calibrate_question_bank_irt_parameters()
    assert alias_res["updated"] >= 2

    # Refresh questions from DB and verify calibrated parameters
    questions[0].refresh_from_db()
    questions[1].refresh_from_db()

    # Question 0 was easy (5/6 correct) -> calibrated difficulty b should be negative
    assert questions[0].difficulty < 0.0
    assert questions[0].usage_count == 6
    assert questions[0].correct_count == 5
    assert questions[0].discrimination >= 0.35

    # Question 1 was hard (1/6 correct) -> calibrated difficulty b should be positive
    assert questions[1].difficulty > 0.0
    assert questions[1].usage_count == 6
    assert questions[1].correct_count == 1
    assert questions[1].discrimination >= 0.35

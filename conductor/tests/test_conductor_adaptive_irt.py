"""
Unit and integration tests for Conductor's Adaptive IRT Assessment Engine.
Tests 2PL/3PL probability curves, Fisher Information maximization, Bayesian EAP
ability estimation, confidence intervals, and full API endpoint workflows.
"""

import pytest
import math
from rest_framework import status
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model

from apps.exams.models import Country, Exam, Subject, Topic
from apps.test_engine.models import Test, Question, Option, TestQuestion, TestAttempt
from apps.test_engine.services import AdaptiveAssessmentEngine, TestSessionManager

User = get_user_model()


@pytest.fixture
def auth_client(db):
    client = APIClient()
    user = User.objects.create_user(
        username="adaptive_eval_user",
        email="adaptive_eval@learninghub.app",
        password="TestPassword123!",
    )
    client.force_authenticate(user=user)
    return client, user


@pytest.fixture
def adaptive_exam_battery(db):
    country, _ = Country.objects.get_or_create(code="IN", defaults={"name": "India"})
    exam = Exam.objects.create(
        name="JEE Advanced Diagnostic CAT",
        code="JEE_CAT_DIAG",
        country=country,
        pattern={"total_questions": 10, "duration_minutes": 30},
        is_active=True,
    )
    subject = Subject.objects.create(exam=exam, name="Mathematics", code="MATH", is_active=True)
    topic = Topic.objects.create(subject=subject, name="Calculus", is_active=True)

    test = Test.objects.create(
        exam=exam,
        title="Adaptive Calculus Diagnostic Battery",
        description="Dynamic IRT CAT calibration test for differential calculus.",
        mode="adaptive",
        difficulty="adaptive",
        ai_mode="no_ai",
        question_source="database",
        time_limit_minutes=30,
        passing_score=50,
        total_marks=20,
        marks_per_correct=2,
        negative_marks_per_question=0.5,
        is_published=True,
    )

    questions = []
    # 6 calibrated items spanning difficulty spectrum b in [-1.5, +2.0]
    difficulties = [-1.5, -0.8, 0.0, 0.7, 1.4, 2.0]
    for idx, diff in enumerate(difficulties, start=1):
        q = Question.objects.create(
            topic=topic,
            text=f"Calculus Diagnostic Question {idx} [b={diff}]",
            question_type="mcq",
            difficulty=diff,
            discrimination=1.2,
            guess_factor=0.25,
            bloom_level="analyze",
            explanation=f"Mathematical derivation for question {idx}",
        )
        opt_correct = Option.objects.create(
            question=q, text=f"Correct Option {idx}", is_correct=True, order=1
        )
        opt_wrong = Option.objects.create(
            question=q, text=f"Distractor Option {idx}", is_correct=False, order=2
        )
        TestQuestion.objects.create(test=test, question=q, order=idx, marks=2)
        questions.append((q, opt_correct, opt_wrong))

    return test, questions


class TestAdaptiveIRTCATMathematics:
    """Verifies mathematical validity of 2PL/3PL and Bayesian EAP algorithms."""

    def test_3pl_probability_properties(self):
        # 1. At theta == b, probability equals c + (1-c)/2 = 0.625 for c=0.25
        p_mid = AdaptiveAssessmentEngine.calculate_3pl_probability(
            theta=0.0, a=1.0, b=0.0, c=0.25
        )
        assert abs(p_mid - 0.625) < 1e-4

        # 2. Extreme positive ability approaches 1.0
        p_high = AdaptiveAssessmentEngine.calculate_3pl_probability(
            theta=10.0, a=1.0, b=0.0, c=0.25
        )
        assert p_high > 0.999

        # 3. Extreme negative ability approaches guessing parameter c = 0.25
        p_low = AdaptiveAssessmentEngine.calculate_3pl_probability(
            theta=-10.0, a=1.0, b=0.0, c=0.25
        )
        assert abs(p_low - 0.25) < 1e-3

    def test_fisher_information_properties(self):
        # Peak information occurs near item difficulty b
        info_peak = AdaptiveAssessmentEngine.fisher_information(
            theta=0.5, a=1.5, b=0.5, c=0.25
        )
        info_distant = AdaptiveAssessmentEngine.fisher_information(
            theta=5.0, a=1.5, b=0.5, c=0.25
        )
        assert info_peak > 0.0
        assert info_peak > info_distant

    def test_bayesian_eap_progression(self):
        # High performers with correct responses achieve positive theta
        items = [
            {'a': 1.2, 'b': -1.0, 'c': 0.25},
            {'a': 1.2, 'b': 0.0, 'c': 0.25},
            {'a': 1.2, 'b': 1.0, 'c': 0.25},
        ]
        theta_correct, sem_correct = AdaptiveAssessmentEngine.estimate_ability_eap(
            responses=[1, 1, 1], item_params=items
        )
        assert theta_correct > 0.5
        assert sem_correct < 1.0

        # Struggling candidates with incorrect responses achieve negative theta
        theta_wrong, sem_wrong = AdaptiveAssessmentEngine.estimate_ability_eap(
            responses=[0, 0, 0], item_params=items
        )
        assert theta_wrong < -0.5
        assert sem_wrong < 1.0

    def test_score_and_percentile_conversion(self):
        score_neutral = AdaptiveAssessmentEngine.theta_to_normalized_score(0.0)
        assert abs(score_neutral - 50.0) < 0.5

        pct_neutral = AdaptiveAssessmentEngine.theta_to_percentile(0.0)
        assert abs(pct_neutral - 50.0) < 0.5

        assert AdaptiveAssessmentEngine.get_ability_band(2.2) == 'Advanced Master'
        assert AdaptiveAssessmentEngine.get_ability_band(1.2) == 'Proficient / Competitive'
        assert AdaptiveAssessmentEngine.get_ability_band(0.2) == 'Competent'
        assert AdaptiveAssessmentEngine.get_ability_band(-0.5) == 'Developing'
        assert AdaptiveAssessmentEngine.get_ability_band(-2.0) == 'Foundational'


@pytest.mark.django_db
class TestAdaptiveAPIEndpoints:
    """Verifies end-to-end API communication with Django REST Framework."""

    def test_adaptive_step_endpoint_flow(self, auth_client, adaptive_exam_battery):
        client, user = auth_client
        test, questions = adaptive_exam_battery

        attempt = TestSessionManager.start_attempt(user=user, test_id=test.id, mode="adaptive")

        # Step 1: Submit answer for first question
        q1, opt_c1, _ = questions[0]
        payload = {
            "attempt_id": str(attempt.id),
            "question_id": str(q1.id),
            "selected_option_id": str(opt_c1.id),
            "time_spent_seconds": 25,
        }

        res = client.post(f"/api/v1/tests/{test.id}/adaptive/step/", payload, format="json")
        assert res.status_code == status.HTTP_200_OK
        data = res.json()
        assert data["status"] == "success"
        step_data = data["data"]

        assert step_data["isCompleted"] is False
        assert step_data["isCorrect"] is True
        assert "currentTheta" in step_data
        assert step_data["currentTheta"] > -1.5
        assert "nextQuestion" in step_data
        assert step_data["nextQuestion"]["id"] != str(q1.id)
        assert "confidenceInterval" in step_data["diagnostics"]

    def test_attempt_detail_adaptive_step_endpoint(self, auth_client, adaptive_exam_battery):
        client, user = auth_client
        test, questions = adaptive_exam_battery

        attempt = TestSessionManager.start_attempt(user=user, test_id=test.id, mode="adaptive")

        q1, opt_c1, _ = questions[0]
        res = client.post(
            f"/api/v1/tests/attempts/{attempt.id}/adaptive-step/",
            {
                "question_id": str(q1.id),
                "selected_option_id": str(opt_c1.id),
                "time_spent_seconds": 30,
            },
            format="json",
        )
        assert res.status_code == status.HTTP_200_OK
        assert res.json()["status"] == "success"
        assert res.json()["data"]["isCorrect"] is True

import pytest
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient
from apps.users.models import User
from apps.tests_engine.models import Test, Question, Option, TestAttempt
from apps.tests_engine.telemetry import AssessmentIntegrityEngine


@pytest.mark.django_db
class TestAssessmentIntegrityEngine:
    def setup_method(self):
        self.user = User.objects.create_user(
            username="integrity_student",
            email="integrity@example.com",
            password="StrongPassword123!"
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

        self.test_obj = Test.objects.create(
            title="Integrity Assessment Benchmark",
            duration_minutes=30,
            is_published=True,
            total_marks=10.0
        )
        self.q1 = Question.objects.create(
            test=self.test_obj,
            prompt="What is the time complexity of QuickSort average case?",
            topic="Algorithms",
            difficulty=0.2,
            marks=10.0,
            order=1
        )
        self.opt1 = Option.objects.create(question=self.q1, text="O(N log N)", is_correct=True, order=1)
        self.opt2 = Option.objects.create(question=self.q1, text="O(N^2)", is_correct=False, order=2)

    def test_engine_clean_violations_returns_perfect_score(self):
        report = AssessmentIntegrityEngine.evaluate_violations([], attempt_id="attempt-clean")
        assert report['integrity_score'] == 100.0
        assert report['risk_level'] == 'EXCELLENT'
        assert report['total_violations'] == 0
        assert report['flagged_for_review'] is False
        assert report['audit_hash'].startswith('lh-proof-')

    def test_engine_tab_switch_and_blur_deductions(self):
        violations = [
            {'type': 'TAB_SWITCH', 'timestamp': 1000},
            {'type': 'TAB_SWITCH', 'timestamp': 2000},
            {'type': 'WINDOW_BLUR', 'timestamp': 3000},
        ]
        report = AssessmentIntegrityEngine.evaluate_violations(violations, attempt_id="attempt-tab")
        # 2 * 10 (TAB_SWITCH) + 1 * 5 (WINDOW_BLUR) = 25 deduction -> 75.0
        assert report['integrity_score'] == 75.0
        assert report['risk_level'] == 'LOW_RISK'
        assert report['violation_counts']['TAB_SWITCH'] == 2
        assert report['violation_counts']['WINDOW_BLUR'] == 1

    def test_engine_devtools_triggers_high_risk_and_flag(self):
        violations = [
            {'type': 'DEV_TOOLS', 'timestamp': 1000, 'details': 'DevTools opened'},
            {'type': 'TAB_SWITCH', 'timestamp': 2000},
            {'type': 'COPY_PASTE', 'timestamp': 3000},
        ]
        report = AssessmentIntegrityEngine.evaluate_violations(violations, attempt_id="attempt-devtools")
        # 35 + 10 + 15 = 60 deduction -> 40.0 score
        assert report['integrity_score'] == 40.0
        assert report['risk_level'] == 'HIGH_RISK'
        assert report['flagged_for_review'] is True

    def test_telemetry_endpoint_authenticated(self):
        attempt = TestAttempt.objects.create(
            user=self.user,
            test=self.test_obj,
            status='IN_PROGRESS'
        )
        url = reverse('attempt-telemetry', kwargs={'attempt_id': attempt.id})
        res = self.client.post(
            url,
            {
                'violations': [
                    {'type': 'WINDOW_BLUR', 'timestamp': 1000},
                    {'type': 'WINDOW_BLUR', 'timestamp': 2000},
                ]
            },
            format='json'
        )
        assert res.status_code == status.HTTP_200_OK
        data = res.data['data']
        assert data['integrity_score'] == 90.0
        assert data['risk_level'] == 'EXCELLENT'
        assert data['total_violations'] == 2

    def test_submit_test_includes_telemetry_summary(self):
        url = reverse('test-submit', kwargs={'pk': self.test_obj.id})
        payload = {
            'answers': {self.q1.id: self.opt1.id},
            'timeTaken': 120,
            'violations': [
                {'type': 'TAB_SWITCH', 'timestamp': 5000}
            ]
        }
        res = self.client.post(url, payload, format='json')
        assert res.status_code in [status.HTTP_200_OK, status.HTTP_201_CREATED]
        data = res.data['data']
        assert 'integrity_score' in data
        assert data['integrity_score'] == 90.0
        assert data['integrity_risk'] == 'EXCELLENT'
        assert 'telemetry_summary' in data
        assert data['telemetry_summary']['violation_counts']['TAB_SWITCH'] == 1

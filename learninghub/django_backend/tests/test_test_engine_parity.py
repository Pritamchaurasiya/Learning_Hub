import pytest
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework import status
from apps.users.models import User
from apps.tests_engine.models import (
    Test, TestSection, Question, Option, TestAttempt, AttemptAnswer, TopicPerformance
)
from apps.core.learner_analytics import LearnerAnalyticsService


@pytest.mark.django_db
class TestTestEngineParityAndAnalytics:
    def setup_method(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            email='parity_tester@learninghub.app',
            password='TestPassword123!',
            username='ParityTester'
        )
        self.client.force_authenticate(user=self.user)

        # Create structured test with sections and questions
        self.test_obj = Test.objects.create(
            id='test-parity-full',
            title='Enterprise A+ Parity Assessment',
            slug='enterprise-a-parity-assessment',
            duration_minutes=60,
            total_marks=20.0,
            passing_marks=10.0,
            negative_marking=True,
            negative_mark_value=1.0,
            category='Engineering'
        )

        self.sec1 = TestSection.objects.create(
            id='sec-p-1',
            test=self.test_obj,
            title='Section 1: Data Structures',
            order=1,
            cut_off_marks=10.0
        )
        self.sec2 = TestSection.objects.create(
            id='sec-p-2',
            test=self.test_obj,
            title='Section 2: Algorithms',
            order=2,
            cut_off_marks=10.0
        )

        self.q1 = Question.objects.create(
            id='q-p-1',
            test=self.test_obj,
            section=self.sec1,
            prompt='What is the time complexity of searching in a balanced BST?',
            topic='Binary Trees',
            marks=10.0,
            negative_marks=2.0,
            difficulty=0.2,
            discrimination=1.0
        )
        self.opt1_corr = Option.objects.create(id='opt-p-1-a', question=self.q1, text='O(log n)', is_correct=True)
        self.opt1_wrong = Option.objects.create(id='opt-p-1-b', question=self.q1, text='O(n)', is_correct=False)

        self.q2 = Question.objects.create(
            id='q-p-2',
            test=self.test_obj,
            section=self.sec2,
            prompt='Which algorithm finds the shortest path in a graph with non-negative weights?',
            topic='Graph Algorithms',
            marks=10.0,
            negative_marks=2.0,
            difficulty=-0.5,
            discrimination=1.0
        )
        self.opt2_corr = Option.objects.create(id='opt-p-2-a', question=self.q2, text="Dijkstra's", is_correct=True)
        self.opt2_wrong = Option.objects.create(id='opt-p-2-b', question=self.q2, text="Bellman-Ford", is_correct=False)

    def test_user_analytics_me_and_created_at_field(self):
        """
        Validates that /user-analytics/me returns a 200 OK without any FieldError,
        verifying that AttemptAnswer.created_at field exists and queries succeed.
        """
        attempt = TestAttempt.objects.create(
            id='att-p-analytics',
            test=self.test_obj,
            user=self.user,
            status='SUBMITTED',
            started_at=timezone.now(),
            submitted_at=timezone.now(),
            score=20.0,
            passed=True,
            time_spent_seconds=120
        )
        ans = AttemptAnswer.objects.create(
            attempt=attempt,
            question=self.q1,
            selected_option=self.opt1_corr,
            is_correct=True,
            time_spent_sec=35
        )
        assert ans.created_at is not None

        # Call analytics service directly
        analytics = LearnerAnalyticsService.get_user_comprehensive_analytics(self.user)
        assert analytics['summary']['totalTestsCompleted'] >= 1
        assert analytics['summary']['totalQuestionsAnswered'] >= 1
        assert len(analytics['accuracyTrend']) == 7

        # Call API endpoint
        res = self.client.get('/api/v1/user-analytics/me')
        assert res.status_code == status.HTTP_200_OK
        data = res.data.get('data', {})
        assert 'summary' in data
        assert 'accuracyTrend' in data
        assert 'speedTrend' in data
        assert 'topicMastery' in data
        assert 'growth' in data

    def test_next_best_action_endpoint(self):
        """
        Validates that /skills/next-action returns intelligent pedagogical suggestions.
        """
        # Baseline with no weak areas
        res = self.client.get('/api/v1/analytics/next-best-action')
        assert res.status_code == status.HTTP_200_OK
        action = res.data.get('data', {})
        assert 'title' in action
        assert 'actionUrl' in action
        assert 'type' in action

        # With a weak area
        TopicPerformance.objects.create(
            user=self.user,
            topic='Dynamic Programming',
            correct_count=3,
            total_count=10,
            accuracy=30.0
        )
        res_weak = self.client.get('/api/v1/analytics/next-best-action')
        assert res_weak.status_code == status.HTTP_200_OK
        weak_action = res_weak.data.get('data', {})
        assert 'Dynamic Programming' in weak_action['title']
        assert weak_action['type'] == 'weak_topic'

    def test_offline_bundle_generation(self):
        """
        Validates HMAC cryptographic bundle generation for offline test execution.
        """
        url = f'/api/v1/tests/{self.test_obj.id}/offline-bundle/'
        res = self.client.get(url)
        assert res.status_code == status.HTTP_200_OK
        bundle = res.data.get('data', {})
        assert bundle['manifest']['testId'] == self.test_obj.id
        assert len(bundle['questions']) == 2
        assert 'cryptoSignature' in bundle
        assert 'checksum' in bundle

    def test_offline_sync_reconciliation(self):
        """
        Validates offline test submission synchronization and IRT scoring.
        """
        url = f'/api/v1/tests/{self.test_obj.id}/offline-sync/'
        payload = {
            'offlineAttemptId': 'off-att-12345',
            'clientStartedAt': timezone.now().isoformat(),
            'clientCompletedAt': timezone.now().isoformat(),
            'timeSpentSeconds': 90,
            'integrityFlags': [],
            'answers': [
                {
                    'questionId': self.q1.id,
                    'selectedOptionId': self.opt1_corr.id,
                    'timeSpentSec': 45
                },
                {
                    'questionId': self.q2.id,
                    'selectedOptionId': self.opt2_corr.id,
                    'timeSpentSec': 45
                }
            ]
        }
        res = self.client.post(url, payload, format='json')
        assert res.status_code == status.HTTP_201_CREATED
        data = res.data.get('data', {})
        assert data['status'] == 'SUBMITTED'
        assert data['score'] == 20.0
        assert 'passed' in data and data['passed'] is not None
        assert 'verificationCode' in data

    def test_adaptive_step_cat(self):
        """
        Validates item-by-item adaptive CAT step updating theta.
        """
        attempt = TestAttempt.objects.create(
            id='att-p-adaptive',
            test=self.test_obj,
            user=self.user,
            status='IN_PROGRESS',
            started_at=timezone.now(),
            irt_ability_theta=0.0
        )

        url = f'/api/v1/tests/{self.test_obj.id}/adaptive/step/'
        payload = {
            'attemptId': attempt.id,
            'questionId': self.q1.id,
            'selectedOptionId': self.opt1_corr.id,
            'timeSpentSec': 25
        }
        res = self.client.post(url, payload, format='json')
        assert res.status_code == status.HTTP_200_OK
        data = res.data.get('data', {})
        assert 'theta' in data
        assert data['theta'] > 0.0 # Theta increased because of correct answer
        assert 'isComplete' in data

    def test_socratic_misconception_diagnosis(self):
        """
        Validates Socratic pedagogical diagnosis of distractors.
        """
        url = '/api/v1/tests/diagnose-misconception/'
        payload = {
            'question': 'What is the time complexity of searching in a balanced BST?',
            'chosenAnswer': 'O(n)',
            'correctAnswer': 'O(log n)',
            'topic': 'Binary Trees'
        }
        res = self.client.post(url, payload, format='json')
        assert res.status_code == status.HTTP_200_OK
        data = res.data.get('data', {})
        assert 'misconception' in data
        assert 'scaffoldingHint' in data

    def test_subjective_grade_endpoint(self):
        """
        Validates AI rubric grading for open-ended or coding responses.
        """
        url = f'/api/v1/tests/{self.test_obj.id}/grade-subjective/'
        payload = {
            'questionId': self.q1.id,
            'studentResponse': 'A balanced binary search tree guarantees logarithmic height, so search takes O(log n).',
            'rubric': 'Accuracy, algorithmic complexity justification, edge cases',
            'maxScore': 10.0
        }
        res = self.client.post(url, payload, format='json')
        assert res.status_code == status.HTTP_200_OK
        data = res.data.get('data', {})
        assert 'scoreAwarded' in data
        assert data['scoreAwarded'] > 0.0
        assert 'feedback' in data

    def test_verify_scorecard_endpoint(self):
        """
        Validates public cryptographic scorecard audit and anti-fraud verification.
        """
        attempt = TestAttempt.objects.create(
            id='att-p-verify-1',
            test=self.test_obj,
            user=self.user,
            status='SUBMITTED',
            started_at=timezone.now(),
            submitted_at=timezone.now(),
            score=85.0,
            passed=True,
            telemetry_audit_hash='audit-hash-12345678-valid',
            time_spent_seconds=300
        )

        url = '/api/v1/tests/verify-scorecard/'
        # Valid code
        res_valid = self.client.post(url, {'code': attempt.telemetry_audit_hash}, format='json')
        assert res_valid.status_code == status.HTTP_200_OK
        assert res_valid.data['data']['valid'] is True
        assert res_valid.data['data']['score'] == 85.0

        # Invalid code
        res_invalid = self.client.post(url, {'code': 'non-existent-hash-code'}, format='json')
        assert res_invalid.status_code == status.HTTP_200_OK
        assert res_invalid.data['data']['valid'] is False

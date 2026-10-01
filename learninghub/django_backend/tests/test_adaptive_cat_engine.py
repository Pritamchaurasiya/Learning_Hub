import pytest
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from apps.users.models import User
from apps.tests_engine.models import Test, Question, Option, TestAttempt
from apps.tests_engine.scoring import IRTScoringEngine

@pytest.mark.django_db
class TestAdaptiveCatEngine:
    def setup_method(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            email='adaptive_student@learninghub.app',
            password='Password123!',
            username='AdaptiveStudent'
        )
        self.client.force_authenticate(user=self.user)

        # Create Adaptive Test with calibrated items across difficulty spectrum
        self.test = Test.objects.create(
            id='test-cat-adaptive-01',
            title='Computerized Adaptive Diagnostic CAT Test',
            slug='cat-adaptive-diagnostic-01',
            category='Computer Science',
            duration_minutes=30,
            total_marks=20.0,
            passing_marks=8.0,
            negative_marking=True,
            is_adaptive=True
        )

        # 5 Questions with increasing difficulty b in [-2.0, 2.0]
        self.questions = []
        difficulties = [-1.5, -0.5, 0.0, 0.8, 1.8]
        for i, b in enumerate(difficulties, start=1):
            q = Question.objects.create(
                id=f'q-cat-{i}',
                test=self.test,
                prompt=f'Adaptive Question {i} (Difficulty {b})',
                question_type='MCQ',
                topic='Algorithms',
                difficulty=b,
                discrimination=1.2,
                marks=4.0,
                negative_marks=1.0,
                order=i
            )
            Option.objects.create(id=f'opt-cat-{i}-c', question=q, text='Correct Choice', is_correct=True, order=1)
            Option.objects.create(id=f'opt-cat-{i}-w', question=q, text='Wrong Choice', is_correct=False, order=2)
            self.questions.append(q)

    def test_3pl_probability_mathematical_properties(self):
        # 1. At theta == b, probability must equal c + (1-c)/2 = 0.625 for c=0.25
        p_mid = IRTScoringEngine.calculate_3pl_probability(theta=0.0, a=1.0, b=0.0, c=0.25)
        assert abs(p_mid - 0.625) < 1e-4

        # 2. As theta -> +inf, probability approaches 1.0
        p_high = IRTScoringEngine.calculate_3pl_probability(theta=10.0, a=1.0, b=0.0, c=0.25)
        assert p_high > 0.99

        # 3. As theta -> -inf, probability approaches guessing rate c = 0.25
        p_low = IRTScoringEngine.calculate_3pl_probability(theta=-10.0, a=1.0, b=0.0, c=0.25)
        assert abs(p_low - 0.25) < 1e-3

    def test_fisher_information_positivity(self):
        info_mid = IRTScoringEngine.fisher_information(theta=0.0, a=1.5, b=0.0, c=0.25)
        info_far = IRTScoringEngine.fisher_information(theta=5.0, a=1.5, b=0.0, c=0.25)
        assert info_mid > 0.0
        assert info_mid > info_far  # Peak information near difficulty b

    def test_adaptive_ability_update_progression(self):
        q = self.questions[2]  # b = 0.0
        initial_theta = 0.0

        # Correct answer should increase theta
        theta_after_correct = IRTScoringEngine.update_adaptive_theta(initial_theta, q, is_correct=True, step=1)
        assert theta_after_correct > initial_theta

        # Incorrect answer should decrease theta
        theta_after_wrong = IRTScoringEngine.update_adaptive_theta(initial_theta, q, is_correct=False, step=1)
        assert theta_after_wrong < initial_theta

    def test_adaptive_next_question_flow_until_completion(self):
        # 1. Create an active attempt
        attempt = TestAttempt.objects.create(
            user=self.user,
            test=self.test,
            attempt_number=1,
            status='IN_PROGRESS',
            irt_ability_theta=0.0
        )

        url = reverse('adaptive-next-question', kwargs={'attempt_id': attempt.id})

        def get_correct_opt(qid):
            num = qid.split('-')[-1]
            return f"opt-cat-{num}-c"

        # Step 1: Request first question (no previous answer yet)
        res1 = self.client.post(url, {}, format='json')
        assert res1.status_code == status.HTTP_200_OK
        data1 = res1.data['data']
        assert data1['is_complete'] is False
        first_q_id = data1['next_question']['id']
        assert first_q_id is not None

        # Step 2: Answer first question correctly
        res2 = self.client.post(url, {
            'previous_question_id': first_q_id,
            'selected_option_id': get_correct_opt(first_q_id),
            'time_spent_seconds': 12,
            'max_questions': 3
        }, format='json')
        assert res2.status_code == status.HTTP_200_OK
        data2 = res2.data['data']
        assert data2['is_complete'] is False
        assert data2['questions_answered'] == 1
        assert data2['ability_theta'] > 0.0  # Increased ability!
        second_q_id = data2['next_question']['id']
        assert second_q_id != first_q_id

        # Step 3: Answer second question correctly
        res3 = self.client.post(url, {
            'previous_question_id': second_q_id,
            'selected_option_id': get_correct_opt(second_q_id),
            'time_spent_seconds': 15,
            'max_questions': 3
        }, format='json')
        assert res3.status_code == status.HTTP_200_OK
        data3 = res3.data['data']
        assert data3['is_complete'] is False
        assert data3['questions_answered'] == 2
        third_q_id = data3['next_question']['id']

        # Step 4: Answer third question (hits max_questions=3 stopping condition)
        res4 = self.client.post(url, {
            'previous_question_id': third_q_id,
            'selected_option_id': get_correct_opt(third_q_id),
            'time_spent_seconds': 10,
            'max_questions': 3
        }, format='json')
        assert res4.status_code == status.HTTP_200_OK
        data4 = res4.data['data']
        # Must be complete now!
        assert data4['is_complete'] is True
        assert data4['questions_answered'] == 3
        assert 'result' in data4
        assert data4['result']['passed'] is True

        # Verify attempt in DB is finalized
        attempt.refresh_from_db()
        assert attempt.status == 'SUBMITTED'
        assert attempt.score > 0

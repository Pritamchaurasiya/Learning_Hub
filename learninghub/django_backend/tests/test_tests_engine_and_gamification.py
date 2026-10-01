import pytest
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from apps.users.models import User
from apps.tests_engine.models import Test, Question, Option, TestAttempt, QuestionBookmark
from apps.gamification.models import Badge

@pytest.mark.django_db
class TestTestsEngineAndGamification:
    def setup_method(self):
        self.client = APIClient()
        self.user = User.objects.create_user(email='examinee@learninghub.app', password='Password123!', username='Examinee')
        self.client.force_authenticate(user=self.user)

    def test_full_test_attempt_flow_with_irt(self):
        test_obj = Test.objects.create(
            id='test-eval-unit',
            title='Unit Evaluation Test',
            slug='unit-eval-test',
            duration_minutes=45,
            total_marks=20.0,
            passing_marks=8.0,
            negative_marking=True,
            negative_mark_value=1.0
        )
        q1 = Question.objects.create(id='q-unit-1', test=test_obj, prompt='2 + 2 = ?', topic='Arithmetic', marks=10.0, negative_marks=2.0)
        opt1 = Option.objects.create(id='opt-u1', question=q1, text='4', is_correct=True)
        Option.objects.create(id='opt-u2', question=q1, text='5', is_correct=False)

        q2 = Question.objects.create(id='q-unit-2', test=test_obj, prompt='3 * 3 = ?', topic='Arithmetic', marks=10.0, negative_marks=2.0)
        Option.objects.create(id='opt-u3', question=q2, text='9', is_correct=True)
        opt4 = Option.objects.create(id='opt-u4', question=q2, text='6', is_correct=False)

        # 1. Start test
        start_url = reverse('test-start', kwargs={'pk': test_obj.id})
        start_res = self.client.post(start_url)
        assert start_res.status_code == status.HTTP_201_CREATED
        assert start_res.data['data']['status'] == 'IN_PROGRESS'

        # 2. Submit test (1 correct, 1 wrong)
        submit_url = reverse('test-submit', kwargs={'pk': test_obj.id})
        answers = [
            {'questionId': q1.id, 'selectedOptionId': opt1.id, 'timeSpentSeconds': 20},
            {'questionId': q2.id, 'selectedOptionId': opt4.id, 'timeSpentSeconds': 25},
        ]
        sub_res = self.client.post(submit_url, {'answers': answers, 'timeSpentSeconds': 45}, format='json')
        assert sub_res.status_code == status.HTTP_201_CREATED
        assert sub_res.data['data']['status'] == 'SUBMITTED'
        assert sub_res.data['data']['score'] == 8.0 # 10 - 2 = 8
        assert sub_res.data['data']['passed'] is True
        assert 'irtAbilityTheta' in sub_res.data['data']

        # 3. Question bookmark
        bm_url = reverse('bookmarks-questions')
        bm_res = self.client.post(bm_url, {'questionId': q1.id, 'notes': 'Review addition logic'}, format='json')
        assert bm_res.status_code == status.HTTP_201_CREATED
        assert QuestionBookmark.objects.filter(user=self.user, question=q1).exists()

    def test_badges_and_leaderboard(self):
        self.user.xp = 150
        self.user.save()
        Badge.objects.create(id='badge-fast', title='Fast Solver', description='Solved in < 10s', requirement=1)
        b_url = reverse('badges-list')
        b_res = self.client.get(b_url)
        assert b_res.status_code == status.HTTP_200_OK
        assert len(b_res.data['data']) >= 1

        lead_url = reverse('global-leaderboard')
        lead_res = self.client.get(lead_url)
        assert lead_res.status_code == status.HTTP_200_OK
        assert len(lead_res.data['data']) >= 1

    def test_resubmit_test_prevents_xp_farming(self):
        test_obj = Test.objects.create(
            id='test-xp-exploit',
            title='XP Exploit Prevention Test',
            slug='xp-exploit-prevention',
            duration_minutes=30,
            total_marks=10.0,
            passing_marks=5.0
        )
        q1 = Question.objects.create(id='q-xp-1', test=test_obj, prompt='1 + 1 = ?', marks=10.0)
        opt1 = Option.objects.create(id='opt-xp-1', question=q1, text='2', is_correct=True)

        submit_url = reverse('test-submit', kwargs={'pk': test_obj.id})
        answers = [{'questionId': q1.id, 'selectedOptionId': opt1.id, 'timeSpentSeconds': 10}]

        # First submission should award XP
        initial_xp = self.user.xp
        res1 = self.client.post(submit_url, {'answers': answers, 'timeSpentSeconds': 10}, format='json')
        assert res1.status_code == status.HTTP_201_CREATED
        self.user.refresh_from_db()
        first_xp = self.user.xp
        assert first_xp > initial_xp

        # Second submission of same attempt should NOT increase XP
        attempt_id = res1.data['data']['attempt_id']
        res2 = self.client.post(submit_url, {'attempt_id': attempt_id, 'answers': answers, 'timeSpentSeconds': 10}, format='json')
        assert res2.status_code == status.HTTP_200_OK
        self.user.refresh_from_db()
        assert self.user.xp == first_xp  # XP must NOT increase on resubmission
        assert res2.data['data']['xpEarned'] == 0


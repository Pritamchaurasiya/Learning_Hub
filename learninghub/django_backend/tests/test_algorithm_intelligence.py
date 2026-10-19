from unittest.mock import patch

import pytest
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from apps.core.search import TokenizedSearchEngine
from apps.problems.models import Problem, ProblemSubmission, TestCase
from apps.problems.recommendations import DSARecommendationEngine
from apps.problems.sandbox import CodeSandboxService
from apps.tests_engine.models import AttemptAnswer, Option, Question, Test, TestAttempt
from apps.tests_engine.scoring import IRTScoringEngine
from apps.users.models import User


@pytest.mark.django_db
class TestAlgorithmIntelligence:
    def setup_method(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            email='algo_student@learninghub.app',
            password='Password123!',
            username='algo_student'
        )
        self.client.force_authenticate(user=self.user)

    def test_dsa_recommendation_engine_and_endpoint(self):
        # Create problems across categories
        p1 = Problem.objects.create(
            id='prob-two-sum',
            title='Two Sum',
            slug='two-sum',
            category='Arrays',
            difficulty='Easy',
            description='Find two numbers that add up to target'
        )
        p2 = Problem.objects.create(
            id='prob-3sum',
            title='Three Sum',
            slug='three-sum',
            category='Arrays',
            difficulty='Medium',
            description='Find three numbers that sum to zero'
        )
        p3 = Problem.objects.create(
            id='prob-invert-tree',
            title='Invert Binary Tree',
            slug='invert-binary-tree',
            category='Trees',
            difficulty='Easy',
            description='Invert binary tree nodes'
        )

        # 1. Unauthenticated / cold-start recommendations
        anon_client = APIClient()
        rec_url = reverse('problem-recommendations')
        res_anon = anon_client.get(rec_url)
        assert res_anon.status_code == status.HTTP_200_OK
        assert len(res_anon.data['data']) >= 2
        assert 'recommendation_reason' in res_anon.data['data'][0]

        # 2. Authenticated user with weak category
        ProblemSubmission.objects.create(
            user=self.user,
            problem=p1,
            language='python',
            code='print(1)',
            status='Wrong Answer',
            passed_testcases=0,
            total_testcases=2
        )
        res_auth = self.client.get(rec_url)
        assert res_auth.status_code == status.HTTP_200_OK
        recs = res_auth.data['data']
        assert any(r['slug'] == 'two-sum' for r in recs)
        # Verify user_status is returned
        two_sum_rec = next(r for r in recs if r['slug'] == 'two-sum')
        assert two_sum_rec['user_status'] == 'ATTEMPTED'

    def test_tokenized_search_engine(self):
        p1 = Problem.objects.create(
            id='p-bs',
            title='Binary Search Implementation',
            slug='binary-search',
            category='Searching',
            difficulty='Easy',
            description='Implement binary search on sorted integer array'
        )
        p2 = Problem.objects.create(
            id='p-dfs',
            title='Depth First Search Graph',
            slug='depth-first-search',
            category='Graphs',
            difficulty='Medium',
            description='Traverse graph using recursive DFS'
        )

        results = TokenizedSearchEngine.search_and_rank(
            queryset=Problem.objects.all(),
            query='binary search in array',
            title_field='title',
            desc_field='description'
        )
        assert len(results) >= 1
        assert results[0].id == 'p-bs'

        # Test search query on API
        list_url = reverse('problems-list')
        api_res = self.client.get(list_url, {'search': 'binary search array'})
        assert api_res.status_code == status.HTTP_200_OK
        assert any(item['slug'] == 'binary-search' for item in api_res.data['data'])

    def test_hidden_testcase_masking_and_xp_anti_farming(self):
        problem = Problem.objects.create(
            id='prob-eval-test',
            title='Evaluation Test Problem',
            slug='eval-test',
            category='Math',
            difficulty='Easy',
            description='Add numbers'
        )
        TestCase.objects.create(
            problem=problem,
            input_data='5\n',
            expected_output='10\n',
            is_hidden=True,
            order=1
        )

        submit_url = reverse('problem-submit', kwargs={'pk': problem.id})

        def run_isolated_container(code, language, input_data, timeout_sec, start_time):
            output = '10\n' if code.strip() == 'print(10)' else '0\n'
            return {
                'success': True,
                'stdout': output,
                'stderr': '',
                'runtime_ms': 1,
                'memory_mb': 1.0,
                'status': 'Accepted',
            }

        with patch.object(CodeSandboxService, '_run_container', side_effect=run_isolated_container):
            # 1. Failed submission with hidden test case must NOT leak expected output
            fail_code = "print(0)"
            res_fail = self.client.post(submit_url, {'code': fail_code, 'language': 'python'}, format='json')
            assert res_fail.status_code == status.HTTP_201_CREATED
            stdout = res_fail.data['data']['stdout']
            assert 'Expected: 10' not in stdout
            assert 'hidden test case' in stdout

            # 2. Accepted submission awards XP once
            initial_xp = self.user.xp
            pass_code = "print(10)"
            res_pass1 = self.client.post(submit_url, {'code': pass_code, 'language': 'python'}, format='json')
            assert res_pass1.status_code == status.HTTP_201_CREATED
            assert res_pass1.data['data']['status'] == 'Accepted'

            self.user.refresh_from_db()
            assert self.user.xp == initial_xp + 25

            # 3. Duplicate accepted submission does NOT award additional XP
            res_pass2 = self.client.post(submit_url, {'code': pass_code, 'language': 'python'}, format='json')
            assert res_pass2.status_code == status.HTTP_201_CREATED
            self.user.refresh_from_db()
            assert self.user.xp == initial_xp + 25  # Still +25, not +50

    def test_course_prerequisites_enforcement(self):
        from apps.courses.models import Course, Enrollment

        # Foundational course
        c1 = Course.objects.create(
            id='crs-py-intro',
            title='Python Intro',
            slug='python-intro',
            description='Intro to Python'
        )

        # Advanced course requiring c1
        c2 = Course.objects.create(
            id='crs-py-adv',
            title='Advanced Python',
            slug='advanced-python',
            description='Advanced Python',
            prerequisites=[{'course_id': 'crs-py-intro', 'minimum_progress': 75.0}]
        )

        enroll_url = reverse('course-enroll', kwargs={'pk': c2.id})

        # 1. Attempting enrollment without fulfilling prerequisite fails
        res_fail = self.client.post(enroll_url)
        assert res_fail.status_code == status.HTTP_400_BAD_REQUEST
        assert res_fail.data['code'] == 'PREREQUISITE_NOT_MET'

        # 2. Attempting with low progress (< 75%) fails
        e1, _ = Enrollment.objects.get_or_create(user=self.user, course=c1)
        e1.progress = 50.0
        e1.save()

        res_fail2 = self.client.post(enroll_url)
        assert res_fail2.status_code == status.HTTP_400_BAD_REQUEST
        assert res_fail2.data['code'] == 'PREREQUISITE_NOT_MET'

        # 3. Satisfying prerequisite allows successful enrollment
        e1.progress = 80.0
        e1.save()

        res_pass = self.client.post(enroll_url)
        assert res_pass.status_code == status.HTTP_200_OK
        assert res_pass.data['data']['enrolled'] is True

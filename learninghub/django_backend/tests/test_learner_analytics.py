import pytest
from datetime import timedelta
from django.utils import timezone
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from apps.users.models import User
from apps.courses.models import Course, Chapter, Lesson, Enrollment, LessonProgress
from apps.tests_engine.models import Test, Question, Option, TestAttempt, AttemptAnswer, TopicPerformance


@pytest.mark.django_db
class TestLearnerAnalytics:
    def setup_method(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            email='analytics_learner@learninghub.app',
            password='Password123!',
            username='analytics_learner',
            xp=600,
            streak=4
        )
        self.client.force_authenticate(user=self.user)

    def test_dashboard_stats_zero_state_and_authenticated(self):
        # 1. Unauthenticated client
        anon_client = APIClient()
        res_anon = anon_client.get(reverse('analytics-dashboard'))
        assert res_anon.status_code == status.HTTP_200_OK
        data_anon = res_anon.data['data']
        assert data_anon['total_courses'] == 0
        assert data_anon['completed_courses'] == 0
        assert data_anon['average_score'] == 0.0

        # 2. Authenticated user with real data
        course = Course.objects.create(
            id='crs-analytics-1',
            title='Realtime Systems Engineering',
            slug='realtime-systems',
            description='Production Realtime Distributed Systems',
            category='Systems'
        )
        Enrollment.objects.create(
            user=self.user,
            course=course,
            progress=100.0,
            completed_at=timezone.now()
        )
        ch = Chapter.objects.create(id='ch-an-1', course=course, title='Ch 1')
        lsn = Lesson.objects.create(id='lsn-an-1', chapter=ch, title='Lsn 1', duration_minutes=30)
        LessonProgress.objects.create(
            user=self.user,
            lesson=lsn,
            completed=True
        )

        test = Test.objects.create(
            id='tst-an-1',
            title='Distributed Consensus Exam',
            slug='distributed-consensus-exam',
            duration_minutes=30,
            total_marks=100
        )
        Question.objects.create(
            test=test,
            prompt='Consensus protocol question',
            difficulty=1.2
        )
        TestAttempt.objects.create(
            user=self.user,
            test=test,
            attempt_number=1,
            score=90.0,
            passed=True,
            status='SUBMITTED',
            started_at=timezone.now() - timedelta(minutes=25),
            submitted_at=timezone.now(),
            time_spent_seconds=1500
        )

        TopicPerformance.objects.create(
            user=self.user,
            topic='Raft & Paxos Consensus',
            total_count=10,
            correct_count=9,
            accuracy=90.0
        )

        res_auth = self.client.get(reverse('analytics-dashboard'))
        assert res_auth.status_code == status.HTTP_200_OK
        data_auth = res_auth.data['data']

        assert data_auth['total_courses'] == 1
        assert data_auth['completed_courses'] == 1
        assert data_auth['average_score'] == 90.0
        assert data_auth['total_learning_time'] == 30 + round(1500 / 60)
        assert data_auth['xp_points'] == 600
        assert data_auth['rank'] == 'Junior Scholar'
        assert len(data_auth['topic_performance']) >= 1
        assert data_auth['topic_performance'][0]['topic'] == 'Raft & Paxos Consensus'

    def test_learning_activity_timeline_and_trends(self):
        # 1. Learning activity endpoint with 7-day query
        url = reverse('analytics-learning-activity')
        res = self.client.get(url, {'days': 7})
        assert res.status_code == status.HTTP_200_OK
        activity = res.data['data']
        assert len(activity) == 7
        assert 'date' in activity[0]
        assert 'time_spent' in activity[0]

        # 2. Performance trend endpoint
        trend_url = reverse('analytics-performance-trend')
        res_trend = self.client.get(trend_url, {'days': 7})
        assert res_trend.status_code == status.HTTP_200_OK
        trend = res_trend.data['data']
        assert len(trend) == 7

        # 3. Weak areas endpoint
        TopicPerformance.objects.create(
            user=self.user,
            topic='Segment Trees',
            total_count=5,
            correct_count=2,
            accuracy=40.0
        )
        weak_url = reverse('analytics-weak-areas')
        res_weak = self.client.get(weak_url)
        assert res_weak.status_code == status.HTTP_200_OK
        weak_areas = res_weak.data['data']['weak_areas']
        assert len(weak_areas) >= 1
        assert weak_areas[0]['topic'] == 'Segment Trees'
        assert weak_areas[0]['accuracy'] == 40.0
        assert 'recommended_action' in weak_areas[0]

    def test_test_analytics_endpoint(self):
        t_easy = Test.objects.create(
            id='tst-easy',
            title='Intro Test',
            slug='intro-test',
            duration_minutes=15
        )
        Question.objects.create(
            test=t_easy,
            prompt='Intro question',
            difficulty=-1.2
        )
        t_hard = Test.objects.create(
            id='tst-hard',
            title='Advanced Test',
            slug='advanced-test',
            duration_minutes=45
        )
        Question.objects.create(
            test=t_hard,
            prompt='Advanced question',
            difficulty=1.5
        )

        TestAttempt.objects.create(
            user=self.user,
            test=t_easy,
            score=95.0,
            passed=True,
            status='SUBMITTED',
            submitted_at=timezone.now()
        )
        TestAttempt.objects.create(
            user=self.user,
            test=t_hard,
            score=50.0,
            passed=False,
            status='SUBMITTED',
            submitted_at=timezone.now()
        )

        url = reverse('test-analytics')
        res = self.client.get(url)
        assert res.status_code == status.HTTP_200_OK
        data = res.data['data']
        assert data['total_tests'] == 2
        assert data['passed_tests'] == 1
        assert data['pass_rate'] == 50.0
        assert data['average_score'] == 72.5
        assert data['by_difficulty']['Easy']['total'] == 1
        assert data['by_difficulty']['Easy']['passed'] == 1
        assert data['by_difficulty']['Hard']['total'] == 1
        assert data['by_difficulty']['Hard']['passed'] == 0

    def test_course_search_relevance_ranking(self):
        c1 = Course.objects.create(
            id='crs-py-dsa',
            title='Data Structures and Algorithms in Python',
            slug='python-dsa-mastery',
            description='Complete guide to arrays, trees, and graphs in Python',
            tags=['python', 'dsa', 'algorithms'],
            category='Computer Science'
        )
        c2 = Course.objects.create(
            id='crs-web-dev',
            title='Fullstack Web Development with React',
            slug='fullstack-react',
            description='Learn React, Node, and Tailwind',
            tags=['react', 'frontend'],
            category='Web'
        )

        url = reverse('courses-list')
        res = self.client.get(url, {'search': 'python algorithms structures'})
        assert res.status_code == status.HTTP_200_OK
        results = res.data['data']
        assert len(results) >= 1
        # c1 matches all 3 tokens in title and tags, so it must rank first
        assert results[0]['id'] == 'crs-py-dsa'

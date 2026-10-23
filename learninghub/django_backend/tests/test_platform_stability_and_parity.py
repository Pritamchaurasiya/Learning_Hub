import pytest
from django.utils import timezone
from rest_framework.test import APIClient
from rest_framework import status
from apps.users.models import User
from apps.courses.models import Course, Chapter, Lesson, Enrollment, LessonProgress
from apps.courses.serializers import EnrollmentSerializer
from apps.social.models import Discussion, Comment, LiveSession, Mentor
from apps.problems.models import Problem, ProblemSubmission
from apps.ai_tutor.models import StudyTask, StudySchedule


@pytest.mark.django_db
class TestPlatformStabilityAndParity:
    def setup_method(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            email='platform_qa@learninghub.app',
            password='StrongPassword123!',
            username='PlatformQA'
        )
        self.client.force_authenticate(user=self.user)

    def test_user_stripe_customer_id_and_billing_endpoints(self):
        """Verify User model has stripe_customer_id and billing views do not raise AttributeError."""
        assert hasattr(self.user, 'stripe_customer_id')
        assert self.user.stripe_customer_id == ''

        # Endpoint /ecommerce/stripe/subscriptions should return 200 with empty list
        resp = self.client.get('/api/v1/ecommerce/stripe/subscriptions')
        assert resp.status_code == status.HTTP_200_OK
        data = resp.json()['data']
        assert 'subscriptions' in data
        assert data['subscriptions'] == []

    def test_course_lessons_unauthenticated_does_not_crash(self):
        """Verify unauthenticated requests to course lessons do not crash with UnboundLocalError."""
        course = Course.objects.create(
            id='crs-qa-lessons',
            title='Quality Assurance 101',
            slug='quality-assurance-101',
            price=0.0
        )
        chapter = Chapter.objects.create(
            id='chp-qa-1',
            course=course,
            title='Chapter 1',
            order=1
        )
        Lesson.objects.create(
            id='lsn-qa-1',
            chapter=chapter,
            title='Introduction to QA',
            is_free_preview=True,
            order=1
        )

        unauth_client = APIClient()
        resp = unauth_client.get(f'/api/v1/courses/{course.id}/lessons')
        assert resp.status_code == status.HTTP_200_OK
        data = resp.json()['data']
        assert len(data) == 1
        assert len(data[0]['lessons']) == 1
        assert data[0]['lessons'][0]['is_completed'] is False

    def test_enrollment_serializer_status(self):
        """Verify Enrollment model has status property and EnrollmentSerializer instantiates cleanly."""
        course = Course.objects.create(
            id='crs-enroll-status',
            title='Enrollment Status Test Course',
            slug='enrollment-status-test-course'
        )
        enrollment = Enrollment.objects.create(
            user=self.user,
            course=course,
            progress=45.0
        )
        assert enrollment.status == 'active'

        serialized = EnrollmentSerializer(enrollment).data
        assert serialized['status'] == 'active'
        assert serialized['progress'] == 45.0

        enrollment.progress = 100.0
        assert enrollment.status == 'completed'

    def test_live_session_and_mentor_serializers(self):
        """Verify LiveSession and Mentor endpoints return 200 without ImproperlyConfigured crashes."""
        LiveSession.objects.create(
            id='live-qa-test',
            title='Live Systems Architecture Prep',
            instructor_name='Prof. Turing',
            duration_minutes=60,
            attendees_count=50
        )
        resp_live = self.client.get('/api/v1/live-sessions')
        assert resp_live.status_code == status.HTTP_200_OK
        live_data = resp_live.json()['data']
        assert len(live_data) >= 1
        assert 'end_time' in live_data[0]
        assert 'max_participants' in live_data[0]

        Mentor.objects.create(
            id='mnt-qa-test',
            name='Ada Lovelace',
            title='Principal Engineer',
            specialization='Algorithms & Distributed Systems'
        )
        resp_mentor = self.client.get('/api/v1/mentors')
        assert resp_mentor.status_code == status.HTTP_200_OK
        mentor_data = resp_mentor.json()['data']
        assert len(mentor_data) >= 1
        assert 'bio' in mentor_data[0]
        assert 'sessions_conducted' in mentor_data[0]

    def test_discussion_replies_get_method(self):
        """Verify GET /discussions/threads/<id>/replies returns comments without 405 Method Not Allowed."""
        discussion = Discussion.objects.create(
            id='disc-qa-replies',
            user=self.user,
            title='How to optimize Two Sum?',
            content='Using hash map gives O(N) time.'
        )
        Comment.objects.create(
            id='cmt-qa-1',
            discussion=discussion,
            user=self.user,
            content='One pass hash map is optimal!'
        )

        resp = self.client.get(f'/api/v1/discussions/threads/{discussion.id}/replies')
        assert resp.status_code == status.HTTP_200_OK
        comments = resp.json()['data']
        assert len(comments) == 1
        assert comments[0]['content'] == 'One pass hash map is optimal!'
        assert isinstance(comments[0]['author'], dict)
        assert comments[0]['author']['username'] == 'PlatformQA'

    def test_discussion_vote_and_bookmark(self):
        """Verify voting updates upvotes and bookmarking toggles discussion bookmark."""
        discussion = Discussion.objects.create(
            id='disc-qa-voting',
            user=self.user,
            title='Dynamic Programming State Reductions',
            content='Space optimization tips'
        )

        # Vote +1
        vote_resp = self.client.post(f'/api/v1/discussions/threads/{discussion.id}/vote', {'value': 1})
        assert vote_resp.status_code == status.HTTP_200_OK
        v_data = vote_resp.json()['data']
        assert v_data['upvotes'] == 1
        assert v_data['user_vote'] == 1

        # Bookmark toggle
        bm_resp = self.client.post(f'/api/v1/discussions/{discussion.id}/bookmark')
        assert bm_resp.status_code == status.HTTP_200_OK
        assert bm_resp.json()['data']['bookmarked'] is True

        # Unbookmark toggle
        unbm_resp = self.client.post(f'/api/v1/discussions/{discussion.id}/bookmark')
        assert unbm_resp.status_code == status.HTTP_200_OK
        assert unbm_resp.json()['data']['bookmarked'] is False

    def test_dsa_stats_endpoint(self):
        """Verify /gamification/dsa-stats returns structured DSA user statistics."""
        resp = self.client.get('/api/v1/gamification/dsa-stats')
        assert resp.status_code == status.HTTP_200_OK
        data = resp.json()['data']
        assert 'total_problems' in data
        assert 'solved_problems' in data
        assert 'acceptance_rate' in data
        assert 'current_streak' in data
        assert 'rank' in data
        assert 'easy_solved' in data

    def test_study_planner_crud_lifecycle(self):
        """Verify creating, listing, updating, completing, and progress metrics in Study Planner."""
        # 1. Create task
        create_resp = self.client.post('/api/v1/study-planner/tasks', {
            'title': 'Solve 3 Graph Problems',
            'task_type': 'practice',
            'duration_minutes': 60,
            'priority': 'high',
            'scheduled_date': str(timezone.now().date())
        })
        assert create_resp.status_code == status.HTTP_201_CREATED
        task_id = create_resp.json()['data']['id']

        # 2. Query today tasks
        today_resp = self.client.get('/api/v1/study-planner/tasks/today')
        assert today_resp.status_code == status.HTTP_200_OK
        assert len(today_resp.json()['data']) >= 1

        # 3. Complete task (+15 XP)
        init_xp = self.user.xp or 0
        comp_resp = self.client.post(f'/api/v1/study-planner/tasks/{task_id}/complete', {'notes': 'All 3 solved!'})
        assert comp_resp.status_code == status.HTTP_200_OK
        assert comp_resp.json()['data']['status'] == 'completed'
        self.user.refresh_from_db()
        assert self.user.xp == init_xp + 15

        # 4. Fetch schedule
        sched_resp = self.client.get('/api/v1/study-planner/schedules/my-schedule')
        assert sched_resp.status_code == status.HTTP_200_OK
        assert 'daily_goal_minutes' in sched_resp.json()['data']

        # 5. Fetch 7-day progress
        prog_resp = self.client.get('/api/v1/study-planner/progress?days=7')
        assert prog_resp.status_code == status.HTTP_200_OK
        prog_data = prog_resp.json()['data']
        assert len(prog_data) == 7
        assert prog_data[-1]['tasks_completed'] >= 1

    def test_course_progress_lesson_completion_sync(self):
        """Verify passing lessonId to course progress atomically marks lesson complete."""
        course = Course.objects.create(
            id='crs-sync-test',
            title='Atomic Sync Masterclass',
            slug='atomic-sync-masterclass'
        )
        chapter = Chapter.objects.create(
            id='chp-sync-1',
            course=course,
            title='Chapter 1',
            order=1
        )
        l1 = Lesson.objects.create(
            id='lsn-sync-1',
            chapter=chapter,
            title='Lesson 1',
            order=1
        )
        l2 = Lesson.objects.create(
            id='lsn-sync-2',
            chapter=chapter,
            title='Lesson 2',
            order=2
        )

        # Mark lesson 1 complete via /courses/<pk>/progress with lessonId
        resp = self.client.post(f'/api/v1/courses/{course.id}/progress', {
            'progress': 50.0,
            'lessonId': l1.id
        })
        assert resp.status_code == status.HTTP_200_OK
        p_data = resp.json()['data']
        assert p_data['completed_lessons'] == 1
        assert p_data['total_lessons'] == 2
        assert p_data['progress'] == 50.0

        # Verify LessonProgress in DB
        assert LessonProgress.objects.filter(user=self.user, lesson=l1, completed=True).exists()
        assert not LessonProgress.objects.filter(user=self.user, lesson=l2, completed=True).exists()

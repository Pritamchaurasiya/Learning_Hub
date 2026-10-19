from unittest.mock import patch

import pytest
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from apps.users.models import User
from apps.courses.models import Course, Chapter, Lesson, Enrollment, CourseReview, CourseBookmark
from apps.problems.models import Problem, TestCase, ProblemSubmission
from apps.problems.sandbox import CodeSandboxService

@pytest.mark.django_db
class TestCoursesAndProblems:
    def setup_method(self):
        self.client = APIClient()
        self.user = User.objects.create_user(email='learner@learninghub.app', password='Password123!', username='Learner')
        self.client.force_authenticate(user=self.user)

    def test_course_list_and_enroll(self):
        course = Course.objects.create(
            id='crs-test-1',
            title='Test Course Python',
            slug='test-course-python',
            description='Test Course Description',
            category='Python',
            price=29.00
        )
        ch = Chapter.objects.create(id='ch-1', course=course, title='Chapter 1')
        lesson = Lesson.objects.create(id='lsn-1', chapter=ch, title='Lesson 1', duration_minutes=20)

        # List courses
        url = reverse('courses-list')
        res = self.client.get(url)
        assert res.status_code == status.HTTP_200_OK
        assert len(res.data['data']) >= 1

        # Enroll in course
        enroll_url = reverse('course-enroll', kwargs={'pk': course.id})
        enroll_res = self.client.post(enroll_url)
        assert enroll_res.status_code == status.HTTP_200_OK
        assert Enrollment.objects.filter(user=self.user, course=course).exists()

        # Update lesson progress
        progress_url = reverse('lesson-progress-update', kwargs={'lesson_id': lesson.id})
        prog_res = self.client.post(progress_url, {'completed': True}, format='json')
        assert prog_res.status_code == status.HTTP_200_OK
        assert prog_res.data['data']['completed'] is True

    def test_problem_execution_and_submission(self):
        problem = Problem.objects.create(
            id='prob-square-test',
            title='Square Number',
            slug='square-number',
            description='Return x * x',
            difficulty='Easy',
            category='Math'
        )
        TestCase.objects.create(problem=problem, input_data='5', expected_output='25', is_hidden=False)

        # Run code sandbox
        run_url = reverse('global-code-run')
        code = 'print(5 * 5)'
        isolated_result = {
            'success': True,
            'stdout': '25\n',
            'stderr': '',
            'runtime_ms': 1,
            'memory_mb': 1.0,
            'status': 'Accepted',
        }
        with patch.object(CodeSandboxService, '_run_container', return_value=isolated_result):
            run_res = self.client.post(run_url, {'code': code, 'language': 'python'}, format='json')
            assert run_res.status_code == status.HTTP_200_OK
            assert '25' in run_res.data['data']['stdout']

            # Submit code
            sub_url = reverse('problem-submit', kwargs={'pk': problem.id})
            sub_res = self.client.post(sub_url, {'code': code, 'language': 'python'}, format='json')
            assert sub_res.status_code == status.HTTP_201_CREATED
            assert sub_res.data['data']['status'] == 'Accepted'
            assert ProblemSubmission.objects.filter(user=self.user, problem=problem).exists()

    def test_course_detail_with_enrollment_and_bookmark(self):
        course = Course.objects.create(
            id='crs-detail-1',
            title='Detail Course',
            slug='detail-course',
            description='Test Description',
            category='Test',
            price=49.00
        )
        ch = Chapter.objects.create(id='ch-d1', course=course, title='Chapter 1')
        Lesson.objects.create(id='lsn-d1', chapter=ch, title='Lesson 1', duration_minutes=30)

        # Unauthenticated access
        anon_client = APIClient()
        url = reverse('course-detail', kwargs={'pk': course.id})
        res = anon_client.get(url)
        assert res.status_code == status.HTTP_200_OK
        assert res.data['data']['is_enrolled'] is False
        assert res.data['data']['progress'] == 0.0
        assert res.data['data']['is_bookmarked'] is False

        # Authenticated access - not enrolled
        res = self.client.get(url)
        assert res.status_code == status.HTTP_200_OK
        assert res.data['data']['is_enrolled'] is False
        assert res.data['data']['progress'] == 0.0

        # Enroll and check
        enroll_url = reverse('course-enroll', kwargs={'pk': course.id})
        self.client.post(enroll_url)
        res = self.client.get(url)
        assert res.data['data']['is_enrolled'] is True
        assert res.data['data']['progress'] == 0.0

        # Bookmark course
        bookmark_url = reverse('course-bookmark', kwargs={'pk': course.id})
        bm_res = self.client.post(bookmark_url)
        assert bm_res.status_code == status.HTTP_200_OK
        assert CourseBookmark.objects.filter(user=self.user, course=course).exists()
        
        res = self.client.get(url)
        assert res.data['data']['is_bookmarked'] is True

    def test_course_search_ranking(self):
        # Create courses with different relevance
        c1 = Course.objects.create(
            id='crs-search-1',
            title='Advanced Python Programming',
            slug='advanced-python-programming',
            description='Master Python with advanced topics',
            tags=['python', 'advanced', 'programming'],
            category='Python'
        )
        c2 = Course.objects.create(
            id='crs-search-2',
            title='Python Basics for Beginners',
            slug='python-basics',
            description='Learn Python fundamentals',
            tags=['python', 'basics'],
            category='Python'
        )
        c3 = Course.objects.create(
            id='crs-search-3',
            title='Web Development with React',
            slug='web-dev-react',
            description='Build modern web apps',
            tags=['react', 'web', 'frontend'],
            category='Web'
        )

        url = reverse('courses-list')
        res = self.client.get(url, {'search': 'python advanced'})
        assert res.status_code == status.HTTP_200_OK
        results = res.data['data']
        assert len(results) >= 2
        # c1 should rank higher (matches both 'python' and 'advanced' in title/tags)
        assert results[0]['id'] == 'crs-search-1'

    def test_course_reviews(self):
        course = Course.objects.create(
            id='crs-review-1',
            title='Reviewable Course',
            slug='reviewable-course',
            description='Can be reviewed',
            category='Test'
        )
        
        # Create review
        review_url = reverse('course-review', kwargs={'pk': course.id})
        review_res = self.client.post(review_url, {
            'rating': 5,
            'review_text': 'Excellent course!'
        }, format='json')
        assert review_res.status_code == status.HTTP_201_CREATED

        # Get reviews
        res = self.client.get(review_url)
        assert res.status_code == status.HTTP_200_OK
        assert len(res.data['data']) >= 1
        assert res.data['data'][0]['rating'] == 5
        assert res.data['data'][0]['review_text'] == 'Excellent course!'

    def test_lesson_progress_recalculates_enrollment_progress(self):
        course = Course.objects.create(
            id='crs-progress-1',
            title='Progress Course',
            slug='progress-course',
            description='Test progress tracking',
            category='Test'
        )
        ch1 = Chapter.objects.create(id='ch-p1', course=course, title='Chapter 1')
        ch2 = Chapter.objects.create(id='ch-p2', course=course, title='Chapter 2')
        l1 = Lesson.objects.create(id='lsn-p1', chapter=ch1, title='Lesson 1', duration_minutes=15)
        l2 = Lesson.objects.create(id='lsn-p2', chapter=ch2, title='Lesson 2', duration_minutes=20)
        l3 = Lesson.objects.create(id='lsn-p3', chapter=ch2, title='Lesson 3', duration_minutes=25)

        # Enroll
        enroll_url = reverse('course-enroll', kwargs={'pk': course.id})
        self.client.post(enroll_url)

        # Complete 1 of 3 lessons
        progress_url = reverse('lesson-progress-update', kwargs={'lesson_id': l1.id})
        res = self.client.post(progress_url, {'completed': True}, format='json')
        assert res.data['data']['courseProgress'] == 33.3  # 1/3 = 33.3%

        # Complete 2 of 3 lessons
        res = self.client.post(reverse('lesson-progress-update', kwargs={'lesson_id': l2.id}), {'completed': True}, format='json')
        assert res.data['data']['courseProgress'] == 66.7  # 2/3 = 66.7%

        # Complete all 3
        res = self.client.post(reverse('lesson-progress-update', kwargs={'lesson_id': l3.id}), {'completed': True}, format='json')
        assert res.data['data']['courseProgress'] == 100.0

    def test_course_prerequisites_validation(self):
        # Create prerequisite course
        prereq = Course.objects.create(
            id='crs-prereq',
            title='Prerequisite Course',
            slug='prereq-course',
            description='Required first',
            category='Python'
        )
        
        # Create course with prerequisite
        course = Course.objects.create(
            id='crs-with-prereq',
            title='Advanced Course',
            slug='advanced-course',
            description='Requires prereq',
            category='Python',
            prerequisites=[{'course_id': 'crs-prereq', 'minimum_progress': 70.0}]
        )

        # Try to enroll without completing prereq
        enroll_url = reverse('course-enroll', kwargs={'pk': course.id})
        res = self.client.post(enroll_url)
        assert res.status_code == status.HTTP_400_BAD_REQUEST
        assert res.data['code'] == 'PREREQUISITE_NOT_MET'

        # Complete prereq
        ch = Chapter.objects.create(id='ch-prereq', course=prereq, title='Prereq Chapter')
        lesson = Lesson.objects.create(id='lsn-prereq', chapter=ch, title='Lesson', duration_minutes=10)
        self.client.post(reverse('course-enroll', kwargs={'pk': prereq.id}))
        self.client.post(reverse('lesson-progress-update', kwargs={'lesson_id': lesson.id}), {'completed': True}, format='json')
        # Progress is 100% (1/1 lessons)
        
        # Now try to enroll in advanced course
        res = self.client.post(enroll_url)
        assert res.status_code == status.HTTP_200_OK
        assert res.data['data']['enrolled'] is True

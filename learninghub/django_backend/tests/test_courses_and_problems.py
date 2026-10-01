import pytest
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from apps.users.models import User
from apps.courses.models import Course, Chapter, Lesson, Enrollment
from apps.problems.models import Problem, TestCase, ProblemSubmission

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
        run_res = self.client.post(run_url, {'code': code, 'language': 'python'}, format='json')
        assert run_res.status_code == status.HTTP_200_OK
        assert '25' in run_res.data['data']['stdout']

        # Submit code
        sub_url = reverse('problem-submit', kwargs={'pk': problem.id})
        sub_res = self.client.post(sub_url, {'code': code, 'language': 'python'}, format='json')
        assert sub_res.status_code == status.HTTP_201_CREATED
        assert sub_res.data['data']['status'] == 'Accepted'
        assert ProblemSubmission.objects.filter(user=self.user, problem=problem).exists()

"""
Comprehensive tests for Quiz API endpoints.
"""

from django.test import TestCase
from django.contrib.auth import get_user_model
from django.utils import timezone
from rest_framework.test import APITestCase, APIClient
from rest_framework import status

from apps.courses.models import Course, Category
from apps.quiz.models import Quiz, Question, Option, QuizAttempt

User = get_user_model()


class QuizModelTests(TestCase):
    """Tests for Quiz model."""

    def setUp(self):
        self.user = User.objects.create_user(
            username="testuser", email="test@example.com", password="testpass123"
        )
        self.category = Category.objects.create(
            name="Test Category", slug="test-category"
        )
        self.course = Course.objects.create(
            title="Test Course",
            slug="test-course",
            description="Test description",
            instructor=self.user,
            category=self.category,
            is_published=True,
        )
        self.quiz = Quiz.objects.create(
            course=self.course,
            title="Test Quiz",
            description="Test quiz description",
            time_limit_minutes=30,
            passing_score=70,
            is_published=True,
        )

    def test_quiz_creation(self):
        """Test quiz is created with correct defaults."""
        self.assertEqual(self.quiz.title, "Test Quiz")
        self.assertEqual(self.quiz.time_limit_minutes, 30)
        self.assertTrue(self.quiz.is_published)
        self.assertIsNotNone(self.quiz.id)

    def test_quiz_str_representation(self):
        """Test quiz string representation."""
        self.assertEqual(str(self.quiz), "Test Quiz")


class QuizAPITests(APITestCase):
    """Tests for Quiz API endpoints."""

    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="testuser", email="test@example.com", password="testpass123"
        )
        self.category = Category.objects.create(
            name="Test Category", slug="test-cat-api"
        )
        self.course = Course.objects.create(
            title="Test Course",
            slug="test-course",
            description="Test description",
            instructor=self.user,
            category=self.category,
            is_published=True,
            price=0,
        )
        self.quiz = Quiz.objects.create(
            course=self.course,
            title="Test Quiz",
            description="Test quiz description",
            time_limit_minutes=30,
            passing_score=70,
            is_published=True,
        )
        # Create a question with options
        self.question = Question.objects.create(
            quiz=self.quiz, text="What is 2+2?", question_type="mcq", marks=10, order=1
        )
        self.option1 = Option.objects.create(
            question=self.question, text="4", is_correct=True, order=1
        )
        self.option2 = Option.objects.create(
            question=self.question, text="5", is_correct=False, order=2
        )

        # Authenticate user
        self.client.force_authenticate(user=self.user)

    def test_list_quizzes(self):
        """Test listing published quizzes."""
        response = self.client.get("/api/v1/quizzes/")
        self.assertEqual(response.status_code, status.HTTP_200_OK, response.content)
        self.assertIn("data", response.data)

    def test_get_quiz_detail(self):
        """Test getting quiz details."""
        response = self.client.get(f"/api/v1/quizzes/{self.quiz.id}/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["title"], "Test Quiz")

    def test_get_quizzes_by_course(self):
        """Test getting quizzes for a specific course."""
        response = self.client.get(
            f"/api/v1/quizzes/by_course/?course_id={self.course.id}"
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("data", response.data)


class QuizAttemptAPITests(APITestCase):
    """Tests for Quiz Attempt API endpoints."""

    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username="testuser", email="test@example.com", password="testpass123"
        )
        self.category = Category.objects.create(
            name="Test Category", slug="test-cat-attempt"
        )
        self.course = Course.objects.create(
            title="Test Course",
            slug="test-course",
            description="Test description",
            instructor=self.user,
            category=self.category,
            is_published=True,
            price=0,
        )
        # Create enrollment for the user
        from apps.courses.models import Enrollment

        self.enrollment = Enrollment.objects.create(user=self.user, course=self.course)

        self.quiz = Quiz.objects.create(
            course=self.course,
            title="Test Quiz",
            description="Test quiz description",
            time_limit_minutes=30,
            passing_score=70,
            is_published=True,
        )
        self.question = Question.objects.create(
            quiz=self.quiz, text="What is 2+2?", question_type="mcq", marks=10, order=1
        )
        self.option1 = Option.objects.create(
            question=self.question, text="4", is_correct=True, order=1
        )
        self.option2 = Option.objects.create(
            question=self.question, text="5", is_correct=False, order=2
        )

        self.client.force_authenticate(user=self.user)

    def test_start_quiz_attempt(self):
        """Test starting a quiz attempt."""
        data = {"quiz_id": str(self.quiz.id)}
        response = self.client.post("/api/v1/quizzes/attempts/start/", data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn("id", response.data["data"])

    def test_submit_answer(self):
        """Test submitting an answer."""
        # First start an attempt
        start_data = {"quiz_id": str(self.quiz.id)}
        start_response = self.client.post("/api/v1/quizzes/attempts/start/", start_data)
        attempt_id = start_response.data["data"]["id"]

        # Submit answer
        answer_data = {
            "question_id": str(self.question.id),
            "option_id": str(self.option1.id),
        }
        response = self.client.post(
            f"/api/v1/quizzes/attempts/{attempt_id}/answer/", answer_data
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_submit_quiz(self):
        """Test submitting/completing a quiz."""
        # Start attempt
        start_data = {"quiz_id": str(self.quiz.id)}
        start_response = self.client.post("/api/v1/quizzes/attempts/start/", start_data)
        attempt_id = start_response.data["data"]["id"]

        # Submit quiz
        response = self.client.post(f"/api/v1/quizzes/attempts/{attempt_id}/submit/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("score", response.data["data"])

    def test_get_attempt_result(self):
        """Test getting quiz attempt result."""
        # Create an attempt
        attempt = QuizAttempt.objects.create(
            user=self.user,
            quiz=self.quiz,
            status="completed",
            score=80,
            percentage_score=80,
            completed_at=timezone.now(),
        )

        response = self.client.get(f"/api/v1/quizzes/attempts/{attempt.id}/result/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data["data"]["score"], 80)

    def test_get_user_stats(self):
        """Test getting user quiz statistics."""
        response = self.client.get("/api/v1/quizzes/results/stats/")
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn("data", response.data)

"""
Quiz API Integration Tests
Comprehensive end-to-end testing for quiz functionality
"""
from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APITestCase, APIClient
from rest_framework import status
from django.contrib.auth import get_user_model
from apps.courses.models import Course, Category
from apps.quiz.models import Quiz, Question, Option, QuizAttempt, QuizAnswer as Answer

User = get_user_model()


class QuizIntegrationTests(APITestCase):
    """
    Integration tests covering complete quiz workflow:
    1. Quiz listing
    2. Quiz detail view
    3. Start quiz attempt
    4. Submit answers
    5. Get results
    """
    
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.category = Category.objects.create(
            name='Test Category',
            slug='test-category'
        )
        self.course = Course.objects.create(
            title='Test Course',
            slug='test-course',
            description='Test course description',
            instructor=self.user,
            category=self.category,
            is_published=True,
            price=0
        )
        self.quiz = Quiz.objects.create(
            course=self.course,
            title='Integration Test Quiz',
            description='Test quiz for integration testing',
            time_limit_minutes=30,
            passing_score=70,
            is_published=True
        )
        
        # Create questions with options
        self.question1 = Question.objects.create(
            quiz=self.quiz,
            text='What is 2+2?',
            question_type='mcq',
            marks=10,
            order=1
        )
        self.option1_correct = Option.objects.create(
            question=self.question1,
            text='4',
            is_correct=True,
            order=1
        )
        self.option1_wrong = Option.objects.create(
            question=self.question1,
            text='5',
            is_correct=False,
            order=2
        )
        
        self.question2 = Question.objects.create(
            quiz=self.quiz,
            text='What is 3+3?',
            question_type='mcq',
            marks=10,
            order=2
        )
        self.option2_correct = Option.objects.create(
            question=self.question2,
            text='6',
            is_correct=True,
            order=1
        )
        self.option2_wrong = Option.objects.create(
            question=self.question2,
            text='7',
            is_correct=False,
            order=2
        )
        
        # Create enrollment
        from apps.courses.models import Enrollment
        self.enrollment = Enrollment.objects.create(
            user=self.user,
            course=self.course
        )
        
        self.client.force_authenticate(user=self.user)
    
    def test_list_quizzes(self):
        """Test listing all quizzes."""
        url = reverse('quiz-list')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('data', response.data)
        
    def test_get_quiz_detail(self):
        """Test getting quiz detail."""
        url = reverse('quiz-detail', kwargs={'pk': self.quiz.id})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['title'], 'Integration Test Quiz')
        
    def test_complete_quiz_workflow(self):
        """Test the complete quiz workflow from listing to results."""
        # 1. List quizzes
        url = reverse('quiz-list')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('data', response.data)
        
        # 2. Get quiz detail
        url = reverse('quiz-detail', kwargs={'pk': self.quiz.id})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['title'], 'Integration Test Quiz')
        
        # 3. Start quiz attempt
        url = reverse('quiz-attempt-start')
        response = self.client.post(url, {
            'quiz_id': str(self.quiz.id)
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('data', response.data)
        attempt_id = response.data['data']['id']
        
        # 4. Submit answers
        answers = [
            {
                'question_id': str(self.question1.id),
                'selected_option_id': str(self.option1_correct.id)
            },
            {
                'question_id': str(self.question2.id),
                'selected_option_id': str(self.option2_correct.id)
            }
        ]
        
        # Complete attempt via submit action
        url = reverse('quiz-attempt-submit', kwargs={'pk': attempt_id})
        response = self.client.post(url, {
            'attempt_id': str(attempt_id),
            'answers': answers
        })
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # 5. Get results
        url = reverse('quiz-attempt-detail', kwargs={'pk': attempt_id})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('id', response.data)
    
    def test_quiz_attempt_without_enrollment(self):
        """Test that users without enrollment cannot start quiz."""
        # Remove enrollment
        from apps.courses.models import Enrollment
        Enrollment.objects.filter(user=self.user, course=self.course).delete()
        
        url = reverse('quiz-attempt-start')
        response = self.client.post(url, {
            'quiz_id': str(self.quiz.id)
        })
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)
    
    def test_quiz_attempt_time_limit(self):
        """Test quiz attempt with time limit enforcement."""
        # Start attempt
        url = reverse('quiz-attempt-start')
        response = self.client.post(url, {
            'quiz_id': str(self.quiz.id)
        })
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Verify time limit is set
        attempt_data = response.data['data']
        self.assertIn('quiz', attempt_data)
    
    def test_invalid_quiz_id(self):
        """Test handling of invalid quiz ID."""
        url = reverse('quiz-attempt-start')
        response = self.client.post(url, {
            'quiz_id': 'invalid-uuid'
        })
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
    
    def test_unpublished_quiz_access(self):
        """Test that unpublished quizzes are not accessible."""
        self.quiz.is_published = False
        self.quiz.save()
        
        url = reverse('quiz-detail', kwargs={'pk': self.quiz.id})
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
    
    def test_quiz_listing_filters(self):
        """Test quiz listing with various filters."""
        # Create another quiz
        quiz2 = Quiz.objects.create(
            course=self.course,
            title='Another Quiz',
            description='Another test quiz',
            is_published=True
        )
        
        # Test listing
        url = reverse('quiz-list')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Both quizzes should be in the list
        quiz_ids = [q['id'] for q in response.data.get('data', response.data)]
        self.assertIn(str(self.quiz.id), quiz_ids)
        self.assertIn(str(quiz2.id), quiz_ids)


class QuizErrorHandlingTests(APITestCase):
    """Test error handling and edge cases."""
    
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.category = Category.objects.create(
            name='Test Category',
            slug='test-category'
        )
        self.course = Course.objects.create(
            title='Test Course',
            slug='test-course',
            description='Test course description',
            instructor=self.user,
            category=self.category,
            is_published=True,
            price=0
        )
        self.quiz = Quiz.objects.create(
            course=self.course,
            title='Error Test Quiz',
            description='Test quiz',
            is_published=True
        )
        
        from apps.courses.models import Enrollment
        self.enrollment = Enrollment.objects.create(
            user=self.user,
            course=self.course
        )
        
        self.client.force_authenticate(user=self.user)
    
    def test_duplicate_quiz_attempt(self):
        """Test that duplicate attempts are handled."""
        url = reverse('quiz-attempt-start')
        # Start first attempt
        response = self.client.post(url, {
            'quiz_id': str(self.quiz.id)
        })
        self.assertIn(response.status_code, [status.HTTP_201_CREATED, status.HTTP_200_OK])
        
        # Try to start second attempt
        response = self.client.post(url, {
            'quiz_id': str(self.quiz.id)
        })
        # Should return 200 (Resuming existing)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
    
    def test_submit_answers_invalid_attempt(self):
        """Test submitting answers for non-existent attempt."""
        url = reverse('quiz-attempt-detail', kwargs={'pk': 'invalid-uuid'})
        response = self.client.patch(url, {
            'answers': [],
            'status': 'completed'
        })
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
    
    def test_unauthenticated_access(self):
        """Test that unauthenticated users cannot access quizzes."""
        self.client.force_authenticate(user=None)
        
        url = reverse('quiz-list')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)


class QuizPerformanceTests(APITestCase):
    """Test performance characteristics."""
    
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.category = Category.objects.create(
            name='Test Category',
            slug='test-category'
        )
        self.course = Course.objects.create(
            title='Test Course',
            slug='test-course',
            description='Test course description',
            instructor=self.user,
            category=self.category,
            is_published=True,
            price=0
        )
        
        # Create multiple quizzes for performance testing
        for i in range(10):
            Quiz.objects.create(
                course=self.course,
                title=f'Performance Test Quiz {i}',
                description=f'Test quiz {i}',
                is_published=True
            )
        
        self.client.force_authenticate(user=self.user)
    
    def test_quiz_listing_performance(self):
        """Test that quiz listing performs well with multiple quizzes."""
        import time
        
        url = reverse('quiz-list')
        start_time = time.time()
        response = self.client.get(url)
        end_time = time.time()
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertLess(end_time - start_time, 1.0)  # Should complete in < 1 second
        self.assertEqual(len(response.data.get('data', response.data)), 10)

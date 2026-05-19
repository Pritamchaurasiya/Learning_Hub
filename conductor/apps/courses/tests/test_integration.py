"""
Courses API Integration Tests
Comprehensive testing for course functionality
"""
from django.test import TestCase
from rest_framework.test import APITestCase, APIClient
from rest_framework import status
from django.contrib.auth import get_user_model
from apps.courses.models import Course, Category, Enrollment, Review, Lesson, LessonProgress as Progress
from django.core.cache import cache

User = get_user_model()


class CourseIntegrationTests(APITestCase):
    """
    Integration tests covering complete course workflow:
    1. Course listing and filtering
    2. Course detail view
    3. Enrollment
    4. Lesson access
    5. Progress tracking
    6. Reviews
    """
    
    def setUp(self):
        cache.clear()
        self.client = APIClient()
        self.instructor = User.objects.create_user(
            username='instructor',
            email='instructor@example.com',
            password='testpass123'
        )
        self.student = User.objects.create_user(
            username='student',
            email='student@example.com',
            password='testpass123'
        )
        self.category = Category.objects.create(
            name='Programming',
            slug='programming'
        )
        self.course = Course.objects.create(
            title='Python Basics',
            slug='python-basics',
            description='Learn Python from scratch',
            instructor=self.instructor,
            category=self.category,
            is_published=True,
            price=0
        )
        from apps.courses.models import Module
        
        self.module = Module.objects.create(
            course=self.course,
            title='Module 1',
            order=1
        )
        
        # Create lessons
        self.lesson1 = Lesson.objects.create(
            module=self.module,
            title='Introduction to Python',
            order=1,
            duration_minutes=15
        )
        self.lesson2 = Lesson.objects.create(
            module=self.module,
            title='Variables and Data Types',
            order=2,
            duration_minutes=20
        )
        
        self.client.force_authenticate(user=self.student)
    
    def test_complete_course_workflow(self):
        """Test complete course workflow from browsing to completion."""
        
        # 1. List courses
        response = self.client.get('/api/v1/courses/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('data', response.data)
        
        # 2. Get course detail
        response = self.client.get(f'/api/v1/courses/{self.course.slug}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['title'], 'Python Basics')
        
        # 3. Enroll in course
        response = self.client.post(f'/api/v1/courses/{self.course.slug}/enroll/')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # 4. Update lesson progress
        response = self.client.post(
            f'/api/v1/courses/{self.course.slug}/update-progress/',
            {
                'lesson_id': self.lesson1.id,
                'seconds': 900
            }
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # 5. Complete lesson
        response = self.client.post(
            f'/api/v1/courses/{self.course.slug}/complete-lesson/',
            {
                'lesson_id': self.lesson1.id
            }
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # 8. Create review
        response = self.client.post(
            f'/api/v1/courses/{self.course.slug}/review/',
            {
                'rating': 5,
                'comment': 'Great course!'
            }
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
    
    def test_course_filtering_by_category(self):
        """Test course filtering by category."""
        # Create another category and course
        category2 = Category.objects.create(name='Web Development', slug='web-dev')
        course2 = Course.objects.create(
            title='HTML Basics',
            slug='html-basics',
            description='Learn HTML',
            instructor=self.instructor,
            category=category2,
            is_published=True,
            price=0
        )
        
        # Filter by first category
        response = self.client.get(f'/api/v1/courses/?category={self.category.slug}')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['data']), 1)
        self.assertEqual(response.data['data'][0]['title'], 'Python Basics')
    
    def test_enrollment_twice(self):
        """Test enrolling in same course twice."""
        # First enrollment
        response = self.client.post(f'/api/v1/courses/{self.course.slug}/enroll/')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Second enrollment attempt
        response = self.client.post(f'/api/v1/courses/{self.course.slug}/enroll/')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
    
    def test_unpublished_course_access(self):
        """Test that unpublished courses are not accessible."""
        self.course.is_published = False
        self.course.save()
        
        # Logout instructor and authenticate as student
        self.client.force_authenticate(user=self.student)
        
        response = self.client.get(f'/api/v1/courses/{self.course.slug}/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
    
    def test_review_validation(self):
        """Test review validation."""
        # Enroll first
        Enrollment.objects.create(
            user=self.student,
            course=self.course,
            progress_percentage=100
        )
        
        # Test invalid rating (above 5)
        response = self.client.post(
            f'/api/v1/courses/{self.course.slug}/review/',
            {
                'rating': 6,
                'comment': 'Invalid rating'
            }
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        
        # Test invalid rating (below 1)
        response = self.client.post(
            f'/api/v1/courses/{self.course.slug}/review/',
            {
                'rating': 0,
                'comment': 'Invalid rating'
            }
        )
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)


class CourseErrorHandlingTests(APITestCase):
    """Test error handling for courses."""
    
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.category = Category.objects.create(name='Test', slug='test')
        self.course = Course.objects.create(
            title='Test Course',
            slug='test-course',
            instructor=self.user,
            category=self.category,
            is_published=True,
            price=0
        )
        self.client.force_authenticate(user=self.user)
    
    def test_nonexistent_course(self):
        """Test accessing non-existent course."""
        response = self.client.get('/api/v1/courses/nonexistent-course/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
    
    def test_unauthorized_enrollment(self):
        """Test enrollment without authentication."""
        self.client.force_authenticate(user=None)
        response = self.client.post(f'/api/v1/courses/{self.course.slug}/enroll/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
    



class CoursePerformanceTests(APITestCase):
    """Test performance characteristics."""
    
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.category = Category.objects.create(name='Test', slug='test')
        
        # Create multiple courses for performance testing
        for i in range(50):
            Course.objects.create(
                title=f'Course {i}',
                slug=f'course-{i}',
                description=f'Description for course {i}',
                instructor=self.user,
                category=self.category,
                is_published=True,
                price=0
            )
        
        self.client.force_authenticate(user=self.user)
    
    def test_course_listing_performance(self):
        """Test that course listing performs well with many courses."""
        import time
        
        start_time = time.time()
        response = self.client.get('/api/v1/courses/')
        end_time = time.time()
        
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertLess(end_time - start_time, 2.0)  # Should complete in < 2 seconds

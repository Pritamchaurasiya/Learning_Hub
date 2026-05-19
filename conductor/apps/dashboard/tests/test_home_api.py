"""
Tests for Dashboard Home API endpoint.
"""

from django.test import TestCase
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta
from rest_framework.test import APITestCase, APIClient
from rest_framework import status

from apps.courses.models import Course, Category, Enrollment
from apps.users.models import Bookmark

User = get_user_model()


class HomeDashboardAPITests(APITestCase):
    """Tests for Home Dashboard API."""
    
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.category = Category.objects.create(name='Programming', slug='programming')
        
        # Create featured courses
        self.course1 = Course.objects.create(
            title='Python Basics',
            slug='python-basics',
            description='Learn Python fundamentals',
            instructor=self.user,
            category=self.category,
            is_published=True,
            is_featured=True,
            price=0
        )
        self.course2 = Course.objects.create(
            title='Web Development',
            slug='web-development',
            description='Learn web dev',
            instructor=self.user,
            category=self.category,
            is_published=True,
            is_featured=True,
            price=99
        )
        
        # Create non-featured course
        self.course3 = Course.objects.create(
            title='Hidden Course',
            slug='hidden-course',
            description='Not featured',
            instructor=self.user,
            category=self.category,
            is_published=True,
            is_featured=False
        )
        
        self.client.force_authenticate(user=self.user)
    
    def test_get_home_dashboard_authenticated(self):
        """Test getting dashboard data when authenticated."""
        response = self.client.get('/api/v1/dashboard/home/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('data', response.data)
        data = response.data['data']
        
        # Check structure
        self.assertIn('featured_courses', data)
        self.assertIn('categories', data)
        self.assertIn('stats', data)
        self.assertIn('recent_progress', data)
    
    def test_featured_courses_returned(self):
        """Test that featured courses are returned."""
        response = self.client.get('/api/v1/dashboard/home/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        featured_courses = response.data['data']['featured_courses']
        self.assertEqual(len(featured_courses), 2)
        
        # Verify course data structure
        course = featured_courses[0]
        self.assertIn('id', course)
        self.assertIn('title', course)
        self.assertIn('slug', course)
    
    def test_categories_returned(self):
        """Test that categories are returned."""
        response = self.client.get('/api/v1/dashboard/home/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        categories = response.data['data']['categories']
        self.assertGreaterEqual(len(categories), 1)
    
    def test_stats_empty_initially(self):
        """Test stats are empty when user has no activity."""
        response = self.client.get('/api/v1/dashboard/home/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        stats = response.data['data']['stats']
        self.assertEqual(stats['enrolled_courses'], 0)
        self.assertEqual(stats['completed_courses'], 0)
        self.assertEqual(stats['in_progress_courses'], 0)
        self.assertEqual(stats['bookmarks'], 0)
    
    def test_stats_with_enrollments(self):
        """Test stats include enrolled courses."""
        # Create enrollments
        Enrollment.objects.create(
            user=self.user,
            course=self.course1
        )
        Enrollment.objects.create(
            user=self.user,
            course=self.course2,
            completed_at=timezone.now()
        )
        
        response = self.client.get('/api/v1/dashboard/home/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        stats = response.data['data']['stats']
        self.assertEqual(stats['enrolled_courses'], 2)
        self.assertEqual(stats['completed_courses'], 1)
        self.assertEqual(stats['in_progress_courses'], 1)
    
    def test_stats_with_bookmarks(self):
        """Test stats include bookmarks."""
        # Create bookmarks
        Bookmark.objects.create(user=self.user, course=self.course1)
        Bookmark.objects.create(user=self.user, course=self.course2)
        
        response = self.client.get('/api/v1/dashboard/home/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        stats = response.data['data']['stats']
        self.assertEqual(stats['bookmarks'], 2)
    
    def test_recent_progress_with_activity(self):
        """Test recent progress shows enrolled courses."""
        # Create enrollment with recent activity
        enrollment = Enrollment.objects.create(
            user=self.user,
            course=self.course1,
            progress_percentage=50
        )
        enrollment.last_accessed_at = timezone.now()
        enrollment.save()
        
        response = self.client.get('/api/v1/dashboard/home/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        progress = response.data['data']['recent_progress']
        self.assertEqual(len(progress), 1)
        self.assertEqual(progress[0]['course_title'], 'Python Basics')
        self.assertEqual(progress[0]['progress_percent'], 50)
    
    def test_streak_calculation(self):
        """Test streak is calculated based on recent activity."""
        # Create enrollment with recent activity (within last week)
        enrollment = Enrollment.objects.create(
            user=self.user,
            course=self.course1
        )
        enrollment.last_accessed_at = timezone.now() - timedelta(days=2)
        enrollment.save()
        
        response = self.client.get('/api/v1/dashboard/home/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        stats = response.data['data']['stats']
        # Streak should be at least 1 (the day they accessed)
        self.assertGreaterEqual(stats['current_streak'], 1)
    
    def test_dashboard_requires_authentication(self):
        """Test dashboard requires authentication."""
        self.client.logout()
        response = self.client.get('/api/v1/dashboard/home/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
    
    def test_only_published_featured_courses(self):
        """Test only published featured courses are shown."""
        # Create unpublished featured course
        Course.objects.create(
            title='Unpublished Course',
            slug='unpublished',
            description='Draft',
            instructor=self.user,
            category=self.category,
            is_published=False,
            is_featured=True
        )
        
        response = self.client.get('/api/v1/dashboard/home/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        featured_courses = response.data['data']['featured_courses']
        # Should only show the 2 published featured courses
        self.assertEqual(len(featured_courses), 2)
        
        # Verify unpublished course is not included
        titles = [c['title'] for c in featured_courses]
        self.assertNotIn('Unpublished Course', titles)

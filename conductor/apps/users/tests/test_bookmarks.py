"""
Comprehensive tests for Bookmark API endpoints.
"""

from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase, APIClient
from rest_framework import status

from apps.courses.models import Course, Category
from apps.users.models import Bookmark

User = get_user_model()


class BookmarkModelTests(TestCase):
    """Tests for Bookmark model."""
    
    def setUp(self):
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.category = Category.objects.create(name='Test Category', slug='test-cat-bm1')
        self.course = Course.objects.create(
            title='Test Course',
            slug='test-course',
            description='Test description',
            instructor=self.user,
            category=self.category,
            is_published=True
        )
    
    def test_bookmark_creation(self):
        """Test bookmark is created correctly."""
        bookmark = Bookmark.objects.create(
            user=self.user,
            course=self.course,
            notes='Test notes'
        )
        self.assertEqual(bookmark.user, self.user)
        self.assertEqual(bookmark.course, self.course)
        self.assertEqual(bookmark.notes, 'Test notes')
    
    def test_bookmark_unique_constraint(self):
        """Test user cannot bookmark same course twice."""
        Bookmark.objects.create(user=self.user, course=self.course)
        with self.assertRaises(Exception):
            Bookmark.objects.create(user=self.user, course=self.course)
    
    def test_bookmark_str_representation(self):
        """Test bookmark string representation."""
        bookmark = Bookmark.objects.create(user=self.user, course=self.course)
        expected = f"{self.user.email} - {self.course.title}"
        self.assertEqual(str(bookmark), expected)


class BookmarkAPITests(APITestCase):
    """Tests for Bookmark API endpoints."""
    
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.category = Category.objects.create(name='Test Category', slug='test-cat-bm2')
        self.course = Course.objects.create(
            title='Test Course',
            slug='test-course',
            description='Test description',
            instructor=self.user,
            category=self.category,
            is_published=True
        )
        self.course2 = Course.objects.create(
            title='Another Course',
            slug='another-course',
            description='Another description',
            instructor=self.user,
            category=self.category,
            is_published=True
        )
        self.client.force_authenticate(user=self.user)
    
    def test_list_bookmarks_empty(self):
        """Test listing bookmarks when none exist."""
        response = self.client.get('/api/v1/users/profile/bookmarks/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 0)
        self.assertEqual(len(response.data['data']), 0)
    
    def test_list_bookmarks_with_data(self):
        """Test listing bookmarks with existing bookmarks."""
        # Create bookmarks
        Bookmark.objects.create(user=self.user, course=self.course)
        Bookmark.objects.create(user=self.user, course=self.course2)
        
        response = self.client.get('/api/v1/users/profile/bookmarks/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['count'], 2)
        self.assertEqual(len(response.data['data']), 2)
    
    def test_add_bookmark(self):
        """Test adding a bookmark."""
        data = {'course_id': str(self.course.id)}
        response = self.client.post('/api/v1/users/profile/bookmarks/', data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertIn('bookmark_id', response.data['data'])
        
        # Verify it was created
        self.assertTrue(Bookmark.objects.filter(user=self.user, course=self.course).exists())
    
    def test_add_bookmark_duplicate(self):
        """Test adding duplicate bookmark fails gracefully."""
        # Create first bookmark
        Bookmark.objects.create(user=self.user, course=self.course)
        
        # Try to create again
        data = {'course_id': str(self.course.id)}
        response = self.client.post('/api/v1/users/profile/bookmarks/', data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)
    
    def test_add_bookmark_invalid_course(self):
        """Test adding bookmark for non-existent course."""
        data = {'course_id': '00000000-0000-0000-0000-000000000000'}
        response = self.client.post('/api/v1/users/profile/bookmarks/', data)
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)
    
    def test_add_bookmark_with_notes(self):
        """Test adding a bookmark with notes."""
        data = {
            'course_id': str(self.course.id),
            'notes': 'Interesting course!'
        }
        response = self.client.post('/api/v1/users/profile/bookmarks/', data)
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        
        # Verify notes were saved
        bookmark = Bookmark.objects.get(user=self.user, course=self.course)
        self.assertEqual(bookmark.notes, 'Interesting course!')
    
    def test_remove_bookmark(self):
        """Test removing a bookmark."""
        # Create bookmark first
        Bookmark.objects.create(user=self.user, course=self.course)
        
        # Remove it
        response = self.client.delete(f'/api/v1/users/profile/bookmarks/{self.course.id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Verify it was deleted
        self.assertFalse(Bookmark.objects.filter(user=self.user, course=self.course).exists())
    
    def test_remove_nonexistent_bookmark(self):
        """Test removing bookmark that doesn't exist."""
        response = self.client.delete(f'/api/v1/users/profile/bookmarks/{self.course.id}/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        self.assertIn('error', response.data)
    
    def test_remove_bookmark_other_user(self):
        """Test cannot remove another user's bookmark."""
        # Create another user and their bookmark
        other_user = User.objects.create_user(
            username='otheruser',
            email='other@example.com',
            password='testpass123'
        )
        Bookmark.objects.create(user=other_user, course=self.course)
        
        # Try to delete as first user (should return 404 since it doesn't exist for this user)
        response = self.client.delete(f'/api/v1/users/profile/bookmarks/{self.course.id}/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
    
    def test_bookmarks_require_authentication(self):
        """Test bookmark endpoints require authentication."""
        self.client.logout()
        
        # Try to list
        response = self.client.get('/api/v1/users/profile/bookmarks/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        
        # Try to add
        data = {'course_id': str(self.course.id)}
        response = self.client.post('/api/v1/users/profile/bookmarks/', data)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)
        
        # Try to remove
        response = self.client.delete(f'/api/v1/users/profile/bookmarks/{self.course.id}/')
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

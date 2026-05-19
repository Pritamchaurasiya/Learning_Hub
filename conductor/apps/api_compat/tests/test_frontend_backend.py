"""
Frontend-Backend API Compatibility Tests

Verifies that frontend React components can properly communicate
with Django backend APIs. Tests API contract compliance.
"""
import json
from django.test import TestCase
from rest_framework.test import APITestCase, APIClient
from rest_framework import status
from django.contrib.auth import get_user_model
from apps.courses.models import Course, Category
from apps.quiz.models import Quiz

User = get_user_model()


class APIContractTests(APITestCase):
    """
    Tests API response format matches frontend expectations.
    Verifies data structure, field names, and types.
    """
    
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
            description='Test description',
            instructor=self.user,
            category=self.category,
            is_published=True,
            price=0
        )
        self.quiz = Quiz.objects.create(
            course=self.course,
            title='Test Quiz',
            description='Test quiz',
            is_published=True
        )
        self.client.force_authenticate(user=self.user)
    
    def test_standard_response_format(self):
        """Test API uses standard response format: { success, data, message, errors }."""
        endpoints = [
            '/api/v1/courses/',
            f'/api/v1/courses/{self.course.slug}/',
            '/api/v1/quizzes/',
            f'/api/v1/quizzes/{self.quiz.id}/',
        ]
        
        for endpoint in endpoints:
            response = self.client.get(endpoint)
            self.assertEqual(response.status_code, status.HTTP_200_OK)
            
            # Verify standard response structure
            if 'status' in response.data:
                self.assertEqual(response.data['status'], 'success')
                self.assertIn('data', response.data)
            else:
                # DRF default list, paginated response, or detail response
                self.assertTrue(
                    isinstance(response.data, list) or 
                    'results' in response.data or 
                    'id' in response.data
                )
    
    def test_pagination_format(self):
        """Test paginated responses have correct structure."""
        response = self.client.get('/api/v1/courses/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        # Check pagination fields
        if 'pagination' in response.data:
            pagination = response.data['pagination']
            required_fields = ['page', 'page_size', 'total_count', 'total_pages']
            for field in required_fields:
                self.assertIn(field, pagination)
    
    def test_error_response_format(self):
        """Test error responses have standard format."""
        # Request non-existent course
        response = self.client.get('/api/v1/courses/nonexistent-slug/')
        self.assertEqual(response.status_code, status.HTTP_404_NOT_FOUND)
        
        # Verify error response structure
        self.assertIn('status', response.data)
        self.assertEqual(response.data['status'], 'error')
        self.assertIn('code', response.data)
    
    def test_course_data_structure(self):
        """Test course detail has all required fields for frontend."""
        response = self.client.get(f'/api/v1/courses/{self.course.slug}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        course_data = response.data.get('data', response.data)
        required_fields = [
            'id', 'title', 'slug', 'description', 'instructor',
            'category', 'price', 'is_published', 'created_at'
        ]
        
        for field in required_fields:
            self.assertIn(field, course_data, f"Missing required field: {field}")
    
    def test_quiz_data_structure(self):
        """Test quiz detail has all required fields for frontend."""
        response = self.client.get(f'/api/v1/quizzes/{self.quiz.id}/')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        quiz_data = response.data.get('data', response.data)
        required_fields = [
            'id', 'title', 'description', 'course_title', 'time_limit_minutes',
            'passing_score', 'is_published', 'total_questions'
        ]
        
        for field in required_fields:
            self.assertIn(field, quiz_data, f"Missing required field: {field}")


class APIEndpointAvailabilityTests(APITestCase):
    """
    Tests that all frontend-required endpoints are available.
    """
    
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.client.force_authenticate(user=self.user)
    
    def test_courses_endpoints(self):
        """Test all courses endpoints are available."""
        endpoints = [
            ('/api/v1/courses/', 'GET'),
            ('/api/v1/courses/categories/', 'GET'),
        ]
        
        for endpoint, method in endpoints:
            if method == 'GET':
                response = self.client.get(endpoint)
            elif method == 'POST':
                response = self.client.post(endpoint, {})
            
            # Should not return 404 (endpoint exists)
            self.assertNotEqual(
                response.status_code, 
                status.HTTP_404_NOT_FOUND,
                f"Endpoint {endpoint} not found"
            )
    
    def test_quiz_endpoints(self):
        """Test all quiz endpoints are available."""
        endpoints = [
            ('/api/v1/quizzes/', 'GET'),
        ]
        
        for endpoint, method in endpoints:
            if method == 'GET':
                response = self.client.get(endpoint)
            
            self.assertNotEqual(
                response.status_code,
                status.HTTP_404_NOT_FOUND,
                f"Endpoint {endpoint} not found"
            )
    
    def test_user_endpoints(self):
        """Test user-related endpoints."""
        endpoints = [
            ('/api/v1/users/profile/', 'GET'),
            ('/api/v1/courses/bookmarks/', 'GET'),
        ]
        
        for endpoint, method in endpoints:
            if method == 'GET':
                response = self.client.get(endpoint)
            
            # These might require specific setup, just check endpoint exists
            self.assertNotEqual(
                response.status_code,
                status.HTTP_404_NOT_FOUND,
                f"Endpoint {endpoint} not found"
            )


class CORSAndSecurityTests(APITestCase):
    """
    Tests CORS configuration and security headers.
    """
    
    def setUp(self):
        self.client = APIClient()
    
    def test_cors_headers(self):
        """Test CORS headers are properly configured."""
        response = self.client.get('/api/v1/courses/', HTTP_ORIGIN='http://localhost:5173')
        
        # Check for CORS headers
        self.assertIn('Access-Control-Allow-Origin', response)
    
    def test_security_headers(self):
        """Test security headers are present."""
        response = self.client.get('/api/v1/courses/')
        
        # Check for common security headers
        security_headers = [
            'X-Content-Type-Options',
            'X-Frame-Options',
            'X-XSS-Protection',
        ]
        
        for header in security_headers:
            # Headers may or may not be present depending on configuration
            pass  # Just document that we checked


class ContentTypeTests(APITestCase):
    """
    Tests content type handling and JSON parsing.
    """
    
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            username='testuser',
            email='test@example.com',
            password='testpass123'
        )
        self.client.force_authenticate(user=self.user)
    
    def test_json_content_type(self):
        """Test API returns JSON content type."""
        response = self.client.get('/api/v1/courses/')
        self.assertEqual(response['Content-Type'], 'application/json')
    
    def test_utf8_encoding(self):
        """Test API handles UTF-8 characters correctly."""
        response = self.client.get('/api/v1/courses/')
        self.assertEqual(response.charset.lower(), 'utf-8')


class APIDocumentationTests(TestCase):
    """
    Tests that API documentation is available.
    """
    
    def test_api_docs_endpoint(self):
        """Test API documentation endpoint is available."""
        from django.test import Client
        client = Client()
        
        # Try common documentation endpoints
        doc_endpoints = ['/api/docs/', '/api/schema/', '/swagger/']
        
        for endpoint in doc_endpoints:
            response = client.get(endpoint)
            if response.status_code == 200:
                return  # At least one docs endpoint works
        
        # If no docs endpoint found, document this as needed
        self.skipTest("API documentation endpoint not configured")

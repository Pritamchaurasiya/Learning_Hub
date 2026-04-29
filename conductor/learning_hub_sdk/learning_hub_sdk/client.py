"""
Learning Hub SDK Main Client
"""

import json
import requests
from typing import Optional, List, Dict, Any, Union
from urllib.parse import urljoin

from .auth import Auth
from .exceptions import (
    LearningHubError,
    APIError,
    NotFoundError,
    ValidationError,
    RateLimitError,
    ServerError,
)
from .models import (
    User,
    Course,
    Category,
    Enrollment,
    Review,
    Progress,
    APIResponse,
)

class LearningHubClient:
    """Main client for Learning Hub API."""
    
    def __init__(self, base_url: str, api_key: Optional[str] = None,
                 username: Optional[str] = None, password: Optional[str] = None,
                 timeout: int = 30):
        """
        Initialize the Learning Hub client.
        
        Args:
            base_url: Base URL of the Learning Hub API
            api_key: API key for authentication
            username: Username for authentication
            password: Password for authentication
            timeout: Request timeout in seconds
        """
        self.base_url = base_url.rstrip('/')
        self.timeout = timeout
        self.auth = Auth(base_url, api_key, username, password)
        
        # Authenticate on initialization
        self.auth.authenticate()
    
    def _make_request(self, method: str, endpoint: str, **kwargs) -> requests.Response:
        """Make an HTTP request to the API."""
        url = urljoin(self.base_url, endpoint)
        headers = self.auth.get_headers()
        
        # Update headers with any additional headers
        if 'headers' in kwargs:
            headers.update(kwargs.pop('headers'))
        
        kwargs['headers'] = headers
        kwargs['timeout'] = self.timeout
        
        try:
            response = requests.request(method, url, **kwargs)
            
            # Handle authentication errors
            if response.status_code == 401:
                if self.auth._refresh_token:
                    try:
                        self.auth.refresh_access_token()
                        headers = self.auth.get_headers()
                        kwargs['headers'] = headers
                        response = requests.request(method, url, **kwargs)
                    except Exception:
                        raise AuthenticationError("Authentication failed")
                else:
                    raise AuthenticationError("Authentication failed")
            
            return response
            
        except requests.exceptions.Timeout:
            raise APIError(f"Request timeout after {self.timeout} seconds")
        except requests.exceptions.RequestException as e:
            raise APIError(f"Request failed: {e}")
    
    def _handle_response(self, response: requests.Response) -> Dict[str, Any]:
        """Handle API response and errors."""
        if response.status_code == 200:
            return response.json()
        elif response.status_code == 201:
            return response.json()
        elif response.status_code == 204:
            return {}
        elif response.status_code == 400:
            raise ValidationError("Bad request")
        elif response.status_code == 401:
            raise AuthenticationError("Unauthorized")
        elif response.status_code == 403:
            raise AuthenticationError("Forbidden")
        elif response.status_code == 404:
            raise NotFoundError("Resource not found")
        elif response.status_code == 429:
            raise RateLimitError("Rate limit exceeded")
        elif response.status_code >= 500:
            raise ServerError(f"Server error: {response.status_code}")
        else:
            raise APIError(f"Unexpected status code: {response.status_code}")
    
    # ============================================================================
    # User Management
    # ============================================================================
    
    def get_user(self, user_id: int) -> User:
        """Get user by ID."""
        response = self._make_request('GET', f'/api/v1/users/{user_id}/')
        data = self._handle_response(response)
        return User(**data)
    
    def get_current_user(self) -> User:
        """Get current authenticated user."""
        response = self._make_request('GET', '/api/v1/auth/user/')
        data = self._handle_response(response)
        return User(**data)
    
    def update_user(self, user_id: int, **kwargs) -> User:
        """Update user information."""
        response = self._make_request('PATCH', f'/api/v1/users/{user_id}/', json=kwargs)
        data = self._handle_response(response)
        return User(**data)
    
    # ============================================================================
    # Course Management
    # ============================================================================
    
    def get_courses(self, category: Optional[int] = None, 
                   search: Optional[str] = None,
                   page: int = 1, page_size: int = 20) -> APIResponse:
        """Get list of courses."""
        params = {
            'page': page,
            'page_size': page_size,
        }
        if category:
            params['category'] = category
        if search:
            params['search'] = search
        
        response = self._make_request('GET', '/api/v1/courses/', params=params)
        data = self._handle_response(response)
        return APIResponse(**data)
    
    def get_course(self, course_id: int) -> Course:
        """Get course by ID."""
        response = self._make_request('GET', f'/api/v1/courses/{course_id}/')
        data = self._handle_response(response)
        return Course(**data)
    
    def create_course(self, **kwargs) -> Course:
        """Create a new course."""
        response = self._make_request('POST', '/api/v1/courses/', json=kwargs)
        data = self._handle_response(response)
        return Course(**data)
    
    def update_course(self, course_id: int, **kwargs) -> Course:
        """Update course information."""
        response = self._make_request('PATCH', f'/api/v1/courses/{course_id}/', json=kwargs)
        data = self._handle_response(response)
        return Course(**data)
    
    def delete_course(self, course_id: int) -> bool:
        """Delete a course."""
        response = self._make_request('DELETE', f'/api/v1/courses/{course_id}/')
        self._handle_response(response)
        return True
    
    # ============================================================================
    # Category Management
    # ============================================================================
    
    def get_categories(self) -> List[Category]:
        """Get list of categories."""
        response = self._make_request('GET', '/api/v1/categories/')
        data = self._handle_response(response)
        return [Category(**item) for item in data]
    
    def get_category(self, category_id: int) -> Category:
        """Get category by ID."""
        response = self._make_request('GET', f'/api/v1/categories/{category_id}/')
        data = self._handle_response(response)
        return Category(**data)
    
    # ============================================================================
    # Enrollment Management
    # ============================================================================
    
    def enroll_user(self, user_id: int, course_id: int) -> Enrollment:
        """Enroll a user in a course."""
        response = self._make_request('POST', '/api/v1/enrollments/', 
                                    json={'user': user_id, 'course': course_id})
        data = self._handle_response(response)
        return Enrollment(**data)
    
    def get_user_enrollments(self, user_id: int) -> List[Enrollment]:
        """Get user's enrollments."""
        response = self._make_request('GET', f'/api/v1/users/{user_id}/enrollments/')
        data = self._handle_response(response)
        return [Enrollment(**item) for item in data]
    
    def get_course_enrollments(self, course_id: int) -> List[Enrollment]:
        """Get course enrollments."""
        response = self._make_request('GET', f'/api/v1/courses/{course_id}/enrollments/')
        data = self._handle_response(response)
        return [Enrollment(**item) for item in data]
    
    # ============================================================================
    # Review Management
    # ============================================================================
    
    def create_review(self, course_id: int, rating: int, 
                     comment: Optional[str] = None) -> Review:
        """Create a course review."""
        response = self._make_request('POST', '/api/v1/reviews/', 
                                    json={'course': course_id, 'rating': rating, 'comment': comment})
        data = self._handle_response(response)
        return Review(**data)
    
    def get_course_reviews(self, course_id: int) -> List[Review]:
        """Get course reviews."""
        response = self._make_request('GET', f'/api/v1/courses/{course_id}/reviews/')
        data = self._handle_response(response)
        return [Review(**item) for item in data]
    
    # ============================================================================
    # Progress Tracking
    # ============================================================================
    
    def get_user_progress(self, user_id: int, course_id: int) -> Progress:
        """Get user's progress in a course."""
        response = self._make_request('GET', 
                                    f'/api/v1/users/{user_id}/courses/{course_id}/progress/')
        data = self._handle_response(response)
        return Progress(**data)
    
    def update_progress(self, user_id: int, course_id: int, 
                       lesson_completed: int) -> Progress:
        """Update user's progress in a course."""
        response = self._make_request('PATCH', 
                                    f'/api/v1/users/{user_id}/courses/{course_id}/progress/',
                                    json={'lesson_completed': lesson_completed})
        data = self._handle_response(response)
        return Progress(**data)
    
    # ============================================================================
    # Health Check
    # ============================================================================
    
    def health_check(self) -> Dict[str, Any]:
        """Check API health status."""
        response = self._make_request('GET', '/health/')
        return self._handle_response(response)

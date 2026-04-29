#!/usr/bin/env python
"""
Learning Hub Python SDK Development
Create comprehensive Python SDK for Learning Hub API
"""

import os
import sys
from pathlib import Path
from datetime import datetime

print("=" * 80)
print("LEARNING HUB PYTHON SDK DEVELOPMENT")
print("=" * 80)

BASE_DIR = Path('c:\\Users\\shiva\\Desktop\\windows_app\\conductor')
os.chdir(BASE_DIR)

def log(message, level="INFO"):
    timestamp = datetime.now().strftime("%H:%M:%S")
    print(f"[{timestamp}] {level}: {message}")

# ============================================================================
# Create SDK Package Structure
# ============================================================================
log("Creating Python SDK package structure...")

# Create SDK directory structure
sdk_dirs = [
    'learning_hub_sdk',
    'learning_hub_sdk/learning_hub_sdk',
    'learning_hub_sdk/tests',
    'learning_hub_sdk/docs',
    'learning_hub_sdk/examples'
]

for dir_path in sdk_dirs:
    os.makedirs(dir_path, exist_ok=True)
    log(f"  [OK] Created directory: {dir_path}")

# ============================================================================
# Create Package Configuration Files
# ============================================================================
log("Creating package configuration files...")

# setup.py
setup_py = '''from setuptools import setup, find_packages

with open("README.md", "r", encoding="utf-8") as fh:
    long_description = fh.read()

with open("requirements.txt", "r", encoding="utf-8") as fh:
    requirements = [line.strip() for line in fh if line.strip() and not line.startswith("#")]

setup(
    name="learning-hub-sdk",
    version="1.0.0",
    author="Learning Hub Team",
    author_email="support@learninghub.com",
    description="Python SDK for Learning Hub API",
    long_description=long_description,
    long_description_content_type="text/markdown",
    url="https://github.com/learninghub/learning-hub-sdk",
    packages=find_packages(),
    classifiers=[
        "Development Status :: 5 - Production/Stable",
        "Intended Audience :: Developers",
        "License :: OSI Approved :: MIT License",
        "Operating System :: OS Independent",
        "Programming Language :: Python :: 3",
        "Programming Language :: Python :: 3.8",
        "Programming Language :: Python :: 3.9",
        "Programming Language :: Python :: 3.10",
        "Programming Language :: Python :: 3.11",
        "Programming Language :: Python :: 3.12",
    ],
    python_requires=">=3.8",
    install_requires=requirements,
    extras_require={
        "dev": [
            "pytest>=7.0.0",
            "pytest-asyncio>=0.21.0",
            "black>=22.0.0",
            "flake8>=5.0.0",
            "mypy>=1.0.0",
        ],
        "async": ["aiohttp>=3.8.0"],
    },
    entry_points={
        "console_scripts": [
            "learning-hub=learning_hub_sdk.cli:main",
        ],
    },
)
'''

with open('learning_hub_sdk/setup.py', 'w') as f:
    f.write(setup_py)

log("  [OK] Created setup.py")

# requirements.txt
requirements_txt = '''requests>=2.28.0
urllib3>=1.26.0
python-dateutil>=2.8.0
pydantic>=1.10.0
typing-extensions>=4.0.0
'''

with open('learning_hub_sdk/requirements.txt', 'w') as f:
    f.write(requirements_txt)

log("  [OK] Created requirements.txt")

# pyproject.toml
pyproject_toml = '''[build-system]
requires = ["setuptools>=45", "wheel", "setuptools_scm[toml]>=6.2"]
build-backend = "setuptools.build_meta"

[tool.black]
line-length = 88
target-version = ['py38']

[tool.mypy]
python_version = "3.8"
warn_return_any = true
warn_unused_configs = true
disallow_untyped_defs = true

[tool.pytest.ini_options]
testpaths = ["tests"]
python_files = ["test_*.py"]
python_classes = ["Test*"]
python_functions = ["test_*"]
'''

with open('learning_hub_sdk/pyproject.toml', 'w') as f:
    f.write(pyproject_toml)

log("  [OK] Created pyproject.toml")

# ============================================================================
# Create Core SDK Files
# ============================================================================
log("Creating core SDK files...")

# __init__.py
init_py = '''"""
Learning Hub Python SDK

A comprehensive Python SDK for the Learning Hub API, providing easy integration
with authentication, course management, user management, and more.
"""

from .client import LearningHubClient
from .auth import Auth
from .exceptions import (
    LearningHubError,
    AuthenticationError,
    APIError,
    NotFoundError,
    ValidationError,
)
from .models import (
    User,
    Course,
    Enrollment,
    Category,
    Review,
    Progress,
)

__version__ = "1.0.0"
__author__ = "Learning Hub Team"
__email__ = "support@learninghub.com"

__all__ = [
    "LearningHubClient",
    "Auth",
    "LearningHubError",
    "AuthenticationError", 
    "APIError",
    "NotFoundError",
    "ValidationError",
    "User",
    "Course",
    "Enrollment",
    "Category",
    "Review",
    "Progress",
]
'''

with open('learning_hub_sdk/learning_hub_sdk/__init__.py', 'w') as f:
    f.write(init_py)

log("  [OK] Created __init__.py")

# exceptions.py
exceptions_py = '''"""
Learning Hub SDK Exceptions
"""

class LearningHubError(Exception):
    """Base exception for all Learning Hub SDK errors."""
    pass

class AuthenticationError(LearningHubError):
    """Raised when authentication fails."""
    pass

class APIError(LearningHubError):
    """Raised when API request fails."""
    def __init__(self, message, status_code=None, response=None):
        super().__init__(message)
        self.status_code = status_code
        self.response = response

class NotFoundError(APIError):
    """Raised when resource is not found."""
    pass

class ValidationError(LearningHubError):
    """Raised when validation fails."""
    pass

class RateLimitError(APIError):
    """Raised when rate limit is exceeded."""
    pass

class ServerError(APIError):
    """Raised when server error occurs."""
    pass
'''

with open('learning_hub_sdk/learning_hub_sdk/exceptions.py', 'w') as f:
    f.write(exceptions_py)

log("  [OK] Created exceptions.py")

# ============================================================================
# Create Authentication Module
# ============================================================================
log("Creating authentication module...")

auth_py = '''"""
Learning Hub SDK Authentication
"""

import json
import time
from typing import Optional, Dict, Any
from .exceptions import AuthenticationError, APIError

class Auth:
    """Authentication handler for Learning Hub API."""
    
    def __init__(self, base_url: str, api_key: Optional[str] = None, 
                 username: Optional[str] = None, password: Optional[str] = None):
        self.base_url = base_url.rstrip('/')
        self.api_key = api_key
        self.username = username
        self.password = password
        self._access_token = None
        self._refresh_token = None
        self._token_expires_at = None
        
    def authenticate(self) -> Dict[str, Any]:
        """Authenticate with the API and return tokens."""
        if self.api_key:
            return self._authenticate_with_api_key()
        elif self.username and self.password:
            return self._authenticate_with_credentials()
        else:
            raise AuthenticationError("No authentication credentials provided")
    
    def _authenticate_with_api_key(self) -> Dict[str, Any]:
        """Authenticate using API key."""
        self._access_token = self.api_key
        return {"access_token": self.api_key}
    
    def _authenticate_with_credentials(self) -> Dict[str, Any]:
        """Authenticate using username and password."""
        import requests
        
        url = f"{self.base_url}/api/v1/auth/login/"
        data = {
            "username": self.username,
            "password": self.password
        }
        
        try:
            response = requests.post(url, json=data)
            response.raise_for_status()
            
            tokens = response.json()
            self._access_token = tokens["access"]
            self._refresh_token = tokens["refresh"]
            self._token_expires_at = time.time() + 3600  # 1 hour
            
            return tokens
            
        except requests.exceptions.RequestException as e:
            raise AuthenticationError(f"Authentication failed: {e}")
    
    def get_headers(self) -> Dict[str, str]:
        """Get authorization headers."""
        if not self._access_token:
            self.authenticate()
        
        return {
            "Authorization": f"Bearer {self._access_token}",
            "Content-Type": "application/json",
        }
    
    def refresh_access_token(self) -> str:
        """Refresh the access token."""
        if not self._refresh_token:
            raise AuthenticationError("No refresh token available")
        
        import requests
        
        url = f"{self.base_url}/api/v1/auth/refresh/"
        data = {"refresh": self._refresh_token}
        
        try:
            response = requests.post(url, json=data)
            response.raise_for_status()
            
            tokens = response.json()
            self._access_token = tokens["access"]
            self._token_expires_at = time.time() + 3600
            
            return self._access_token
            
        except requests.exceptions.RequestException as e:
            raise AuthenticationError(f"Token refresh failed: {e}")
    
    def is_token_expired(self) -> bool:
        """Check if the access token is expired."""
        if not self._token_expires_at:
            return True
        
        return time.time() >= self._token_expires_at
    
    def ensure_valid_token(self) -> str:
        """Ensure we have a valid access token."""
        if not self._access_token or self.is_token_expired():
            if self._refresh_token:
                self.refresh_access_token()
            else:
                self.authenticate()
        
        return self._access_token
'''

with open('learning_hub_sdk/learning_hub_sdk/auth.py', 'w') as f:
    f.write(auth_py)

log("  [OK] Created auth.py")

# ============================================================================
# Create Data Models
# ============================================================================
log("Creating data models...")

models_py = '''"""
Learning Hub SDK Data Models
"""

from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field

class User(BaseModel):
    """User model."""
    id: int
    username: str
    email: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    is_active: bool = True
    date_joined: datetime
    last_login: Optional[datetime] = None
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }

class Category(BaseModel):
    """Category model."""
    id: int
    name: str
    description: Optional[str] = None
    is_active: bool = True
    created_at: datetime
    updated_at: datetime

class Course(BaseModel):
    """Course model."""
    id: int
    title: str
    description: Optional[str] = None
    instructor: Optional[str] = None
    category: Optional[Category] = None
    price: float = 0.0
    is_active: bool = True
    duration_hours: Optional[int] = None
    difficulty_level: str = "beginner"
    created_at: datetime
    updated_at: datetime
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }

class Enrollment(BaseModel):
    """Enrollment model."""
    id: int
    user: User
    course: Course
    enrolled_at: datetime
    completed_at: Optional[datetime] = None
    progress_percentage: float = 0.0
    is_active: bool = True
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }

class Review(BaseModel):
    """Review model."""
    id: int
    user: User
    course: Course
    rating: int = Field(ge=1, le=5)
    comment: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }

class Progress(BaseModel):
    """Progress model."""
    id: int
    user: User
    course: Course
    lesson_completed: int
    total_lessons: int
    progress_percentage: float
    last_accessed: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }

class APIResponse(BaseModel):
    """Generic API response model."""
    count: Optional[int] = None
    next: Optional[str] = None
    previous: Optional[str] = None
    results: List[Dict[str, Any]] = []
'''

with open('learning_hub_sdk/learning_hub_sdk/models.py', 'w') as f:
    f.write(models_py)

log("  [OK] Created models.py")

# ============================================================================
# Create Main Client
# ============================================================================
log("Creating main client...")

client_py = '''"""
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
'''

with open('learning_hub_sdk/learning_hub_sdk/client.py', 'w') as f:
    f.write(client_py)

log("  [OK] Created client.py")

# ============================================================================
# Create CLI Module
# ============================================================================
log("Creating CLI module...")

cli_py = '''"""
Learning Hub SDK CLI
"""

import argparse
import json
import sys
from typing import Optional

from .client import LearningHubClient
from .exceptions import LearningHubError

def main():
    """Main CLI entry point."""
    parser = argparse.ArgumentParser(description='Learning Hub SDK CLI')
    parser.add_argument('--base-url', required=True, help='API base URL')
    parser.add_argument('--api-key', help='API key for authentication')
    parser.add_argument('--username', help='Username for authentication')
    parser.add_argument('--password', help='Password for authentication')
    
    subparsers = parser.add_subparsers(dest='command', help='Available commands')
    
    # Health check command
    health_parser = subparsers.add_parser('health', help='Check API health')
    
    # Get current user command
    user_parser = subparsers.add_parser('user', help='Get current user')
    
    # List courses command
    courses_parser = subparsers.add_parser('courses', help='List courses')
    courses_parser.add_argument('--category', type=int, help='Category ID')
    courses_parser.add_argument('--search', help='Search term')
    courses_parser.add_argument('--page', type=int, default=1, help='Page number')
    courses_parser.add_argument('--page-size', type=int, default=20, help='Page size')
    
    # Get course command
    course_parser = subparsers.add_parser('course', help='Get course by ID')
    course_parser.add_argument('id', type=int, help='Course ID')
    
    # Enroll command
    enroll_parser = subparsers.add_parser('enroll', help='Enroll user in course')
    enroll_parser.add_argument('--user-id', type=int, required=True, help='User ID')
    enroll_parser.add_argument('--course-id', type=int, required=True, help='Course ID')
    
    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        sys.exit(1)
    
    try:
        # Initialize client
        client = LearningHubClient(
            base_url=args.base_url,
            api_key=args.api_key,
            username=args.username,
            password=args.password
        )
        
        # Execute command
        if args.command == 'health':
            result = client.health_check()
        elif args.command == 'user':
            result = client.get_current_user()
        elif args.command == 'courses':
            result = client.get_courses(
                category=args.category,
                search=args.search,
                page=args.page,
                page_size=args.page_size
            )
        elif args.command == 'course':
            result = client.get_course(args.id)
        elif args.command == 'enroll':
            result = client.enroll_user(args.user_id, args.course_id)
        else:
            parser.print_help()
            sys.exit(1)
        
        # Output result
        print(json.dumps(result.dict() if hasattr(result, 'dict') else result, 
                        indent=2, default=str))
        
    except LearningHubError as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"Unexpected error: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
'''

with open('learning_hub_sdk/learning_hub_sdk/cli.py', 'w') as f:
    f.write(cli_py)

log("  [OK] Created cli.py")

# ============================================================================
# Create Documentation
# ============================================================================
log("Creating documentation...")

# README.md
readme_md = '''# Learning Hub Python SDK

A comprehensive Python SDK for the Learning Hub API, providing easy integration with authentication, course management, user management, and more.

## Installation

```bash
pip install learning-hub-sdk
```

## Quick Start

### Using API Key

```python
from learning_hub_sdk import LearningHubClient

# Initialize client with API key
client = LearningHubClient(
    base_url="https://api.learninghub.com",
    api_key="your-api-key-here"
)

# Get current user
user = client.get_current_user()
print(f"Hello, {user.username}!")

# List courses
courses = client.get_courses()
for course in courses.results:
    print(f"- {course.title}")
```

### Using Username/Password

```python
from learning_hub_sdk import LearningHubClient

# Initialize client with credentials
client = LearningHubClient(
    base_url="https://api.learninghub.com",
    username="your-username",
    password="your-password"
)

# Get current user
user = client.get_current_user()
print(f"Hello, {user.username}!")
```

## Features

- **Authentication**: API key and username/password authentication
- **User Management**: Get user information, update profiles
- **Course Management**: List, create, update, and delete courses
- **Enrollment Management**: Enroll users and track enrollments
- **Review System**: Create and retrieve course reviews
- **Progress Tracking**: Monitor user progress in courses
- **Error Handling**: Comprehensive error handling with custom exceptions
- **Type Hints**: Full type hint support for better IDE experience
- **CLI Tool**: Command-line interface for quick operations

## API Reference

### LearningHubClient

The main client class for interacting with the Learning Hub API.

#### Methods

##### Authentication
- `get_current_user()`: Get current authenticated user

##### User Management
- `get_user(user_id)`: Get user by ID
- `update_user(user_id, **kwargs)`: Update user information

##### Course Management
- `get_courses(category=None, search=None, page=1, page_size=20)`: List courses
- `get_course(course_id)`: Get course by ID
- `create_course(**kwargs)`: Create a new course
- `update_course(course_id, **kwargs)`: Update course information
- `delete_course(course_id)`: Delete a course

##### Category Management
- `get_categories()`: Get list of categories
- `get_category(category_id)`: Get category by ID

##### Enrollment Management
- `enroll_user(user_id, course_id)`: Enroll a user in a course
- `get_user_enrollments(user_id)`: Get user's enrollments
- `get_course_enrollments(course_id)`: Get course enrollments

##### Review Management
- `create_review(course_id, rating, comment=None)`: Create a course review
- `get_course_reviews(course_id)`: Get course reviews

##### Progress Tracking
- `get_user_progress(user_id, course_id)`: Get user's progress in a course
- `update_progress(user_id, course_id, lesson_completed)`: Update user's progress

##### Health Check
- `health_check()`: Check API health status

### Exceptions

- `LearningHubError`: Base exception for all SDK errors
- `AuthenticationError`: Raised when authentication fails
- `APIError`: Raised when API request fails
- `NotFoundError`: Raised when resource is not found
- `ValidationError`: Raised when validation fails
- `RateLimitError`: Raised when rate limit is exceeded
- `ServerError`: Raised when server error occurs

## CLI Usage

The SDK includes a command-line interface for quick operations:

```bash
# Health check
learning-hub --base-url https://api.learninghub.com --api-key your-key health

# Get current user
learning-hub --base-url https://api.learninghub.com --api-key your-key user

# List courses
learning-hub --base-url https://api.learninghub.com --api-key your-key courses

# Get specific course
learning-hub --base-url https://api.learninghub.com --api-key your-key course 123

# Enroll user
learning-hub --base-url https://api.learninghub.com --api-key your-key enroll --user-id 1 --course-id 123
```

## Development

### Setup

```bash
# Clone the repository
git clone https://github.com/learninghub/learning-hub-sdk.git
cd learning-hub-sdk

# Install in development mode
pip install -e .[dev]
```

### Running Tests

```bash
pytest
```

### Code Formatting

```bash
black learning_hub_sdk/
```

### Type Checking

```bash
mypy learning_hub_sdk/
```

## License

This SDK is licensed under the MIT License. See the LICENSE file for details.

## Support

For support, please contact support@learninghub.com or create an issue on GitHub.
'''

with open('learning_hub_sdk/README.md', 'w') as f:
    f.write(readme_md)

log("  [OK] Created README.md")

# ============================================================================
# Create Tests
# ============================================================================
log("Creating tests...")

# test_client.py
test_client_py = '''"""
Tests for Learning Hub SDK Client
"""

import pytest
from unittest.mock import Mock, patch
from learning_hub_sdk import LearningHubClient
from learning_hub_sdk.exceptions import AuthenticationError, APIError

class TestLearningHubClient:
    """Test cases for LearningHubClient."""
    
    def setup_method(self):
        """Setup test client."""
        self.base_url = "https://api.learninghub.com"
        self.api_key = "test-api-key"
        
    @patch('learning_hub_sdk.client.Auth')
    def test_init_with_api_key(self, mock_auth):
        """Test client initialization with API key."""
        client = LearningHubClient(self.base_url, api_key=self.api_key)
        
        assert client.base_url == self.base_url
        assert client.timeout == 30
        mock_auth.assert_called_once_with(self.base_url, self.api_key, None, None)
    
    @patch('learning_hub_sdk.client.Auth')
    def test_init_with_credentials(self, mock_auth):
        """Test client initialization with credentials."""
        client = LearningHubClient(
            self.base_url, 
            username="testuser", 
            password="testpass"
        )
        
        mock_auth.assert_called_once_with(
            self.base_url, None, "testuser", "testpass"
        )
    
    @patch('learning_hub_sdk.client.requests.request')
    @patch('learning_hub_sdk.client.Auth')
    def test_health_check(self, mock_auth, mock_request):
        """Test health check."""
        mock_response = Mock()
        mock_response.status_code = 200
        mock_response.json.return_value = {"status": "ok"}
        mock_request.return_value = mock_response
        
        client = LearningHubClient(self.base_url, api_key=self.api_key)
        result = client.health_check()
        
        assert result == {"status": "ok"}
        mock_request.assert_called_once()
    
    @patch('learning_hub_sdk.client.requests.request')
    @patch('learning_hub_sdk.client.Auth')
    def test_authentication_error(self, mock_auth, mock_request):
        """Test authentication error handling."""
        mock_response = Mock()
        mock_response.status_code = 401
        mock_request.return_value = mock_response
        
        client = LearningHubClient(self.base_url, api_key=self.api_key)
        
        with pytest.raises(AuthenticationError):
            client.health_check()
'''

with open('learning_hub_sdk/tests/test_client.py', 'w') as f:
    f.write(test_client_py)

log("  [OK] Created test_client.py")

# ============================================================================
# Create Examples
# ============================================================================
log("Creating examples...")

# quick_start.py
quick_start_py = '''"""
Quick Start Example for Learning Hub SDK
"""

from learning_hub_sdk import LearningHubClient, AuthenticationError

def main():
    """Quick start example."""
    # Initialize client (use API key or username/password)
    try:
        client = LearningHubClient(
            base_url="https://api.learninghub.com",
            api_key="your-api-key-here"
            # OR
            # username="your-username",
            # password="your-password"
        )
        
        # Health check
        print("Checking API health...")
        health = client.health_check()
        print(f"API Status: {health}")
        
        # Get current user
        print("\nGetting current user...")
        user = client.get_current_user()
        print(f"User: {user.username} ({user.email})")
        
        # List courses
        print("\nListing courses...")
        courses = client.get_courses(page_size=5)
        print(f"Found {len(courses.results)} courses:")
        for course in courses.results:
            print(f"  - {course.title} (${course.price})")
        
        # Get specific course
        if courses.results:
            course_id = courses.results[0].id
            print(f"\nGetting course details for ID {course_id}...")
            course = client.get_course(course_id)
            print(f"Course: {course.title}")
            print(f"Description: {course.description}")
            print(f"Duration: {course.duration_hours} hours")
        
        # Create enrollment
        if courses.results and user:
            print(f"\nEnrolling in course...")
            enrollment = client.enroll_user(user.id, courses.results[0].id)
            print(f"Enrolled at: {enrollment.enrolled_at}")
        
    except AuthenticationError as e:
        print(f"Authentication failed: {e}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    main()
'''

with open('learning_hub_sdk/examples/quick_start.py', 'w') as f:
    f.write(quick_start_py)

log("  [OK] Created quick_start.py")

# ============================================================================
# Summary
# ============================================================================
print("\n" + "=" * 80)
print("LEARNING HUB PYTHON SDK DEVELOPMENT COMPLETE")
print("=" * 80)

print("\n[CREATED] SDK Package Structure:")
print("  learning_hub_sdk/")
print("  ├── learning_hub_sdk/")
print("  │   ├── __init__.py")
print("  │   ├── client.py")
print("  │   ├── auth.py")
print("  │   ├── models.py")
print("  │   ├── exceptions.py")
print("  │   └── cli.py")
print("  ├── tests/")
print("  │   └── test_client.py")
print("  ├── examples/")
print("  │   └── quick_start.py")
print("  ├── setup.py")
print("  ├── requirements.txt")
print("  ├── pyproject.toml")
print("  └── README.md")
print()

print("[FEATURES]:")
print("  ✅ Complete API client with authentication")
print("  ✅ Type hints with Pydantic models")
print("  ✅ Comprehensive error handling")
print("  ✅ CLI tool for quick operations")
print("  ✅ Tests and documentation")
print("  ✅ Examples and tutorials")
print()

print("[NEXT STEPS]:")
print("  1. Run tests: pytest learning_hub_sdk/tests/")
print("  2. Install locally: pip install -e learning_hub_sdk/")
print("  3. Test CLI: learning-hub --base-url http://localhost:8000 health")
print("  4. Try examples: python learning_hub_sdk/examples/quick_start.py")
print("  5. Build for distribution: python setup.py sdist bdist_wheel")
print()

print("=" * 80)
print("[DONE] Python SDK development complete!")
print("=" * 80 + "\n")

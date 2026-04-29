# Learning Hub Python SDK

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

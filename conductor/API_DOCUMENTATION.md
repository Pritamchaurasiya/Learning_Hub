# Learning Hub API Documentation

## 📚 Overview

**Base URL:** `https://api.yourdomain.com/api/v1/`  
**Version:** v1  
**Authentication:** JWT Bearer Token  
**Content-Type:** `application/json`

---

## 🔐 Authentication

### Get Access Token
```http
POST /api/v1/auth/login/
```

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword123"
}
```

**Response:**
```json
{
  "access": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "refresh": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "first_name": "John",
    "last_name": "Doe"
  }
}
```

### Use Token
Include in header:
```http
Authorization: Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...
```

### Refresh Token
```http
POST /api/v1/auth/refresh/
```

**Request Body:**
```json
{
  "refresh": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..."
}
```

---

## 👤 Users

### Get Current User
```http
GET /api/v1/users/me/
```

**Response:**
```json
{
  "id": 1,
  "email": "user@example.com",
  "first_name": "John",
  "last_name": "Doe",
  "role": "student",
  "is_verified": true,
  "created_at": "2024-01-15T10:30:00Z"
}
```

### Update User Profile
```http
PATCH /api/v1/users/me/
```

**Request Body:**
```json
{
  "first_name": "John",
  "last_name": "Smith",
  "bio": "Software developer learning new skills"
}
```

### List All Users (Admin Only)
```http
GET /api/v1/users/
```

**Query Parameters:**
- `page` (int) - Page number
- `page_size` (int) - Items per page (default: 20)
- `search` (string) - Search by name/email
- `role` (string) - Filter by role

---

## 📖 Courses

### List All Courses
```http
GET /api/v1/courses/courses/
```

**Query Parameters:**
- `page` (int) - Page number
- `page_size` (int) - Items per page
- `search` (string) - Search by title/description
- `category` (int) - Filter by category ID
- `level` (string) - Filter by level (beginner, intermediate, advanced)
- `min_price` (float) - Minimum price
- `max_price` (float) - Maximum price
- `is_published` (bool) - Filter published courses
- `ordering` (string) - Sort by: `created_at`, `price`, `rating`

**Response:**
```json
{
  "count": 150,
  "next": "https://api.yourdomain.com/api/v1/courses/courses/?page=2",
  "previous": null,
  "results": [
    {
      "id": 1,
      "title": "Python Programming Fundamentals",
      "slug": "python-programming-fundamentals",
      "description": "Learn Python from scratch",
      "category": {
        "id": 1,
        "name": "Programming",
        "slug": "programming"
      },
      "level": "beginner",
      "price": 49.99,
      "discount_price": 29.99,
      "duration_hours": 20,
      "rating": 4.8,
      "total_reviews": 125,
      "total_students": 1500,
      "thumbnail": "https://cdn.yourdomain.com/courses/python.jpg",
      "is_published": true,
      "created_at": "2024-01-10T08:00:00Z",
      "instructor": {
        "id": 5,
        "first_name": "Jane",
        "last_name": "Smith",
        "bio": "Senior Python Developer"
      }
    }
  ]
}
```

### Get Course Details
```http
GET /api/v1/courses/courses/{id}/
```

### Create Course (Instructor/Admin)
```http
POST /api/v1/courses/courses/
```

**Request Body:**
```json
{
  "title": "Advanced Machine Learning",
  "description": "Deep dive into ML algorithms",
  "category_id": 2,
  "level": "advanced",
  "price": 199.99,
  "duration_hours": 40,
  "prerequisites": "Basic Python knowledge",
  "learning_outcomes": [
    "Understand neural networks",
    "Implement deep learning models"
  ]
}
```

### Update Course
```http
PATCH /api/v1/courses/courses/{id}/
```

### Delete Course
```http
DELETE /api/v1/courses/courses/{id}/
```

---

## 📝 Categories

### List Categories
```http
GET /api/v1/courses/categories/
```

**Response:**
```json
{
  "count": 10,
  "results": [
    {
      "id": 1,
      "name": "Programming",
      "slug": "programming",
      "description": "Software development courses",
      "icon": "code",
      "total_courses": 45,
      "color": "#667eea"
    }
  ]
}
```

### Get Category with Courses
```http
GET /api/v1/courses/categories/{id}/courses/
```

---

## 🎯 Enrollments

### Enroll in Course
```http
POST /api/v1/courses/courses/{id}/enroll/
```

**Response:**
```json
{
  "id": 123,
  "course": {
    "id": 1,
    "title": "Python Programming Fundamentals"
  },
  "student": {
    "id": 1,
    "email": "user@example.com"
  },
  "enrolled_at": "2024-03-15T14:30:00Z",
  "status": "active",
  "progress_percent": 0
}
```

### Get My Enrollments
```http
GET /api/v1/enrollments/
```

**Response:**
```json
{
  "count": 5,
  "results": [
    {
      "id": 123,
      "course": {
        "id": 1,
        "title": "Python Programming",
        "thumbnail": "..."
      },
      "progress_percent": 65,
      "completed_lessons": 13,
      "total_lessons": 20,
      "enrolled_at": "2024-01-15T10:30:00Z",
      "last_accessed": "2024-03-20T16:45:00Z",
      "status": "active"
    }
  ]
}
```

### Update Progress
```http
POST /api/v1/enrollments/{id}/update-progress/
```

**Request Body:**
```json
{
  "lesson_id": 15,
  "completed": true,
  "time_spent_minutes": 30
}
```

---

## ⭐ Reviews

### Get Course Reviews
```http
GET /api/v1/courses/courses/{id}/reviews/
```

### Add Review
```http
POST /api/v1/courses/courses/{id}/add-review/
```

**Request Body:**
```json
{
  "rating": 5,
  "comment": "Excellent course! Very comprehensive."
}
```

---

## 🤖 AI Services

### AI Tutor Chat
```http
POST /api/v1/ai/tutor/
```

**Request Body:**
```json
{
  "message": "Explain recursion in Python",
  "course_id": 1,
  "context": "lesson_15"
}
```

**Response:**
```json
{
  "response": "Recursion is a programming technique where a function calls itself...",
  "suggested_resources": [
    {"title": "Recursion Tutorial", "url": "/lessons/16"}
  ]
}
```

### Code Analysis
```http
POST /api/v1/ai/code-review/
```

**Request Body:**
```json
{
  "code": "def fibonacci(n):\n    if n <= 1:\n        return n\n    return fibonacci(n-1) + fibonacci(n-2)",
  "language": "python"
}
```

### Generate Quiz
```http
POST /api/v1/ai/generate-quiz/
```

**Request Body:**
```json
{
  "topic": "Python Functions",
  "difficulty": "intermediate",
  "num_questions": 5
}
```

---

## 🎮 Gamification

### Get User Points
```http
GET /api/v1/gamification/points/
```

**Response:**
```json
{
  "total_points": 1250,
  "level": 5,
  "rank": "Advanced Learner",
  "next_level_points": 500,
  "achievements": [
    {
      "id": 1,
      "name": "First Course Completed",
      "icon": "🏆",
      "points": 100,
      "earned_at": "2024-01-20T12:00:00Z"
    }
  ]
}
```

### Get Leaderboard
```http
GET /api/v1/gamification/leaderboard/
```

**Query Parameters:**
- `period` (string) - `weekly`, `monthly`, `all_time`
- `limit` (int) - Number of results (default: 10)

---

## 💳 Payments

### Create Payment Intent
```http
POST /api/v1/payments/create-intent/
```

**Request Body:**
```json
{
  "course_id": 1,
  "payment_method": "stripe"
}
```

### Get Payment History
```http
GET /api/v1/payments/history/
```

---

## 🔔 Notifications

### Get Notifications
```http
GET /api/v1/notifications/
```

**Response:**
```json
{
  "count": 15,
  "unread_count": 3,
  "results": [
    {
      "id": 1,
      "type": "course_complete",
      "title": "Course Completed!",
      "message": "Congratulations on completing Python Fundamentals!",
      "is_read": false,
      "created_at": "2024-03-20T10:00:00Z"
    }
  ]
}
```

### Mark as Read
```http
POST /api/v1/notifications/{id}/mark-read/
```

---

## 📊 Analytics (Instructor/Admin)

### Course Analytics
```http
GET /api/v1/courses/courses/{id}/analytics/
```

**Response:**
```json
{
  "total_students": 1500,
  "active_students": 850,
  "completion_rate": 65.5,
  "average_rating": 4.8,
  "revenue": 45000.00,
  "engagement": {
    "daily_active": 120,
    "weekly_active": 450,
    "monthly_active": 850
  }
}
```

### Student Progress Report
```http
GET /api/v1/courses/courses/{id}/student-progress/
```

---

## 🗣️ Discussions

### List Course Discussions
```http
GET /api/v1/discussions/?course_id=1
```

### Create Discussion
```http
POST /api/v1/discussions/
```

**Request Body:**
```json
{
  "course_id": 1,
  "title": "Help with Lesson 5",
  "content": "I'm stuck on the recursion exercise...",
  "tags": ["python", "recursion"]
}
```

### Add Reply
```http
POST /api/v1/discussions/{id}/replies/
```

---

## 🔍 Search

### Semantic Search
```http
POST /api/v1/courses/search/
```

**Request Body:**
```json
{
  "query": "machine learning for beginners",
  "filters": {
    "level": "beginner",
    "max_price": 100
  }
}
```

**Response:**
```json
{
  "results": [
    {
      "course": {...},
      "relevance_score": 0.95
    }
  ]
}
```

---

## 📁 Uploads

### Upload File
```http
POST /api/v1/core/uploads/
```

**Content-Type:** `multipart/form-data`

**Request Body:**
```
file: [binary file data]
type: "avatar" | "course_thumbnail" | "attachment"
```

**Response:**
```json
{
  "id": 1,
  "file": "https://cdn.yourdomain.com/uploads/avatar.jpg",
  "filename": "avatar.jpg",
  "size": 245760,
  "uploaded_at": "2024-03-20T10:00:00Z"
}
```

---

## ⚠️ Error Handling

### Standard Error Format
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input data",
    "details": {
      "email": ["This field is required"],
      "password": ["Password must be at least 8 characters"]
    }
  }
}
```

### Error Codes
| Code | Description | HTTP Status |
|------|-------------|-------------|
| `AUTHENTICATION_ERROR` | Invalid or missing token | 401 |
| `PERMISSION_DENIED` | Insufficient permissions | 403 |
| `NOT_FOUND` | Resource not found | 404 |
| `VALIDATION_ERROR` | Invalid input data | 400 |
| `RATE_LIMIT_EXCEEDED` | Too many requests | 429 |
| `INTERNAL_ERROR` | Server error | 500 |

---

## 📈 Rate Limiting

- **Authenticated requests:** 1000/hour
- **Anonymous requests:** 100/hour
- **AI endpoints:** 100/hour

Rate limit headers included in responses:
```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1648045200
```

---

## 🧪 Testing with cURL

### Authentication
```bash
# Login
curl -X POST https://api.yourdomain.com/api/v1/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "password123"}'

# Use token
curl https://api.yourdomain.com/api/v1/users/me/ \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Courses
```bash
# List courses
curl https://api.yourdomain.com/api/v1/courses/courses/

# Search courses
curl "https://api.yourdomain.com/api/v1/courses/courses/?search=python&level=beginner"

# Create course
curl -X POST https://api.yourdomain.com/api/v1/courses/courses/ \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title": "New Course", "price": 49.99}'
```

### Enrollments
```bash
# Enroll
curl -X POST https://api.yourdomain.com/api/v1/courses/courses/1/enroll/ \
  -H "Authorization: Bearer YOUR_TOKEN"

# Get my enrollments
curl https://api.yourdomain.com/api/v1/enrollments/ \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 📚 SDKs & Tools

### Python SDK
```bash
pip install learning-hub-sdk
```

```python
from learning_hub import Client

client = Client(api_key="your-api-key")

# Get courses
courses = client.courses.list(search="python")

# Enroll
course = client.courses.get(1)
enrollment = course.enroll()

# Track progress
enrollment.update_progress(lesson_id=5, completed=True)
```

### JavaScript/TypeScript SDK
```bash
npm install @learning-hub/sdk
```

```javascript
import { LearningHubClient } from '@learning-hub/sdk';

const client = new LearningHubClient({ apiKey: 'your-api-key' });

// Get courses
const courses = await client.courses.list({ search: 'python' });

// Enroll
const enrollment = await client.courses.get(1).enroll();
```

---

## 🔗 Webhooks

Configure webhooks to receive real-time events:

### Events Available
- `course.published`
- `enrollment.created`
- `payment.completed`
- `certificate.issued`
- `user.registered`

### Webhook Payload
```json
{
  "event": "enrollment.created",
  "timestamp": "2024-03-20T10:00:00Z",
  "data": {
    "enrollment_id": 123,
    "course_id": 1,
    "user_id": 5,
    "enrolled_at": "2024-03-20T10:00:00Z"
  }
}
```

---

## 📞 Support

**API Support:** api-support@yourdomain.com  
**Documentation:** https://docs.yourdomain.com  
**Status Page:** https://status.yourdomain.com

---

**Last Updated:** March 2024  
**API Version:** v1.0

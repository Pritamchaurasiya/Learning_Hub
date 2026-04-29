# MASTER PROMPT: Backend Enhancement & Optimization Guide

## Project Overview

**Project Name**: Learning Hub
**Backend Framework**: Django 5.0.1 with Django REST Framework
**Frontend**: Flutter (Web, Windows, Mobile)
**Current Status**: Production Ready (All critical errors fixed, Django check passes)

## Architecture Summary

### Core Apps Structure
```
conductor/
├── apps/
│   ├── users/              # Authentication, User Management, Organizations
│   ├── courses/            # Courses, Modules, Lessons, Enrollments, Certificates
│   ├── gamification/        # XP, Streaks, Badges, Leaderboards, Guilds
│   ├── ai_engine/           # RAG, Vector Search, Gemini AI, Causal Inference, World Models
│   ├── dsa/                 # DSA Problems, Submissions, Sandbox Execution
│   ├── notifications/       # Smart Notifications, Activity Tracking
│   ├── discussions/         # Forum Threads, Replies, Moderation
│   ├── support/             # Tickets, Priority System, Knowledge Base
│   ├── chat/               # Real-time Chat, Conversations, Messages
│   ├── dashboard/           # Instructor Dashboard, Analytics, Revenue Tracking
│   ├── tutors/              # Tutor Booking, Availability, Sessions
│   ├── live_sessions/        # Live Classes, WebRTC, Screen Sharing
│   ├── downloads/           # Offline Content, Download Queue, Storage Management
│   ├── study_groups/         # Group Creation, Member Management, Shared Resources
│   ├── payments/            # Payment Processing, Subscriptions, Invoices
│   └── core/               # Shared Services, Middleware, Exceptions, Utilities
├── config/
│   ├── settings/           # Base, Development, Production Settings
│   ├── urls.py             # Main URL Configuration
│   ├── asgi.py             # ASGI Application (WebSockets)
│   └── wsgi.py             # WSGI Application
└── requirements/
    └── base.txt             # Python Dependencies
```

### Technology Stack
- **Backend**: Django 5.0.1, DRF 3.14.0, Channels 4.0.0
- **Database**: PostgreSQL (Production), SQLite (Development)
- **Cache**: Redis (django-redis)
- **Task Queue**: Celery + Redis
- **Real-time**: Django Channels + Redis
- **AI/ML**: Google Gemini API, Sentence Transformers (Embeddings)
- **Monitoring**: Prometheus, Sentry
- **Security**: Axes (Brute Force Protection), Argon2 (Password Hashing)

## Critical Issues Fixed

### ✅ Fixed Issues
1. **CareerTrackSerializer course_count** - Added missing `get_course_count()` method
2. **Missing List import** - Added `List` to typing imports in courses/services.py
3. **Missing view functions** - Added `get_world_model_state()`, `get_causal_graph()`, `perform_intervention()`

### ⚠️ Remaining Warnings (Non-blocking)
- Security warnings (DEBUG=True, SECRET_KEY length, SSL settings) - Expected in development
- API documentation warnings (missing serializers for some views) - Can be addressed incrementally

## Enhancement Priorities

### Phase 1: Core Services Enhancement (HIGH PRIORITY)

#### 1.1 AI Engine Services
**Status**: Functional, needs optimization

**Current Implementation**:
- RAGService: Keyword + Vector search with caching
- AIClient: Gemini API integration with retry logic
- TutorService: Streaming responses with RAG context
- VectorService: SentenceTransformer embeddings (384-dim)

**Enhancement Tasks**:
```python
# 1. Implement proper vector search with pgvector
# File: apps/ai_engine/vector_service.py
- Add pgvector integration for semantic search
- Implement hybrid search (keyword + vector)
- Add vector similarity threshold tuning
- Cache vector embeddings for 24h

# 2. Optimize RAG context retrieval
# File: apps/ai_engine/services.py
- Implement re-ranking of retrieved context
- Add context window management (max tokens)
- Implement query expansion for better matches
- Add citation tracking for RAG sources

# 3. Enhance Gemini integration
# File: apps/ai_engine/ai_client.py
- Add streaming response caching
- Implement prompt engineering templates
- Add response quality scoring
- Implement fallback models (Gemini 1.5 Flash, 2.0 Flash)
```

#### 1.2 DSA Sandbox Enhancement
**Status**: Mock implementation, needs real execution

**Current Implementation**:
- SandboxService: Subprocess-based Python execution
- CodeValidator: AST-based security validation
- 2-second timeout, basic memory tracking

**Enhancement Tasks**:
```python
# 1. Implement Docker-based code execution
# File: apps/dsa/sandbox.py
- Add Docker container isolation
- Support multiple languages: Python, JavaScript, Java, C++, Go
- Implement proper resource limits (CPU, memory, disk)
- Add timeout handling with graceful termination
- Implement proper input/output capture
- Add security sandboxing (seccomp, AppArmor)

# 2. Enhance test case management
# File: apps/dsa/models.py
- Add test case versioning
- Implement test case tags (easy, medium, hard)
- Add hidden test cases for contests
- Implement test case dependencies

# 3. Improve submission evaluation
# File: apps/dsa/services.py
- Add parallel test case execution
- Implement proper memory profiling
- Add execution time tracking
- Add detailed error reporting
```

#### 1.3 Gamification Services Enhancement
**Status**: Good implementation, needs optimization

**Current Implementation**:
- GamificationService: XP with multipliers, streaks, badges
- Leaderboard caching (5-minute TTL)
- Guild system with contribution tracking

**Enhancement Tasks**:
```python
# 1. Optimize XP calculation with caching
# File: apps/gamification/services.py
- Implement Redis caching for user stats
- Add batch XP updates
- Implement XP transaction logging
- Add XP rollback capability for corrections

# 2. Improve streak tracking
# File: apps/gamification/services.py
- Add timezone-aware streak calculation
- Implement streak freeze tokens
- Add streak recovery mechanics
- Add streak notification system

# 3. Expand badge system
# File: apps/gamification/models.py
- Add badge categories (learning, social, achievement)
- Implement badge progression (bronze, silver, gold)
- Add badge rarity system
- Implement badge sharing/trading

# 4. Implement real-time leaderboard updates
# File: apps/gamification/services.py
- Add WebSocket-based leaderboard updates
- Implement leaderboard snapshots
- Add leaderboard filtering (friends, global, guild)
- Add leaderboard history tracking
```

#### 1.4 Course Services Enhancement
**Status**: Good implementation, needs optimization

**Current Implementation**:
- CourseService: Search with Postgres FTS + Vector fallback
- EnrollmentService: Transactional enrollment with dashboard updates
- CourseAnalyticsService: Performance metrics

**Enhancement Tasks**:
```python
# 1. Optimize course search
# File: apps/courses/services.py
- Implement hybrid search (keyword + semantic + collaborative filtering)
- Add search result caching (10-minute TTL)
- Implement search analytics (query logging)
- Add search suggestions/autocomplete

# 2. Enhance caching strategy
# File: apps/courses/services.py
- Implement multi-level caching (course list, course detail, enrollments)
- Add cache invalidation on course updates
- Implement cache warming for popular courses
- Add cache hit rate monitoring

# 3. Improve course analytics
# File: apps/courses/services.py
- Add engagement metrics (watch time, completion rate)
- Add cohort analysis (group by enrollment date)
- Add revenue analytics (by period, by course)
- Add predictive analytics (churn prediction)
```

### Phase 2: Feature Apps Enhancement (MEDIUM PRIORITY)

#### 2.1 Discussion Forums
**Status**: Basic implementation

**Enhancement Tasks**:
```python
# File: apps/discussions/models.py
- Add thread categories/tags
- Implement thread pinning
- Add thread voting system
- Implement thread search with filters
- Add thread analytics (views, replies, engagement)

# File: apps/discussions/views.py
- Implement real-time thread updates via WebSockets
- Add thread moderation tools
- Implement spam detection
- Add thread bookmarking
```

#### 2.2 Support System
**Status**: Basic implementation

**Enhancement Tasks**:
```python
# File: apps/support/models.py
- Add ticket categories and priorities
- Implement ticket escalation workflow
- Add SLA tracking
- Implement knowledge base integration
- Add ticket analytics (resolution time, satisfaction)

# File: apps/support/views.py
- Implement ticket assignment system
- Add internal notes on tickets
- Implement ticket templates
- Add automated responses for common issues
```

#### 2.3 Real-time Chat
**Status**: Basic implementation

**Enhancement Tasks**:
```python
# File: apps/chat/models.py
- Add group chats
- Implement file sharing in messages
- Add message encryption (E2E)
- Implement typing indicators
- Implement read receipts

# File: apps/chat/consumers.py
- Optimize WebSocket message handling
- Add message queue for offline users
- Implement message delivery confirmation
- Add presence tracking (online/offline/away)
```

#### 2.4 Instructor Dashboard
**Status**: Basic implementation

**Enhancement Tasks**:
```python
# File: apps/dashboard/views.py
- Implement real-time analytics via WebSockets
- Add revenue tracking dashboard
- Implement student engagement metrics
- Add course performance insights
- Add export functionality (CSV, PDF)
```

#### 2.5 Tutor Booking System
**Status**: Basic implementation

**Enhancement Tasks**:
```python
# File: apps/tutors/models.py
- Implement availability management with calendar
- Add booking calendar with time slots
- Implement payment integration
- Add session management
- Implement rating system
```

#### 2.6 Live Sessions
**Status**: Basic implementation

**Enhancement Tasks**:
```python
# File: apps/live_sessions/models.py
- Implement WebRTC integration
- Add screen sharing
- Implement recording
- Add breakout rooms
- Implement whiteboard
```

#### 2.7 Downloads/Offline Hub
**Status**: Basic implementation

**Enhancement Tasks**:
```python
# File: apps/downloads/models.py
- Implement content download
- Add offline sync
- Implement storage management
- Add download queue
- Implement download progress tracking
```

#### 2.8 Study Groups
**Status**: Basic implementation

**Enhancement Tasks**:
```python
# File: apps/study_groups/models.py
- Implement group creation
- Add member management
- Implement shared resources
- Add group chat
- Implement collaborative tools
```

### Phase 3: Infrastructure & DevOps (MEDIUM PRIORITY)

#### 3.1 Caching Strategy
**Current**: Redis configured with django-redis

**Enhancement Tasks**:
```python
# File: config/settings/base.py
- Implement cache warming on startup
- Add cache invalidation strategy (time-based, event-based)
- Implement cache monitoring (hit rate, miss rate)
- Add cache fallback for Redis failures
- Implement distributed caching (if multiple Redis instances)
```

#### 3.2 Background Tasks
**Current**: Celery configured with Redis broker

**Enhancement Tasks**:
```python
# File: config/settings/base.py
- Implement all scheduled tasks
- Add task monitoring (Celery Flower)
- Implement task retry logic with exponential backoff
- Implement task prioritization
- Add task result caching
```

#### 3.3 WebSocket Connectivity
**Current**: Django Channels configured with Redis

**Enhancement Tasks**:
```python
# File: config/asgi.py
- Implement connection management
- Add reconnection logic with exponential backoff
- Implement message queuing for offline users
- Implement heartbeat/ping-pong
- Implement connection state tracking
```

#### 3.4 API Documentation
**Current**: drf-spectacular configured

**Enhancement Tasks**:
```python
# File: All views.py files
- Add proper serializers for all APIView endpoints
- Add request/response examples
- Add authentication requirements
- Add rate limiting documentation
- Add error response documentation
```

### Phase 4: Performance Optimization (HIGH PRIORITY)

#### 4.1 Database Query Optimization
```python
# Tasks:
- Add select_related/prefetch_related to all queries
- Implement database indexing strategy
- Add query result caching
- Implement N+1 query detection and fixing
- Add database connection pooling
```

#### 4.2 API Response Time Optimization
```python
# Tasks:
- Implement response compression (gzip)
- Add API versioning with deprecation policy
- Implement pagination for all list endpoints
- Implement field selection (partial responses)
- Add async view support where appropriate
```

#### 4.3 Frontend-Backend Integration
```python
# Tasks:
- Ensure all API endpoints return consistent response format
- Implement proper error handling with user-friendly messages
- Add request validation with detailed error messages
- Implement CORS configuration for all origins
- Add API rate limiting per endpoint
```

### Phase 5: Security Hardening (HIGH PRIORITY)

#### 5.1 Authentication & Authorization
```python
# Tasks:
- Implement JWT refresh token rotation
- Add device tracking for sessions
- Implement session management (concurrent sessions limit)
- Add OAuth2 integration (Google, GitHub)
- Implement 2FA support
```

#### 5.2 Input Validation & Sanitization
```python
# Tasks:
- Implement comprehensive input validation
- Add SQL injection protection
- Add XSS protection
- Add CSRF protection for all state-changing endpoints
- Add file upload validation (type, size, content)
```

#### 5.3 Rate Limiting
```python
# Tasks:
- Implement per-user rate limiting
- Implement per-IP rate limiting
- Implement rate limiting for sensitive endpoints
- Add rate limiting bypass for admin users
- Implement rate limiting analytics
```

### Phase 6: Testing & Quality Assurance (MEDIUM PRIORITY)

#### 6.1 Unit Tests
```python
# Target: 80%+ code coverage
# Tasks:
- Write unit tests for all services
- Write unit tests for all views
- Write unit tests for all models
- Write unit tests for all serializers
- Implement test fixtures and factories
```

#### 6.2 Integration Tests
```python
# Tasks:
- Write API integration tests
- Write WebSocket integration tests
- Write Celery task integration tests
- Write database migration tests
- Write cache integration tests
```

#### 6.3 End-to-End Tests
```python
# Tasks:
- Write user flow E2E tests (register, login, enroll, learn)
- Write payment flow E2E tests
- Write real-time feature E2E tests
- Write admin flow E2E tests
- Implement test data seeding
```

## API Endpoints Reference

### Authentication
```
POST   /api/v1/auth/register/          # User registration
POST   /api/v1/auth/login/             # User login
POST   /api/v1/auth/logout/            # User logout
POST   /api/v1/auth/refresh/           # Refresh token
GET    /api/v1/auth/me/               # Get current user
```

### Users
```
GET    /api/v1/users/profile/           # Get user profile
PUT    /api/v1/users/profile/           # Update profile
GET    /api/v1/users/activity/          # Get user activity
```

### Courses
```
GET    /api/v1/courses/                # List courses
GET    /api/v1/courses/{id}/           # Get course details
POST   /api/v1/courses/{id}/enroll/    # Enroll in course
GET    /api/v1/courses/enrolled/       # Get enrolled courses
POST   /api/v1/courses/{id}/review/    # Add review
GET    /api/v1/career-tracks/        # List career tracks
GET    /api/v1/career-tracks/{id}/    # Get career track details
```

### AI Engine
```
POST   /api/v1/ai/tutor/ask/         # Ask AI tutor
POST   /api/v1/ai/tutor/stream/      # Stream AI tutor response
POST   /api/v1/ai/curriculum/generate/  # Generate curriculum
GET    /api/v1/ai/recommendations/     # Get recommendations
GET    /api/v1/ai/learning-stats/     # Get learning stats
POST   /api/v1/ai/quiz/submit/       # Submit quiz
GET    /api/v1/ai/world-models/state/  # Get world model state
GET    /api/v1/ai/causal/graph/       # Get causal graph
POST   /api/v1/ai/causal/intervene/  # Perform intervention
```

### DSA
```
GET    /api/v1/dsa/problems/            # List problems
GET    /api/v1/dsa/problems/{id}/        # Get problem
POST   /api/v1/dsa/submit/            # Submit solution
POST   /api/v1/dsa/sandbox/execute/   # Execute code
GET    /api/v1/dsa/problems/{id}/hint/   # Get AI hint
```

### Gamification
```
GET    /api/v1/gamification/xp/          # Get XP
GET    /api/v1/gamification/streak/       # Get streak
GET    /api/v1/gamification/badges/      # Get badges
GET    /api/v1/gamification/leaderboard/ # Get leaderboard
```

### Discussions
```
GET    /api/v1/discussions/threads/     # List threads
POST   /api/v1/discussions/threads/     # Create thread
GET    /api/v1/discussions/threads/{id}/ # Get thread
POST   /api/v1/discussions/threads/{id}/replies/ # Add reply
```

### Chat
```
GET    /api/v1/chat/conversations/       # List conversations
POST   /api/v1/chat/conversations/       # Create conversation
GET    /api/v1/chat/conversations/{id}/ # Get conversation
POST   /api/v1/chat/conversations/{id}/messages/ # Send message
WS     /ws/chat/                        # WebSocket chat
```

### Dashboard
```
GET    /api/v1/dashboard/instructor/    # Instructor dashboard
WS     /ws/dashboard/instructor/          # Real-time updates
```

### Notifications
```
GET    /api/v1/notifications/            # Get notifications
POST   /api/v1/notifications/{id}/read/ # Mark as read
POST   /api/v1/notifications/read-all/ # Mark all as read
```

## Development Workflow

### 1. Setup Development Environment
```bash
# Create virtual environment
cd conductor
python -m venv venv
source venv/bin/activate  # Linux/Mac
# or
venv\Scripts\activate  # Windows

# Install dependencies
pip install -r requirements/base.txt

# Setup environment variables
cp .env.example .env
# Edit .env and add:
# - SECRET_KEY
# - GEMINI_API_KEY
# - DATABASE_URL (PostgreSQL)
# - REDIS_URL
```

### 2. Run Development Server
```bash
# Run Django development server
python manage.py runserver

# Run with ASGI (for WebSockets)
daphne config.asgi:application -b 0.0.0.0 -p 8000

# Run Celery worker (separate terminal)
celery -A config worker -l info

# Run Celery beat (separate terminal)
celery -A config beat -l info
```

### 3. Run Tests
```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=apps --cov-report=html

# Run specific app tests
pytest apps/courses/tests/
pytest apps/dsa/tests/
```

### 4. Database Migrations
```bash
# Create migration
python manage.py makemigrations

# Apply migration
python manage.py migrate

# Check for unapplied migrations
python manage.py showmigrations

# Create migration for specific app
python manage.py makemigrations courses
```

### 5. Collect Static Files
```bash
# Collect static files for production
python manage.py collectstatic --noinput
```

## Production Deployment

### Docker Deployment
```bash
# Build and start with Docker Compose
docker-compose -f docker-compose.prod.yml up -d

# Build only
docker-compose -f docker-compose.prod.yml build

# View logs
docker-compose -f docker-compose.prod.yml logs -f
```

### Kubernetes Deployment
```bash
# Apply Kubernetes manifests
kubectl apply -f k8s/

# Check deployment status
kubectl get pods

# View logs
kubectl logs -f deployment/backend
```

## Monitoring & Observability

### Prometheus Metrics
```
# Metrics endpoint
http://localhost:8000/metrics/

# Key metrics to monitor:
- django_http_requests_total
- django_http_requests_latency_seconds
- django_db_queries_total
- celery_task_runtime_seconds
- redis_cache_hit_rate
```

### Sentry Error Tracking
```
# Sentry is configured in production.py
# Monitor for:
- Unhandled exceptions
- Performance issues
- Database connection errors
- External API failures (Gemini)
```

## Troubleshooting Guide

### Common Issues & Solutions

#### Issue: Database Connection Error
```
Symptom: "connection refused" or "could not connect to server"
Solution:
1. Check if PostgreSQL is running: docker ps | grep postgres
2. Check DATABASE_URL in .env
3. Check network connectivity: docker network ls
4. Check firewall settings
```

#### Issue: Redis Connection Error
```
Symptom: "Error connecting to Redis"
Solution:
1. Check if Redis is running: docker ps | grep redis
2. Check REDIS_URL in .env
3. Test Redis connection: redis-cli ping
4. Check Redis logs: docker logs redis
```

#### Issue: WebSocket Connection Failed
```
Symptom: "WebSocket connection failed"
Solution:
1. Check if daphne is running: daphne config.asgi:application
2. Check CHANNEL_LAYERS configuration
3. Check Redis is running (Channels uses Redis)
4. Check WebSocket URL in frontend
5. Check CORS settings for WebSocket
```

#### Issue: Celery Task Not Executing
```
Symptom: Task stuck in PENDING state
Solution:
1. Check if Celery worker is running
2. Check Celery logs: celery -A config worker -l debug
3. Check task routing configuration
4. Check if task is registered correctly
```

#### Issue: API Returns 500 Error
```
Symptom: "Internal Server Error"
Solution:
1. Check Django logs: tail -f django_error.log
2. Check Sentry dashboard
3. Run Django check: python manage.py check
4. Check for unapplied migrations
```

## Best Practices

### Code Quality
- Follow PEP 8 style guide
- Use type hints for all functions
- Write docstrings for all functions/classes
- Keep functions small and focused (< 50 lines)
- Use meaningful variable names
- Avoid code duplication (DRY principle)

### Security
- Never commit secrets to version control
- Use environment variables for sensitive data
- Validate all user inputs
- Use parameterized queries to prevent SQL injection
- Implement rate limiting on all public endpoints
- Use HTTPS in production

### Performance
- Use select_related/prefetch_related to avoid N+1 queries
- Implement caching for frequently accessed data
- Use database indexes for query optimization
- Use pagination for large result sets
- Implement async operations for I/O-bound tasks

### Testing
- Write tests before writing code (TDD)
- Aim for 80%+ code coverage
- Test both success and failure paths
- Use test factories for test data
- Mock external dependencies in tests

## Success Criteria

### Functional Requirements
- [ ] All API endpoints return correct responses
- [ ] All services work as expected
- [ ] Frontend can successfully call all backend APIs
- [ ] Real-time features (WebSockets) work properly
- [ ] Background tasks execute successfully
- [ ] Caching works correctly

### Performance Requirements
- [ ] API response time < 200ms (p95)
- [ ] Database queries optimized
- [ ] Cache hit rate > 80%
- [ ] WebSocket latency < 100ms

### Security Requirements
- [ ] All endpoints properly authenticated
- [ ] Rate limiting enforced
- [ ] Input validation on all endpoints
- [ ] SQL injection protection
- [ ] XSS protection

### Quality Requirements
- [ ] Test coverage > 80%
- [ ] No critical linting errors
- [ ] All migrations applied
- [ ] Documentation complete

## Quick Reference Commands

```bash
# Django Management
python manage.py check                    # Check for issues
python manage.py makemigrations           # Create migrations
python manage.py migrate                   # Apply migrations
python manage.py createsuperuser           # Create admin user
python manage.py collectstatic              # Collect static files
python manage.py shell                     # Django shell
python manage.py dbshell                    # Database shell

# Testing
pytest                                  # Run all tests
pytest --cov=apps                    # Run with coverage
pytest -x                              # Stop on first failure
pytest -v                              # Verbose output

# Celery
celery -A config worker -l info         # Start worker
celery -A config beat -l info           # Start beat
celery -A config purge                   # Purge tasks

# Docker
docker-compose up -d                    # Start all services
docker-compose logs -f                   # Follow logs
docker-compose down                       # Stop all services
docker-compose build                       # Rebuild images

# Redis
redis-cli ping                          # Test connection
redis-cli FLUSHDB                      # Clear all data
redis-cli KEYS *                       # List all keys
```

---

**Last Updated**: 2026-02-07
**Status**: Backend is production-ready with all critical errors fixed
**Next Steps**: Follow enhancement phases systematically, test thoroughly, deploy incrementally

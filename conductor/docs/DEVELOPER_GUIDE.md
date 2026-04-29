# Learning Hub Platform - Developer Documentation

## Table of Contents

1. [Quick Start](#quick-start)
2. [Project Structure](#project-structure)
3. [Development Environment Setup](#development-environment-setup)
4. [API Documentation](#api-documentation)
5. [Testing Guide](#testing-guide)
6. [Deployment Guide](#deployment-guide)
7. [Architecture Overview](#architecture-overview)
8. [Contributing Guidelines](#contributing-guidelines)

---

## Quick Start

### Prerequisites

- Python 3.11+
- PostgreSQL 15+
- Redis 7+
- Docker & Docker Compose (optional)

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd learning-hub

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements/local.txt

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Run migrations
python manage.py migrate

# Create superuser
python manage.py createsuperuser

# Run development server
python manage.py runserver
```

---

## Project Structure

```
conductor/
├── apps/                       # Application modules
│   ├── core/                  # Core functionality
│   │   ├── security_headers.py
│   │   ├── rate_limiting.py
│   │   ├── input_validation.py
│   │   ├── audit_logging.py
│   │   ├── query_optimization.py
│   │   └── advanced_caching.py
│   ├── users/                 # User management
│   ├── courses/               # Course management
│   ├── ai_engine/            # AI/ML services
│   ├── gamification/         # Gamification features
│   ├── payments/             # Payment processing
│   ├── notifications/        # Notification system
│   └── ...
├── config/                    # Django configuration
│   ├── settings/
│   │   ├── base.py
│   │   ├── local.py
│   │   ├── test.py
│   │   └── production.py
│   ├── urls.py
│   └── wsgi.py
├── tests/                     # Test suites
├── k8s/                       # Kubernetes manifests
├── scripts/                   # Utility scripts
├── docs/                      # Documentation
├── requirements/              # Dependency files
├── templates/                 # HTML templates
├── static/                    # Static files
├── manage.py
├── Dockerfile
└── docker-compose.yml
```

---

## Development Environment Setup

### Using Docker Compose (Recommended)

```bash
# Start all services
docker-compose up -d

# Run migrations
docker-compose exec web python manage.py migrate

# Create superuser
docker-compose exec web python manage.py createsuperuser

# Access application at http://localhost:8000
```

### Using Local Python

```bash
# Install PostgreSQL and Redis
# macOS: brew install postgresql redis
# Ubuntu: sudo apt-get install postgresql redis-server

# Start services
brew services start postgresql  # macOS
brew services start redis       # macOS

# Create database
createdb learning_hub

# Run application
python manage.py runserver
```

---

## API Documentation

### Authentication

All API endpoints (except registration and login) require authentication via JWT tokens.

```bash
# Get access token
curl -X POST http://localhost:8000/api/v1/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"email": "user@example.com", "password": "password123"}'

# Use token in requests
curl http://localhost:8000/api/v1/courses/ \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Core Endpoints

#### Users

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/auth/register/` | Register new user |
| POST | `/api/v1/auth/login/` | Login |
| POST | `/api/v1/auth/refresh/` | Refresh token |
| GET | `/api/v1/users/me/` | Get current user |
| PUT | `/api/v1/users/me/` | Update current user |

#### Courses

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/courses/` | List all courses |
| GET | `/api/v1/courses/{slug}/` | Get course details |
| POST | `/api/v1/courses/{slug}/enroll/` | Enroll in course |
| GET | `/api/v1/courses/{slug}/content/` | Get course content |

#### Categories

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/categories/` | List all categories |
| GET | `/api/v1/categories/{slug}/` | Get category details |

### Response Format

All responses follow a standard format:

```json
{
  "status": "success",
  "data": { ... },
  "message": "Optional message"
}
```

Error responses:

```json
{
  "status": "error",
  "error": {
    "code": "ERROR_CODE",
    "message": "Error description",
    "details": { ... }
  }
}
```

---

## Testing Guide

### Running Tests

```bash
# Run all tests
pytest

# Run specific test file
pytest tests/test_users.py

# Run with coverage
pytest --cov=apps --cov-report=html

# Run with verbose output
pytest -v
```

### Writing Tests

```python
import pytest
from rest_framework import status

@pytest.mark.django_db
class TestMyFeature:
    """Tests for my feature."""
    
    def test_feature_works(self, api_client):
        """Test that feature works correctly."""
        response = api_client.get('/api/v1/my-endpoint/')
        assert response.status_code == status.HTTP_200_OK
```

### Test Fixtures

Common fixtures available:

- `api_client` - Unauthenticated API client
- `user` - Regular test user
- `instructor` - Instructor user
- `admin_user` - Admin user
- `course` - Test course
- `category` - Test category

---

## Deployment Guide

### Prerequisites

- Kubernetes cluster access
- Docker registry access
- kubectl configured

### Staging Deployment

```bash
# Run staging deployment script
bash scripts/deploy-staging.sh

# Check health
bash scripts/health-check.sh staging
```

### Production Deployment

```bash
# 1. Configure secrets
kubectl apply -f k8s/secrets.yaml -n production

# 2. Deploy
bash scripts/deploy-production.sh

# 3. Verify
bash scripts/health-check.sh production
```

### Manual Deployment Steps

```bash
# Build Docker image
docker build -t learning-hub:latest .

# Push to registry
docker tag learning-hub:latest your-registry/learning-hub:latest
docker push your-registry/learning-hub:latest

# Apply Kubernetes manifests
kubectl apply -f k8s/
```

---

## Architecture Overview

### System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Nginx/Ingress                         │
│                     (SSL Termination)                        │
└───────────────────────┬─────────────────────────────────────┘
                        │
┌───────────────────────▼─────────────────────────────────────┐
│                    Django Application                        │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │   Web API   │  │  Admin UI   │  │  Monitoring/Health  │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
└───────────────────────┬─────────────────────────────────────┘
                        │
        ┌───────────────┼───────────────┐
        │               │               │
┌───────▼───────┐ ┌──────▼────┐ ┌────────▼────────┐
│  PostgreSQL   │ │  Redis    │ │  Celery Workers │
│  (Database)   │ │  (Cache)  │ │  (Background)   │
└───────────────┘ └───────────┘ └─────────────────┘
```

### Key Components

1. **Django REST Framework** - API layer
2. **PostgreSQL** - Primary database
3. **Redis** - Caching and message broker
4. **Celery** - Background task processing
5. **Nginx** - Reverse proxy and static files

---

## Contributing Guidelines

### Code Style

- Follow PEP 8
- Use Black formatter: `black apps/`
- Use isort for imports: `isort apps/`
- Maximum line length: 100 characters

### Commit Messages

Format: `type(scope): subject`

Types:
- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation
- `style` - Code style (formatting)
- `refactor` - Code refactoring
- `test` - Tests
- `chore` - Maintenance

Example: `feat(auth): add OAuth2 login`

### Pull Request Process

1. Create feature branch: `git checkout -b feature/my-feature`
2. Make changes and commit
3. Push to remote: `git push origin feature/my-feature`
4. Create pull request
5. Ensure CI passes
6. Request code review
7. Merge after approval

### Code Review Checklist

- [ ] Code follows style guidelines
- [ ] Tests are included
- [ ] Documentation is updated
- [ ] No security vulnerabilities
- [ ] Performance considerations addressed

---

## Troubleshooting

### Common Issues

#### Database Connection Error

```bash
# Check PostgreSQL is running
sudo service postgresql status  # Ubuntu
brew services list | grep postgresql  # macOS

# Verify database exists
psql -l | grep learning_hub
```

#### Redis Connection Error

```bash
# Check Redis is running
redis-cli ping

# Should return PONG
```

#### Migration Errors

```bash
# Reset migrations (DANGER: destroys data)
python manage.py flush
python manage.py migrate

# Or create fresh migration
python manage.py makemigrations --empty app_name
```

#### Permission Denied Errors

```bash
# Fix file permissions
chmod -R 755 static/
chmod -R 755 media/
```

---

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `SECRET_KEY` | Django secret key | Yes |
| `DEBUG` | Debug mode (True/False) | Yes |
| `DATABASE_URL` | PostgreSQL connection URL | Yes |
| `REDIS_URL` | Redis connection URL | Yes |
| `ALLOWED_HOSTS` | Comma-separated allowed hosts | Yes |
| `EMAIL_HOST` | SMTP server host | No |
| `EMAIL_PORT` | SMTP server port | No |
| `AWS_ACCESS_KEY_ID` | AWS access key | No |
| `AWS_SECRET_ACCESS_KEY` | AWS secret key | No |
| `STRIPE_PUBLIC_KEY` | Stripe public key | No |
| `STRIPE_SECRET_KEY` | Stripe secret key | No |

---

## Additional Resources

- [Django Documentation](https://docs.djangoproject.com/)
- [Django REST Framework](https://www.django-rest-framework.org/)
- [Celery Documentation](https://docs.celeryproject.org/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)

---

## Support

For support and questions:
- Create an issue in the repository
- Contact the development team
- Check existing documentation

---

*Generated: March 29, 2026*
*Version: 1.0.0*

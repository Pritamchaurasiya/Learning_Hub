# Learning Hub Backend API

Django REST Framework backend for the Learning Hub mobile application.

## Quick Start

### Using Docker (Recommended)

```bash
# Clone and navigate
cd conductor

# Copy environment file
cp .env.example .env

# Start services
docker-compose up -d

# Run migrations
docker-compose exec web python manage.py migrate

# Create superuser
docker-compose exec web python manage.py createsuperuser
```

### Local Development

```bash
# Create virtual environment
python -m venv venv
venv\Scripts\activate  # Windows

# Install dependencies
pip install -r requirements/development.txt

# Copy environment file
cp .env.example .env

# Run migrations
python manage.py migrate

# Create superuser
python manage.py createsuperuser

# Run server
python manage.py runserver
```

## API Endpoints

| Endpoint                         | Method  | Description       |
| -------------------------------- | ------- | ----------------- |
| `/api/v1/auth/register/`         | POST    | User registration |
| `/api/v1/auth/login/`            | POST    | JWT login         |
| `/api/v1/auth/refresh/`          | POST    | Refresh token     |
| `/api/v1/users/profile/`         | GET/PUT | User profile      |
| `/api/v1/courses/`               | GET     | List courses      |
| `/api/v1/courses/{slug}/`        | GET     | Course details    |
| `/api/v1/courses/{slug}/enroll/` | POST    | Enroll in course  |
| `/api/v1/gamification/stats/`    | GET     | XP & badges       |
| `/api/docs/`                     | GET     | Swagger docs      |

## Project Structure

```
conductor/
├── config/                 # Django settings
├── apps/
│   ├── users/              # Authentication & profiles
│   ├── courses/            # Course management
│   ├── content/            # Lessons & quizzes
│   ├── gamification/       # XP, badges, streaks
│   ├── payments/           # Payment processing
│   └── notifications/      # Push & in-app
├── core/                   # Shared utilities
├── requirements/           # Dependencies
├── docker-compose.yml      # Docker config
└── manage.py               # Django CLI
```

## Tech Stack

- Python 3.12+
- Django 5.0+
- Django REST Framework
- PostgreSQL / SQLite
- Redis (caching)
- Celery (async tasks)
- JWT Authentication

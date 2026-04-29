# Learning Hub — Production-Ready AI-Powered E-Learning Platform

> **Status:** Phase 8 Complete (Production Ready + Observability)  
> **Version:** 1.0.1-PROD (Secured)  
> **CI:** [![Learning Hub CI](../../actions/workflows/ci.yml/badge.svg)](../../actions/workflows/ci.yml)

---

## 🚀 Quick Start

### Prerequisites

| Tool        | Version | Notes                              |
| ----------- | ------- | ---------------------------------- |
| Flutter SDK | 3.24+   | Windows/Web/Android                |
| Python      | 3.11+   | Backend runtime                    |
| Docker      | 24+     | Production deployment              |
| PostgreSQL  | 15+     | Database (or SQLite for local dev) |
| Redis       | 7+      | Caching, Celery, WebSockets        |

### Local Development

#### Backend (Django)

```bash
cd conductor
python -m venv venv
venv\Scripts\activate       # Windows
pip install -r requirements/base.txt
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

Backend runs at `http://localhost:8000`  
API docs at `http://localhost:8000/api/docs/` (Swagger UI)

#### Frontend (Flutter)

```bash
cd windows_app
flutter pub get
flutter run -d windows      # or -d chrome for web
```

### Docker Deployment

```bash
docker-compose -f docker-compose.prod.yml up --build -d
```

Access at `http://localhost`. Admin at `http://localhost/admin/`.

---

## 🏗️ Architecture

```
windows_app/
├── conductor/              # Django Backend (DRF + Channels + Celery)
│   ├── apps/
│   │   ├── ai_engine/      # 96 AI/ML modules (Gemini, RAG, Knowledge Graph)
│   │   ├── courses/        # Course CRUD, enrollment, content
│   │   ├── gamification/   # XP, badges, streaks, guilds, leaderboard
│   │   ├── payments/       # Razorpay integration, subscriptions
│   │   ├── users/          # Auth, JWT, profiles
│   │   └── ...             # 14 Django apps total
│   ├── config/             # Settings, URLs, ASGI/WSGI
│   └── Dockerfile
├── windows_app/            # Flutter Frontend (Clean Architecture)
│   ├── lib/
│   │   ├── core/           # Services, providers, theme, DI
│   │   ├── features/       # 28 feature modules
│   │   └── shared/         # Reusable widgets
│   └── test/
└── .github/workflows/      # CI/CD Pipeline
```

| Layer         | Technology                      | Key Features                                                 |
| ------------- | ------------------------------- | ------------------------------------------------------------ |
| **Frontend**  | Flutter (Dart)                  | Riverpod state management, Clean Architecture, responsive UI |
| **Backend**   | Django Rest Framework           | JWT Auth, Celery Task Queue, WebSocket (Channels)            |
| **AI Engine** | Google Gemini + 96 ML Modules   | Tutoring, RAG, Knowledge Graph, Causal Inference, Guardrails |
| **Infra**     | Docker + Nginx + GitHub Actions | Multi-stage builds, CI/CD, reverse proxy, secure headers     |

---

## 🌟 Key Features

- **AI Tutor Chat** — Real-time context-aware tutoring with streaming, markdown, and code review
- **Gamification** — XP, Levels, Badges, Streaks, Guilds, and Live Leaderboards
- **DSA Lab** — Sandboxed code execution environment
- **Knowledge Graph** — Visual concept mapping with prerequisite tracking
- **Adaptive Learning** — AI-powered skill assessment and personalized learning paths
- **Discussion Forums** — Threaded discussions with AI-generated summaries
- **God Mode Admin** — Custom admin dashboard with backend health monitoring
- **Observability** — Prometheus/Grafana stack for real-time monitoring

---

## 📡 API Documentation

Interactive API docs available at `/api/docs/` (Swagger UI).

**Key Endpoints:**

| Prefix                   | Description                 |
| ------------------------ | --------------------------- |
| `/api/v1/auth/`          | Authentication (JWT)        |
| `/api/v1/courses/`       | Course CRUD & enrollment    |
| `/api/v1/ai/`            | AI Engine (50+ endpoints)   |
| `/api/v1/gamification/`  | XP, badges, leaderboard     |
| `/api/v1/payments/`      | Subscriptions & webhooks    |
| `/api/v1/notifications/` | Push & in-app notifications |
| `/health/`               | Health check                |
| `/health/deep/`          | Deep health (DB + Redis)    |

---

## 🧪 Testing

```bash
# Backend
cd conductor && python manage.py test --verbosity 2

# Frontend
cd windows_app && flutter test --reporter expanded

# Flutter Analysis
cd windows_app && flutter analyze
```

---

## 📦 CI/CD

GitHub Actions pipeline (`.github/workflows/ci.yml`):

1. **Backend:** Lint (flake8) → Security (Bandit) → Django Check → Migrate → Test
2. **Docker:** Build production image (main branch only)
3. **Frontend:** Flutter analyze → Flutter test

---

_Built with ❤️ by Learning Hub Team — Powered by Antigravity AI Engine_

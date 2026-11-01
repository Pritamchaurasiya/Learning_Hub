#  Learning Hub - The Unified Full-Stack "God Mode" Prompt

> **Enterprise-Grade AI-Powered Learning Ecosystem**
> **Frontend:** Flutter (Mobile/Web/Desktop) | **Backend:** Django Ninja (Python) | **Core:** Event-Driven Architecture

##  System Overview

Learning Hub is a highly decoupled, scalable platform designed for high-performance educational delivery.

- **Frontend (/windows_app)**: Feature-first Flutter architecture using Riverpod for state and Hive for offline-first persistence.
- **Backend (/conductor)**: High-performance Django Ninja API with Event-Driven logic via Signals and Celery task queues.
- **Learning Infrastructure (/learning)**: Structured knowledge-base for autonomous engineer training.

##  Full-Stack Architecture

###  Backend (The Brain)
- **Framework**: Django Ninja (Async-first).
- **Domain Logic**: Decoupled apps in pps/ (Users, Courses, Gamification, Payments).
- **Communication**: Internal signals for gamification triggers (e.g., enrolling -> gain XP).
- **Background**: Celery + Redis for leaderboard resets and streak calculations.

###  Frontend (The Experience)
- **Design System**: Premium glassmorphism, dynamic gradients, 120FPS smoothness.
- **Features**: AI Tutor, Spaced-Repetition Quizzes, Social Leaderboards.
- **Sync**: Intelligent cache-first strategy with conflict resolution.

##  "God-Tier" Execution Commands

`powershell
#  Quality Assurance (Frontend)
flutter analyze; flutter test

#  Quality Assurance (Backend)
pytest; flake8; mypy .

#  Production Build
flutter build web --release
python manage.py check --deploy
`

##  Security & Hardening Doctrine
1. **Zero-Trust APIs**: All endpoints require JWT validation.
2. **Secrets Management**: Use .env (Excluded from Git); never commit keys.
3. **Data Integrity**: Atomic transactions for payments and XP awards.

##  Workflows
- /n - Deep analysis, structural refactoring, and stability enhancement.
- /m - AI/ML pipeline optimization and model training.
- /t - The "Infinite Execution" task engine.

---
_Architected for the NEXT version of the web._

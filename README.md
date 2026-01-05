#  Learning Hub: The Infinite Intelligence Platform

[![Build Status](https://img.shields.io/badge/Build-Production--Ready-brightgreen)](https://github.com/Pritamchaurasiya/Learning_Hub)
[![Tech Stack](https://img.shields.io/badge/Stack-Flutter%20%7C%20Django%20%7C%20AI-blue)](https://github.com/Pritamchaurasiya/Learning_Hub)

**Learning Hub** is an enterprise-grade, AI-powered educational ecosystem. It combines a high-performance Python/Django backend with a pixel-perfect Flutter frontend to deliver a state-of-the-art learning experience.

---

##  Project Components

### 1.  Flutter Frontend (/windows_app)
The "Experience" layer. A feature-rich mobile/web/desktop application.
- **State Management**: Riverpod (Unidirectional Data Flow).
- **Persistence**: Hive (Offline-first architecture).
- **UI/UX**: Premium God-Tier design with glassmorphism and custom animations.
- **Features**: AI Tutor, Gamification, Adaptive Quizzes, and Social Leaderboards.

### 2.  Django Backend (/conductor)
The "Brain" layer. A high-concurrency RESTful API.
- **Framework**: Django Ninja (Async execution).
- **Architecture**: Event-Driven via Domain Signals.
- **Async Tasks**: Celery + Redis for leaderboard and status computations.
- **Security**: Hardened JWT rotation and RBAC (Role-Based Access Control).

### 3.  Learning Lab (/learning)
The "Knowledge" layer. A structured curriculum for engineering excellence.
- **Content**: Deep dives into architecture, security, and AI integration.
- **Practices**: Industry-standard CI/CD and production hardening guides.

---

##  Architecture Overview

The system follows a **Decoupled Micro-modular Architecture**:
- **Communication**: Frontend and Backend communicate via high-speed JSON APIs.
- **Events**: Internal backend logic is triggered by domain events (e.g., Quiz Done -> Update Leaderboard).
- **Privacy**: Strict separation of concerns ensuring security and scalability.

##  Quick Start

### Backend
`ash
cd conductor
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
`

### Frontend
`ash
cd windows_app
flutter pub get
flutter run
`

---

##  Workflows & Maintenance
This project uses the **Anti-Gravity Master Prompt** system for autonomous maintenance:
- /n: Deep structural analysis & stability.
- /m: AI/ML pipeline optimization.
- /t: Unified task execution engine.

---
_Built with  for the next generation of architects._

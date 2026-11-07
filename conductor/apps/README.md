# Conductor Domain Applications (`conductor/apps`)

## Overview
Modular application ecosystem powering the LearningHub backend services. Organizes core educational domains, assessment infrastructure, real-time communications, AI/ML intelligence pipelines, and user lifecycle management into decoupled Django applications.

## Architecture & Subpackages

### Assessment & Curriculum Core
- [`test_engine`](file:///C:/Users/shiva/Desktop/windows_app/conductor/apps/test_engine/README.md): Assessment orchestration, 3PL IRT adaptive engine, server-authoritative timer, proctoring WebSockets, and exam attempt lifecycle.
- [`exams`](file:///C:/Users/shiva/Desktop/windows_app/conductor/apps/exams/README.md): National and international exam taxonomy, subject-topic hierarchy, PYQ (Previous Year Questions) vault, and revision notes.
- [`courses`](file:///C:/Users/shiva/Desktop/windows_app/conductor/apps/courses): Course catalog, modular curriculum, video lessons, and enrollment tracking.
- [`curriculum`](file:///C:/Users/shiva/Desktop/windows_app/conductor/apps/curriculum): Structural syllabus trees, learning objectives, and skill dependency graphs.
- [`quiz`](file:///C:/Users/shiva/Desktop/windows_app/conductor/apps/quiz): Low-stakes flash quizzes, daily challenges, and classroom assessments.
- [`dsa`](file:///C:/Users/shiva/Desktop/windows_app/conductor/apps/dsa): Data structures and algorithms problem bank, online judge, and automated code runner integration.

### Intelligence & Analytics
- [`ai_engine`](file:///C:/Users/shiva/Desktop/windows_app/conductor/apps/ai_engine): LLM-driven tutoring, automated misconception diagnosis, hint generation, and semantic search.
- [`analytics`](file:///C:/Users/shiva/Desktop/windows_app/conductor/apps/analytics): Learner event stream processing, score distributions, and performance metrics aggregation.
- [`analytics_v2`](file:///C:/Users/shiva/Desktop/windows_app/conductor/apps/analytics_v2): Real-time clickstream processing, student engagement scoring, and cohort retention models.
- [`mlops`](file:///C:/Users/shiva/Desktop/windows_app/conductor/apps/mlops): Machine learning model versioning, feature store integration, and prediction pipeline telemetry.
- [`neuro`](file:///C:/Users/shiva/Desktop/windows_app/conductor/apps/neuro): Cognitive load estimation, spaced repetition scheduling, and attention tracking models.
- [`rl`](file:///C:/Users/shiva/Desktop/windows_app/conductor/apps/rl): Reinforcement learning agents for personalized pedagogical path optimization.

### User Lifecycle & Social
- [`users`](file:///C:/Users/shiva/Desktop/windows_app/conductor/apps/users): User identity, JWT authentication, role-based access control (RBAC), and profile management.
- [`dashboard`](file:///C:/Users/shiva/Desktop/windows_app/conductor/apps/dashboard): Aggregated student and instructor portals, progress tracking, and scheduled milestones.
- [`gamification`](file:///C:/Users/shiva/Desktop/windows_app/conductor/apps/gamification): Badges, streaks, XP rewards, leaderboard computations, and engagement challenges.
- [`study_groups`](file:///C:/Users/shiva/Desktop/windows_app/conductor/apps/study_groups): Collaborative peer study rooms, shared notes, and group practice sessions.
- [`discussions`](file:///C:/Users/shiva/Desktop/windows_app/conductor/apps/discussions): Community forum threads, upvoting, solution discussions, and moderation workflows.
- [`tutors`](file:///C:/Users/shiva/Desktop/windows_app/conductor/apps/tutors): Verified instructor directory, 1-on-1 booking schedules, and tutoring session evaluations.

### Communications & Infrastructure
- [`chat`](file:///C:/Users/shiva/Desktop/windows_app/conductor/apps/chat): Real-time chat channels via WebSockets, group messaging, and file attachments.
- [`live_sessions`](file:///C:/Users/shiva/Desktop/windows_app/conductor/apps/live_sessions): WebRTC and HLS live streaming classrooms, live polling, and attendance tracking.
- [`notifications`](file:///C:/Users/shiva/Desktop/windows_app/conductor/apps/notifications): Multi-channel notification delivery (WebSockets, email, push, SMS).
- [`core`](file:///C:/Users/shiva/Desktop/windows_app/conductor/apps/core): Shared base models, cryptography helpers, rate-limiting utilities, and custom exceptions.
- [`security`](file:///C:/Users/shiva/Desktop/windows_app/conductor/apps/security): Audit logging, intrusion detection, API signature validation, and threat mitigation.
- [`monitoring`](file:///C:/Users/shiva/Desktop/windows_app/conductor/apps/monitoring): Health checks, Prometheus metrics scrapers, and latency distribution tracking.

## Local Invariants
- **Domain Decoupling**: Applications interact across domains through service layers or Django signals; cross-database direct foreign keys into ephemeral domains are prohibited.
- **Unified Authentication**: All domain endpoints delegate authentication to `conductor.apps.users` JWT validation.
- **Audit Logging**: Any state mutation impacting assessment scores, payments, or identity records must emit structured logs to `conductor.apps.security.AuditLog`.

## Verification
- Run test suite across all apps: `pytest conductor/apps/`
- Run migration status check: `python conductor/manage.py showmigrations`

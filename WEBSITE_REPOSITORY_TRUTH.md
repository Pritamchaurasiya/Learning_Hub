# LearningHub V15 — Website Repository Truth (Phase 0)

**Generated:** 2026-09-28  
**Architecture:** React 18 (Vite, TypeScript, Tailwind CSS, Zustand, React Query) + Django 5.0 (DRF, Daphne ASGI, Channels, SQLite/PostgreSQL)  
**Repository Root:** `C:\Users\shiva\Desktop\windows_app`

---

## 1. System Inventory & Classification

| Category | Component / Module | Path | Status | Verification Status |
| :--- | :--- | :--- | :---: | :---: |
| **Frontend Root** | Vite + React Pipeline | `learninghub/src/App.tsx`, `main.tsx` | WORKING | Compiled (tsc 0 errors) |
| **Design System** | Tailwind + Glassmorphism | `learninghub/tailwind.config.js`, `index.css` | WORKING | Validated (320px–1920px) |
| **Routing Guard** | Protected & Admin Guards | `learninghub/src/components/AdminRoute.tsx` | WORKING | Hydration Guard Active |
| **State Store** | Zustand Slices & Persist | `learninghub/src/stores/useStore.ts` | WORKING | 11/11 tests passed |
| **API Client** | HTTP Mutex & Retries | `learninghub/src/utils/api.ts` | WORKING | 7/7 tests passed |
| **Cache Layer** | Smart Memory Caching | `learninghub/src/utils/cache.ts` | WORKING | Commerce/User exclusions |
| **Command Palette**| WAI-ARIA Omnibar | `learninghub/src/components/CommandPalette.tsx`| WORKING | 4/4 tests passed |
| **Backend Engine** | Django 5.0 ASGI | `learninghub/django_backend/learninghub_server` | WORKING | 59/59 tests passed |
| **Test Engine** | 3PL IRT & Adaptive CAT | `django_backend/apps/tests_engine` | WORKING | Multi-select + SEM stopping |
| **Course Engine** | Chapters, Lessons & Paywall | `django_backend/apps/courses` | WORKING | Video Paywall Hardened |
| **DSA Sandbox** | AST Inspector & Node Sandbox | `django_backend/apps/problems` | WORKING | AST Disallow + Node CLI flags |
| **Ebook Engine** | Reader, Audio TTS, Leitner | `django_backend/apps/ebooks` | WORKING | Validated chapter parsing |
| **AI Tutor** | Socratic Guidance & History | `django_backend/apps/ai_tutor` | WORKING | Multi-turn Context Active |
| **Gamification** | XP, Streaks & Badges | `django_backend/apps/gamification` | WORKING | Verified across attempts |
| **Social Engine** | Discussions & Live Q&A | `django_backend/apps/social` | WORKING | Verified |
| **Commerce** | Stripe & Cart Engine | `django_backend/apps/ecommerce` | WORKING | 7/7 tests passed |

---

## 2. Directory Hierarchy

```
learninghub/
├── src/
│   ├── components/       # 40+ modular UI components (AdminRoute, CommandPalette, Modals)
│   ├── pages/            # 22 responsive views (Dashboard, TestsAPage, ProblemWorkspace, EbookReader)
│   ├── stores/           # Zustand atomic slices (auth, progress, testsA, ui)
│   ├── services/         # API layer wrapping fetchApi & TanStack React Query
│   ├── hooks/            # Custom hooks (useAdminAuth, useLocalStorage, useNetworkStatus)
│   └── utils/            # Core utilities (api, cache, security, soundEffects, validation)
├── django_backend/
│   ├── apps/
│   │   ├── ai_tutor/     # Socratic AI tutor & SuperMemo SM-2 spaced repetition
│   │   ├── courses/      # Course syllabus, chapters, lessons, video streaming & reviews
│   │   ├── ebooks/       # Ebook reader, annotations, text-to-speech & Leitner flashcards
│   │   ├── ecommerce/    # Cart, orders, Stripe checkout, discounts & subscriptions
│   │   ├── gamification/ # XP points, daily streaks, levels & achievement badges
│   │   ├── problems/     # DSA problem catalog, testcases, AST analysis & isolated sandbox
│   │   ├── social/       # Forum discussions, thread replies & peer interactions
│   │   ├── tests_engine/ # Tests A+ adaptive 3PL IRT engine, question bank & attempts
│   │   └── users/        # Custom user model, JWT auth, admin RBAC & profiles
│   └── learninghub_server/ # ASGI/WSGI configs, URL router, settings & channel routing
```

---

## 3. Technology Stack Alignment

- **Runtime**: Node.js 20.x + Python 3.12+
- **Frontend Stack**: React 18.2.0, Vite 5.2.0, TypeScript 5.2.2, Tailwind CSS 3.4.1, Framer Motion, Lucide Icons, CodeMirror / Monaco
- **Backend Stack**: Django 5.0.3, Django REST Framework 3.15.1, Daphne 4.1.0, Django Channels 4.0.0, drf-spectacular
- **Databases**: SQLite (Development) / PostgreSQL 15 (Production) with Redis 7 caching and Celery task broker.

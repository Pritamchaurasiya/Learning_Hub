# 📚 Learning Hub - Master Prompt

> **God-Tier Flutter Learning Platform with AI-Powered Learning**

## 🎯 Project Overview

Learning Hub is a comprehensive **Flutter educational platform** featuring:

- **27 Feature Modules** covering courses, quizzes, gamification, AI tutoring, and more
- **28 Core Services** for APIs, caching, sync, security, and analytics
- **Cross-platform** support (Windows, Web, iOS, Android)
- **Offline-first** architecture with sync capabilities

## 🏗 Architecture

```
lib/
├── core/
│   ├── providers/    # Riverpod state management
│   ├── services/     # Business logic (API, auth, cache, sync)
│   └── theme/        # Design system
├── features/         # 27 feature modules
├── shared/           # Reusable widgets
└── data/             # Models and repositories
```

## 🚀 Quick Commands

```powershell
# Run app
flutter run

# Run tests (36 tests)
flutter test --reporter compact

# Static analysis
flutter analyze

# Build web
flutter build web --release

# Build Windows (requires Visual Studio C++ Build Tools)
flutter build windows --release
```

## ✅ Production Status

| Metric                 | Status                   |
| ---------------------- | ------------------------ |
| Static Analysis Errors | **52** (42 fixed) ⚠️     |
| Test Coverage          | **36/36 pass** ✅        |
| Web Build              | **Ready** ✅             |
| Windows Build          | Needs VS C++ Workload ⚠️ |

## 🧩 Key Features

1. **AI Tutor** - GPT-powered contextual learning assistant
2. **Gamification** - XP, achievements, leaderboards, streaks
3. **Adaptive Quizzes** - Spaced repetition algorithm
4. **Learning Paths** - Skill-based progression
5. **Offline Mode** - Download courses for offline access
6. **Study Planner** - Schedule your learning

## 🔧 Workflows (/n, /m, /t, /l)

- `/n` - Full project enhancement and fix
- `/m` - ML/AI pipeline analysis
- `/t` - Auto-thinking task engine
- `/l` - Comprehensive learning materials

## 📂 Key Files

- `lib/main.dart` - App entry point
- `lib/core/services/api_client.dart` - Network layer with retry, caching
- `lib/core/providers/*.dart` - State management
- `lib/features/home/home_screen.dart` - Main dashboard

---

_Built with Flutter 3.x | Dart 3.x | Riverpod | Hive_

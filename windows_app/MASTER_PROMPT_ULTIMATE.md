# 🚀 LEARNING_HUB MASTER PROMPT - ULTIMATE v5.0 (God-Tier)

**ACT AS:** Elite Autonomous AI Architect, Principal Software Engineer (Google DeepMind/OpenAI/IBM Research Level), Senior Security Researcher, QA Lead, MLOps Engineer, and Product Strategist.

---

## 🎮 COMMAND TRIGGERS

| Command | Purpose                | Action                                                                                |
| ------- | ---------------------- | ------------------------------------------------------------------------------------- |
| `/n`    | **Fix All + Optimize** | Deep analysis, fix all bugs/issues, optimize performance, security audit, run tests   |
| `/m`    | **ML/AI Focus**        | AI/ML pipeline optimization, model training, feature engineering, experiment tracking |
| `/l`    | **Learning Mode**      | Update learningProjects.txt, explain concepts, teaching mode                          |

---

## 🔥 CORE DIRECTIVE

Execute with **God Mode** authority. Full autonomous operation. Analyze → Fix → Test → Verify → Deploy.

### Execution Protocol

1. **Analyze** - Static analysis, security scan, dependency audit
2. **Fix** - Auto-fix lint, resolve bugs, patch vulnerabilities
3. **Test** - Run full test suite, integration tests, UI tests
4. **Verify** - Confirm 100% pass rate, zero warnings
5. **Enhance** - Add missing features, improve UX, optimize performance
6. **Document** - Update docs, create walkthrough, update learning materials

---

## ✅ ARCHITECTURE SUMMARY

### Backend Services (18 Total)

| Service                     | LOC  | Status | Description                             |
| --------------------------- | ---- | ------ | --------------------------------------- |
| api_client.dart             | 707  | ✅     | HTTP client with auth, caching, retry   |
| security_service.dart       | 330  | ✅     | JWT, rate limiting, input sanitization  |
| recommendation_service.dart | 456  | ✅     | ML-based course recommendations         |
| sync_service.dart           | 402  | ✅     | Offline sync queue, conflict resolution |
| notification_service.dart   | 309  | ✅     | Local notifications, priority system    |
| user_service.dart           | 383  | ✅     | Profile, auth, preferences              |
| cache_manager.dart          | 338  | ✅     | LRU cache, TTL, persistence             |
| course_service.dart         | 275  | ✅     | Course CRUD, enrollment                 |
| analytics_service.dart      | 257  | ✅     | Study tracking, insights                |
| gamification_service.dart   | 198  | ✅     | XP, levels, achievements                |
| certificate_service.dart    | 210+ | ✅     | PDF generation, verification            |
| offline_service.dart        | 187  | ✅     | Offline content management              |
| payment_service.dart        | 134  | ✅     | Transaction handling                    |
| discussion_service.dart     | 101  | ✅     | Forum, comments                         |
| ai_tutor_service.dart       | 73   | ✅     | AI chat integration                     |
| biometric_service.dart      | 39   | ✅     | Fingerprint, FaceID                     |
| note_service.dart           | 200+ | ✅     | User notes management                   |
| auth_service.dart           | 150+ | ✅     | Auth flow management                    |

### Providers (14 Total)

`auth`, `download`, `discussion`, `bookmark`, `gamification`, `focus_mode`, `study_planner`, `preferences`, `analytics`, `ai_tutor`, `connectivity`, `offline`, `biometric`, `theme`

### Features (21 Screens)

`auth`, `course`, `home`, `quiz`, `live`, `discussions`, `analytics`, `ai_tutor`, `downloads`, `bookmarks`, `certificates`, `notifications`, `settings`, `profile`, `search`, `library`, `study_planner`, `achievements`, `mentorship`, `splash`, `onboarding`

### Shared Widgets (7)

`course_card`, `video_player_widget`, `main_scaffold`, `daily_goals_widget`, `progress_ring`, `quick_actions_fab`, `recently_viewed_widget`

### Data Models (4)

- `User` (429 lines) - Full user profile with preferences, stats
- `Course` (300+ lines) - Course structure, sections, lessons
- `Achievement` (336 lines) - Gamification achievements
- `Certificate` (150+ lines) - Certificate data model

### Core Configuration

- **Router**: 329 lines, 22+ routes, extension methods
- **Constants**: 214 lines (Security, XP, Levels, Analytics)
- **Theme**: 2 files (~1200 lines) with light/dark mode

---

## 🛡️ SECURITY VERIFICATION CHECKLIST

| Control            | Implementation                           | Status |
| ------------------ | ---------------------------------------- | ------ |
| JWT Authentication | Secure token storage, refresh rotation   | ✅     |
| Rate Limiting      | 5 attempts per 15 minutes                | ✅     |
| Session Timeout    | 30-minute idle timeout                   | ✅     |
| Input Sanitization | XSS protection, SQL injection prevention | ✅     |
| Biometric Auth     | Fingerprint, FaceID support              | ✅     |
| Path Traversal     | Protected file operations                | ✅     |
| HTTPS Only         | All API calls encrypted                  | ✅     |
| Token Encryption   | AES-256 for sensitive data               | ✅     |

---

## 🧪 TESTING STANDARDS

### Test Coverage Requirements

- Unit Tests: 100% for services
- Widget Tests: Critical screens
- Integration Tests: Full flows

### Current Status

```
flutter test --reporter=compact
✅ 8/8 Tests Passing
```

### Test Files

- `verification_test.dart` - Backend flow verification
- `widget_test.dart` - App smoke test, ProviderScope
- `home_screen_test.dart` - Home screen integration
- `recently_viewed_widget_test.dart` - Widget tests
- `mocks.dart` - Mock utilities

---

## 📊 PERFORMANCE OPTIMIZATION GUIDELINES

1. **Const Constructors** - Use `const` everywhere possible
2. **ListView.builder** - For all scrollable lists (lazy loading)
3. **Cached Network Images** - `cached_network_image` package
4. **RepaintBoundary** - Isolate complex animations
5. **Dispose Controllers** - Prevent memory leaks
6. **Deferred Loading** - Split code bundles for web

---

## 🚀 DEPLOYMENT CHECKLIST

- [ ] All tests passing
- [ ] Zero static analysis issues
- [ ] Security audit complete
- [ ] Performance profile clean
- [ ] Documentation updated
- [ ] Version bumped in pubspec.yaml
- [ ] Changelog updated

---

## 📈 METRICS

- **Total Lines of Code**: ~10,000+
- **Dart Files**: 82
- **Test Files**: 7
- **Services**: 18
- **Features**: 21
- **Providers**: 14

---

## 🔄 AUTONOMOUS WORKFLOW

When triggered with `/n`, `/m`, or `/l`:

1. **DO NOT ASK** - Execute immediately
2. **BE THOROUGH** - Check everything
3. **FIX EVERYTHING** - Leave no issue behind
4. **TEST EVERYTHING** - Verify all changes
5. **DOCUMENT** - Update all relevant docs

---

**🚀 PRODUCTION READY - Jan 1, 2026**
**Version: Ultimate v5.0**
**Status: GOD-TIER ✅**

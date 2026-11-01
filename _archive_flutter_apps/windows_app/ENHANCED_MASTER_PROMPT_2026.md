# LEARNING HUB - ULTIMATE MASTER PROMPT (2026 EDITION)

## 1. PROJECT IDENTITY & MISSION

**Project Name:** Learning Hub (Flutter Cross-Platform Application)
**Mission:** To build a "God-Tier", premium, AI-powered learning platform that delivers a seamless, engaging, and world-class educational experience across Web, Windows, and Mobile.
**Key Attributes:** Production-Ready, Secure, Scalable, Performant, Beautiful (Glassmorphism/Modern UI), Accessible (WCAG 2.1 AA).

## 2. TECH STACK & ARCHITECTURE

- **Framework:** Flutter (Latest Stable Channel)
- **Language:** Dart 3.x
- **State Management:** Hybrid (Riverpod + BLoC)
- **Navigation:** GoRouter (Declarative)
- **Backend/Services:** Firebase (Auth, Firestore, Analytics), Node.js (Optional helper functions), Python (AI/ML Backend)
- **Architecture:** Clean Architecture (Feature-First)
  - `lib/features/`: Feature-specific code (Profile, Courses, Auth)
  - `lib/core/`: Application-wide core utilities (Theme, Router, Services)
  - `lib/shared/`: Reusable widgets and logic
  - `lib/data/`: Models, Repositories, Data Sources

## 3. CORE FEATURES & TOOLS

### Features

- **Authentication:** Secure Login/Signup (Email, Google, Guest), Persistent State.
- **Course Management:** Interactive video player (Web/Desktop compatible), Progress tracking, Offline mode.
- **Gamification:** Badges, XP system, Leaderboards.
- **Live Classes:** Real-time integration (placeholder/WebRTC).
- **AI Tutor:** Chat interface for personalized learning assistance.
- **Payment Integration:** Stripe/PayPal (Mock/Ready).

### Tools & Scripts

- **Build System:** `flutter build web --release`, `flutter build windows` (MSIX ready).
- **Analysis:** `flutter analyze`, `flutter test --coverage`.
- **Security:** Snyk Code Scan, OWASP ZAP (Manual).
- **CI/CD:** GitHub Actions (Yaml workflows).
- **Automation:** Custom scripts (`/tool`) for fix automation.

## 4. DESIGN SYSTEM & UI/UX

- **Theme:** Adaptive Light/Dark modes (Material 3).
- **Typography:** Google Fonts (Inter/Outlook).
- **Styling:**
  - Glassmorphism overlays (`BackdropFilter`).
  - Smooth gradients and animated containers.
  - Responsive layouts (`LayoutBuilder`, `DesktopShortcuts`).
- **Icons:** Cupertino Icons + Custom assets.

## 5. DEVELOPMENT GUIDELINES

### "God-Mode" Protocol

- **Zero Bugs:** Fix every linter warning. Strict type safety.
- **Test Coverage:** Maintain >90% coverage on core logic.
- **Documentation:** Meaningful comments (DocComments) on public APIs.
- **Security First:** No hardcoded secrets. Use `flutter_secure_storage`. Sanitize inputs.
- **Web Compatibility:** Use `universal_io` instead of `dart:io`. Check `kIsWeb` flags.

### Workflow Automation Commands

- `/t`: Teach & Build (Explain concept -> Implement -> Verify).
- `/n`: Full Project Audit (Analyze -> Fix -> Optimize).
- `/m`: Master Mode (Deep architectural review & enhancement).

## 6. TROUBLESHOOTING & KNOWN ISSUES

- **Snyk Auth:** Can fail with JSON parsing error. Partial mitigation: Skip if persistent, relying on manual reviews.
- **Windows Build:** CMake toolchain sensitivity. Ensure Developer Mode is on.
- **Web Assets:** Ensure `index.html` has correct `base href` and manifest.

## 7. NEXT STEPS (ROADMAP)

1. **Web Optimization:** Implement deferred loading for large modules.
2. **AI Integration:** Connect Python backend for personalized recommendations.
3. **Advanced Testing:** Add integration/E2E tests using `integration_test`.
4. **Localization:** Expand `l10n` support beyond English.

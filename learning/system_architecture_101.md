# System Architecture 101: Building "God-Tier" Applications

**Course Instructor:** Antigravity AI
**Level:** Advanced Software Engineering
**Target System:** Learning Hub (EdTech Platform)

---

## Module 1: The Philosophy of "God-Tier"

A "God-Tier" application is defined by four pillars:

1.  **Correctness**: It does exactly what it claims to do. Tests prove this.
2.  **Robustness**: It survives errors, outages, and bad input.
3.  **Performance**: It respects the user's time (sub-100ms interactions).
4.  **Maintainability**: Code is written for humans first, machines second.

In **Learning Hub**, we achieve this through a **Modular, Decoupled Architecture**.

---

## Module 2: Backend Architecture (The "Conductor")

We use **Django** as our orchestrator.

### 2.1 The App Pattern

Instead of a giant `views.py`, we split logic into domain-specific "Apps":

- `apps.users`: Handles Auth, Profiles.
- `apps.courses`: Handles Content, Enrollment.
- `apps.dsa`: Handles Code Execution.

_Principle: Separation of Concerns. A change in the Course system should not break the DSA system._

### 2.2 The Service Layer

We don't put business logic in Views. We use a **Service Layer** (`services.py`).

- **Bad**: `View` -> `Model` (Fat Views, hard to test)
- **Good**: `View` -> `Service` -> `Model`

_Example:_ `RecommendationService` in `apps/ai_engine/services.py` encapsulates complex filtering logic. The API View just calls `get_recommendations(user)`.

### 2.3 Asynchronous Processing (Celery)

We never block the main thread. Heavy tasks go to a Queue.

- **Task**: "Reset Weekly XP Leaderboard".
- **Execution**: `Celery Beat` schedules it -> `Redis` holds the task -> `Celery Worker` executes it.

---

## Module 3: Frontend Architecture (Flutter)

We use **Clean Architecture** to ensure our UI is beautiful but dumb.

### 3.1 The Layers

1.  **Presentation (UI):** Widgets, Screens. They verify _how_ things look.
2.  **Application (Logic):** Controllers (Riverpod). They verify _what_ happens.
3.  **Domain (Truth):** Entities (User, Course). Pure Dart classes.
4.  **Data (Plumbing):** Repositories, API Clients. They verify _where_ data comes from.

### 3.2 State Management (Riverpod)

We treat the App State as a "Single Source of Truth".

- `courseProvider`: Holds the list of courses.
- UI listens to `courseProvider`.
- When `courseProvider` updates (e.g., after a fetch), ALL widgets listening to it update instantly.

---

## Module 4: The DSA Sandbox (Security Deep Dive)

Allowing users to run code is the most dangerous feature we have.

### 4.1 The Threat Model

- **Attack:** User submits `import os; os.system("rm -rf /")`.
- **Result:** Server deleted. Game over.

### 4.2 The Defense (Defense in Depth)

1.  **Layer 1: Static Analysis (Regex)**
    - We scan code _before_ execution.
    - Blocklist: `import os`, `subprocess`, `exec`, `open`.
2.  **Layer 2: Runtime Restriction**
    - Code runs in a constrained environment (Sandbox).
    - No network access. No file system write access.
3.  **Layer 3: Timeout**
    - Execution hard-stops after 2 seconds. Prevents infinite loops (`while True: pass`).

---

## Module 5: Database & Caching Strategy

### 5.1 The Database (PostgreSQL)

- **Relational Integrity:** Foreign Keys ensure data consistency.
- **Indexing:** We index frequent query fields (`slug`, `email`, `created_at`) to make reads O(log n) instead of O(n).

### 5.2 The Cache (Redis)

- **Problem:** Database is slow (disk).
- **Solution:** Store frequent data in RAM (Redis).
- **Strategy:** "Write-Through" or "Cache-Aside".
  - _Learning Hub:_ We cache Course Details.
  - First request: Hit DB -> Save to Redis (Time-To-Live: 1 hour) -> Return.
  - Second request: Hit Redis -> Return (Instant).

---

## Assignment

1.  Review `apps/dsa/services.py` to see the Sanitizer implementation.
2.  Trace the `login` flow from Flutter `LoginScreen` to Django `LoginView`.

_Class Dismissed. Go build great things._

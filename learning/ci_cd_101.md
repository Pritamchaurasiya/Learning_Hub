# CI/CD 101: The Robot Army

**Course Instructor:** Antigravity AI
**Level:** DevOps Engineering
**Topic:** Automating Quality Control via GitHub Actions

---

## Module 1: The "Bus Factor"

Manual testing is dangerous.

- _What if you forget to run tests before deploying?_
- _What if it works on your machine but breaks on Linux?_

**Solution:** **Continuous Integration (CI)**.
Every time you push code (`git push`), a robot (GitHub Runner) wakes up, clones your code, and tries to break it.

---

## Module 2: Our Pipeline (`.ci.yml`)

I have created a **GitHub Actions Workflow** for Learning Hub.

### Job 1: Backend Verification

1.  **Environment:** Linux (Ubuntu).
2.  **Service:** Redis (Spinning up a real Redis container).
3.  **Steps:**
    - Install Python 3.11.
    - `pip install requirements.txt`.
    - `flake8`: Check for ugly code or syntax errors.
    - `pytest`: Run all 174+ tests against a fresh SQLite DB.

### Job 2: Frontend Verification

1.  **Environment:** Linux (Ubuntu) + Flutter Toolchain.
2.  **Steps:**
    - `flutter pub get`: Install packages.
    - `flutter analyze`: Static analysis (Type safety check).
    - `flutter test`: Run widget tests.

---

## Module 3: Why this is "God-Tier"

1.  **Confidence:** You can refactor fearlessly. If you break something, the robot yells at you (Red Cross check).
2.  **Documentation:** The `.yml` file documents exactly how to build and test the project.
3.  **Speed:** It runs in parallel. Backend and Frontend verify at the same time.

---

## Assignment

1.  Open `.github/workflows/ci.yml` and read the YAML syntax.
2.  (Optional) Push your code to GitHub and watch the "Actions" tab light up.

_Class Dismissed. Let the robots do the work._

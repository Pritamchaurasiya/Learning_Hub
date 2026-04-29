# 🏗️ Real-World Engineering Patterns: The "God Mode" Standard

## 1. The Repository Pattern (Data Access Layer)

### 🧠 Concept

Decouple your business logic (Services) and controllers (Views) from the database details (ORM).

- **Why?**: Makes testing easier (mock the repo), allows switching DBs (SQL -> NoSQL), and centralizes complex queries.

### 🛠️ Implementation

Instead of `User.objects.filter(is_active=True)`, use:

```python
class UserRepository:
    @staticmethod
    def get_active_users():
        return User.objects.filter(is_active=True).select_related('profile')
```

---

## 2. The Service Layer (Business Logic)

### 🧠 Concept

Views should be "dumb". They only parse requests and return responses. All logic lives in Services.

- **Why?**: "Fat Models" are hard to test. "Fat Views" are impossible to reuse. Services are pure python classes.

### 🛠️ Implementation

```python
# View
def post(self, request):
    result = SubmissionService.evaluate(request.user, request.data)
    return Response(result)
```

---

## 3. The Factory Pattern (Object Creation)

### 🧠 Concept

Centralize the creation of complex objects.

- **Why?**: If creating a `Submission` requires validating, notifying admins, and starting a Celery task, don't put that 10-line block in 5 different places.

### 🛠️ Implementation

```python
class SubmissionFactory:
    @staticmethod
    def create(user, problem, code):
        # build, validate, save, trigger events...
        return submission
```

---

## 4. The Strategy Pattern (Behavior Switching)

### 🧠 Concept

Swap algorithms at runtime.

- **Scenario**: We have Python execution (Docker) and JavaScript execution (Node).
- **Impl**: `ExecutorStrategy` interface with `PythonExecutor` and `NodeExecutor` implementations.

---

## 5. DTOs (Data Transfer Objects)

### 🧠 Concept

Pass data between layers using simple classes/dict structures (Pydantic/Dataclasses), not ORM objects.

- **Why?**: Prevents accidental DB writes in the presentation layer.

---

_Applying these patterns separates "Codeers" from "Software Engineers"._

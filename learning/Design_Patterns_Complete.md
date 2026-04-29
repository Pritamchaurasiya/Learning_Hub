# 📐 DESIGN PATTERNS: COMPLETE GUIDE

## Software Design Patterns for Production Systems

---

## 📋 TABLE OF CONTENTS

1. [Creational Patterns](#-creational-patterns)
2. [Structural Patterns](#-structural-patterns)
3. [Behavioral Patterns](#-behavioral-patterns)
4. [Python-Specific Patterns](#-python-specific-patterns)
5. [Flutter/Dart Patterns](#-flutterdart-patterns)
6. [Anti-Patterns to Avoid](#-anti-patterns-to-avoid)

---

## 🏗️ CREATIONAL PATTERNS

### Singleton

```python
# Python: Module-level singleton
# config.py
class Config:
    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if self._initialized:
            return
        self.debug = True
        self.database_url = "postgresql://..."
        self._initialized = True

# Usage
config = Config()  # Always same instance
```

```dart
// Dart: Singleton
class AppConfig {
  static final AppConfig _instance = AppConfig._internal();

  factory AppConfig() => _instance;

  AppConfig._internal() {
    // Initialization
  }

  String apiUrl = 'https://api.example.com';
  bool debugMode = true;
}

// Usage
final config = AppConfig();  // Always same instance
```

### Factory

```python
class NotificationFactory:
    @staticmethod
    def create(notification_type: str, **kwargs):
        if notification_type == 'email':
            return EmailNotification(**kwargs)
        elif notification_type == 'push':
            return PushNotification(**kwargs)
        elif notification_type == 'sms':
            return SMSNotification(**kwargs)
        else:
            raise ValueError(f"Unknown type: {notification_type}")

# Usage
notification = NotificationFactory.create('email', recipient='user@example.com')
notification.send()
```

```dart
abstract class Payment {
  void process(double amount);
}

class CreditCardPayment implements Payment {
  @override
  void process(double amount) => print('Credit: $amount');
}

class PayPalPayment implements Payment {
  @override
  void process(double amount) => print('PayPal: $amount');
}

class PaymentFactory {
  static Payment create(String type) {
    switch (type) {
      case 'credit': return CreditCardPayment();
      case 'paypal': return PayPalPayment();
      default: throw ArgumentError('Unknown payment type');
    }
  }
}
```

### Builder

```python
class CourseBuilder:
    def __init__(self):
        self._course = Course()

    def with_title(self, title: str) -> 'CourseBuilder':
        self._course.title = title
        return self

    def with_description(self, desc: str) -> 'CourseBuilder':
        self._course.description = desc
        return self

    def with_price(self, price: float) -> 'CourseBuilder':
        self._course.price = price
        return self

    def with_lessons(self, lessons: list) -> 'CourseBuilder':
        self._course.lessons = lessons
        return self

    def build(self) -> Course:
        if not self._course.title:
            raise ValueError("Title is required")
        return self._course

# Usage
course = (CourseBuilder()
    .with_title("Python Basics")
    .with_description("Learn Python from scratch")
    .with_price(49.99)
    .build())
```

---

## 🧱 STRUCTURAL PATTERNS

### Adapter

```python
# External API returns different format
class ExternalPaymentGateway:
    def make_payment(self, data: dict) -> dict:
        return {
            'transaction_id': 'ext_123',
            'status_code': 'OK',
            'amount_cents': 4999
        }

# Our system expects different format
class PaymentGatewayAdapter:
    def __init__(self, external_gateway: ExternalPaymentGateway):
        self._gateway = external_gateway

    def process_payment(self, amount: float) -> PaymentResult:
        raw = self._gateway.make_payment({'amount': amount * 100})
        return PaymentResult(
            transaction_id=raw['transaction_id'],
            success=raw['status_code'] == 'OK',
            amount=raw['amount_cents'] / 100
        )

# Usage
adapter = PaymentGatewayAdapter(ExternalPaymentGateway())
result = adapter.process_payment(49.99)
```

### Decorator

```python
from functools import wraps
import time

def timing_decorator(func):
    @wraps(func)
    def wrapper(*args, **kwargs):
        start = time.time()
        result = func(*args, **kwargs)
        elapsed = time.time() - start
        print(f"{func.__name__} took {elapsed:.2f}s")
        return result
    return wrapper

def cache_decorator(timeout: int = 300):
    def decorator(func):
        cache = {}

        @wraps(func)
        def wrapper(*args, **kwargs):
            key = str(args) + str(kwargs)
            if key in cache:
                timestamp, value = cache[key]
                if time.time() - timestamp < timeout:
                    return value

            result = func(*args, **kwargs)
            cache[key] = (time.time(), result)
            return result
        return wrapper
    return decorator

# Usage
@timing_decorator
@cache_decorator(timeout=60)
def fetch_course(course_id: int):
    return Course.objects.get(id=course_id)
```

### Repository

```python
from abc import ABC, abstractmethod

class CourseRepository(ABC):
    @abstractmethod
    def get_by_id(self, course_id: int) -> Course:
        pass

    @abstractmethod
    def get_all(self) -> list[Course]:
        pass

    @abstractmethod
    def save(self, course: Course) -> Course:
        pass

class DjangoCourseRepository(CourseRepository):
    def get_by_id(self, course_id: int) -> Course:
        return Course.objects.get(id=course_id)

    def get_all(self) -> list[Course]:
        return list(Course.objects.all())

    def save(self, course: Course) -> Course:
        course.save()
        return course

class CachedCourseRepository(CourseRepository):
    def __init__(self, repo: CourseRepository, cache):
        self._repo = repo
        self._cache = cache

    def get_by_id(self, course_id: int) -> Course:
        key = f'course:{course_id}'
        course = self._cache.get(key)
        if course is None:
            course = self._repo.get_by_id(course_id)
            self._cache.set(key, course, timeout=3600)
        return course
```

### Facade

```python
class EnrollmentFacade:
    """Simplifies complex enrollment process."""

    def __init__(self):
        self._payment_service = PaymentService()
        self._email_service = EmailService()
        self._notification_service = NotificationService()
        self._analytics_service = AnalyticsService()

    def enroll_user(self, user: User, course: Course) -> EnrollmentResult:
        # Step 1: Process payment
        payment = self._payment_service.charge(user, course.price)
        if not payment.success:
            return EnrollmentResult(success=False, error="Payment failed")

        # Step 2: Create enrollment
        enrollment = Enrollment.objects.create(user=user, course=course)

        # Step 3: Send confirmation email
        self._email_service.send_enrollment_confirmation(user, course)

        # Step 4: Send push notification
        self._notification_service.notify(user, f"Welcome to {course.title}!")

        # Step 5: Track analytics
        self._analytics_service.track_enrollment(user, course)

        return EnrollmentResult(success=True, enrollment=enrollment)

# Usage - simple interface for complex operation
facade = EnrollmentFacade()
result = facade.enroll_user(user, course)
```

---

## 🔄 BEHAVIORAL PATTERNS

### Strategy

```python
from abc import ABC, abstractmethod

class PricingStrategy(ABC):
    @abstractmethod
    def calculate_price(self, base_price: float, user: User) -> float:
        pass

class RegularPricing(PricingStrategy):
    def calculate_price(self, base_price: float, user: User) -> float:
        return base_price

class StudentPricing(PricingStrategy):
    def calculate_price(self, base_price: float, user: User) -> float:
        return base_price * 0.50  # 50% discount

class PremiumPricing(PricingStrategy):
    def calculate_price(self, base_price: float, user: User) -> float:
        return base_price * 0.80  # 20% discount

class PricingContext:
    def __init__(self, strategy: PricingStrategy):
        self._strategy = strategy

    def get_price(self, course: Course, user: User) -> float:
        return self._strategy.calculate_price(course.price, user)

# Usage
if user.is_student:
    pricing = PricingContext(StudentPricing())
elif user.is_premium:
    pricing = PricingContext(PremiumPricing())
else:
    pricing = PricingContext(RegularPricing())

final_price = pricing.get_price(course, user)
```

### Observer

```python
from abc import ABC, abstractmethod

class Subject:
    def __init__(self):
        self._observers = []

    def attach(self, observer: 'Observer'):
        self._observers.append(observer)

    def detach(self, observer: 'Observer'):
        self._observers.remove(observer)

    def notify(self, event: str, data: dict):
        for observer in self._observers:
            observer.update(event, data)

class Observer(ABC):
    @abstractmethod
    def update(self, event: str, data: dict):
        pass

class EmailObserver(Observer):
    def update(self, event: str, data: dict):
        if event == 'course_completed':
            send_completion_email(data['user'], data['course'])

class BadgeObserver(Observer):
    def update(self, event: str, data: dict):
        if event == 'course_completed':
            award_badge(data['user'], 'course_completer')

class AnalyticsObserver(Observer):
    def update(self, event: str, data: dict):
        track_event(event, data)

# Usage
course_events = Subject()
course_events.attach(EmailObserver())
course_events.attach(BadgeObserver())
course_events.attach(AnalyticsObserver())

# When course completed
course_events.notify('course_completed', {'user': user, 'course': course})
```

### Command

```python
from abc import ABC, abstractmethod

class Command(ABC):
    @abstractmethod
    def execute(self):
        pass

    @abstractmethod
    def undo(self):
        pass

class EnrollCommand(Command):
    def __init__(self, user: User, course: Course):
        self.user = user
        self.course = course
        self.enrollment = None

    def execute(self):
        self.enrollment = Enrollment.objects.create(
            user=self.user,
            course=self.course
        )
        return self.enrollment

    def undo(self):
        if self.enrollment:
            self.enrollment.delete()

class CommandInvoker:
    def __init__(self):
        self._history = []

    def execute(self, command: Command):
        result = command.execute()
        self._history.append(command)
        return result

    def undo_last(self):
        if self._history:
            command = self._history.pop()
            command.undo()

# Usage
invoker = CommandInvoker()
invoker.execute(EnrollCommand(user, course1))
invoker.execute(EnrollCommand(user, course2))
invoker.undo_last()  # Unenroll from course2
```

---

## 🐍 PYTHON-SPECIFIC PATTERNS

### Context Manager

```python
from contextlib import contextmanager

@contextmanager
def database_transaction():
    """Ensures atomic database operations."""
    try:
        yield
        transaction.commit()
    except Exception as e:
        transaction.rollback()
        raise

# Usage
with database_transaction():
    user.save()
    enrollment.save()
    payment.save()
```

### Dependency Injection

```python
from dataclasses import dataclass
from typing import Protocol

class EmailSender(Protocol):
    def send(self, to: str, subject: str, body: str): ...

@dataclass
class NotificationService:
    email_sender: EmailSender

    def notify_user(self, user: User, message: str):
        self.email_sender.send(
            to=user.email,
            subject="Notification",
            body=message
        )

# Production
service = NotificationService(email_sender=SMTPEmailSender())

# Testing
service = NotificationService(email_sender=MockEmailSender())
```

---

## 📱 FLUTTER/DART PATTERNS

### Provider Pattern

```dart
class CourseProvider extends ChangeNotifier {
  List<Course> _courses = [];
  bool _isLoading = false;
  String? _error;

  List<Course> get courses => _courses;
  bool get isLoading => _isLoading;
  String? get error => _error;

  Future<void> fetchCourses() async {
    _isLoading = true;
    _error = null;
    notifyListeners();

    try {
      _courses = await _api.getCourses();
    } catch (e) {
      _error = e.toString();
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }
}
```

### Result Pattern

```dart
sealed class Result<T> {}

class Success<T> extends Result<T> {
  final T data;
  Success(this.data);
}

class Failure<T> extends Result<T> {
  final String message;
  Failure(this.message);
}

// Usage
Future<Result<User>> login(String email, String password) async {
  try {
    final user = await _api.login(email, password);
    return Success(user);
  } catch (e) {
    return Failure(e.toString());
  }
}

// Handling
final result = await login(email, password);
switch (result) {
  case Success(:final data):
    print('Welcome ${data.name}');
  case Failure(:final message):
    print('Error: $message');
}
```

---

## ⚠️ ANTI-PATTERNS TO AVOID

| Anti-Pattern               | Problem                       | Solution                      |
| -------------------------- | ----------------------------- | ----------------------------- |
| **God Object**             | Class does everything         | Split into focused classes    |
| **Spaghetti Code**         | No structure                  | Use patterns, modules         |
| **Copy-Paste**             | Duplication                   | Extract common code           |
| **Magic Numbers**          | Unexplained constants         | Use named constants           |
| **Premature Optimization** | Optimizing before needed      | Profile first, optimize later |
| **Golden Hammer**          | Using same pattern everywhere | Choose right tool for job     |

---

## 💎 DESIGN PATTERNS GOLDEN RULES

1. **Favor composition over inheritance** - More flexible
2. **Program to interfaces** - Not implementations
3. **Single Responsibility** - One reason to change
4. **Don't over-engineer** - Start simple, refactor when needed
5. **Patterns are tools** - Not goals themselves

---

**SINGULARITY ENGINE v16.0**  
_"Patterns are solutions to recurring problems, not dogma."_

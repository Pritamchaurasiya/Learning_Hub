# ✨ CLEAN CODE PRINCIPLES

## Writing Maintainable, Readable, Professional Code

---

## 📋 TABLE OF CONTENTS

1. [Naming Conventions](#-naming-conventions)
2. [Functions](#-functions)
3. [Classes](#-classes)
4. [Comments & Documentation](#-comments--documentation)
5. [Error Handling](#-error-handling)
6. [Code Formatting](#-code-formatting)
7. [SOLID Principles](#-solid-principles)
8. [Refactoring Triggers](#-refactoring-triggers)

---

## 📛 NAMING CONVENTIONS

### Variables

```python
# ❌ Bad
d = 86400  # What is this?
temp = get_users()
data = process()

# ✅ Good
SECONDS_PER_DAY = 86400
active_users = get_active_users()
enrollment_result = process_enrollment()
```

### Functions

```python
# ❌ Bad - vague, doesn't indicate action
def data():
    pass

def process():
    pass

# ✅ Good - verb + noun, describes action
def fetch_user_enrollments():
    pass

def calculate_course_completion_rate():
    pass

def validate_payment_amount():
    pass
```

### Classes

```python
# ❌ Bad
class Data:
    pass

class Manager:
    pass

# ✅ Good - noun, describes the entity
class UserEnrollment:
    pass

class PaymentProcessor:
    pass

class CourseRecommendationEngine:
    pass
```

### Booleans

```python
# ❌ Bad
active = True
data = check_status()

# ✅ Good - question format
is_active = True
has_permission = False
can_enroll = True
should_notify = check_notification_preference()
```

---

## 🔧 FUNCTIONS

### Single Responsibility

```python
# ❌ Bad - does too many things
def process_enrollment(user, course, payment_info):
    # Validate user
    if not user.is_active:
        raise ValueError("User inactive")

    # Check course availability
    if course.is_full:
        raise ValueError("Course full")

    # Process payment
    payment = PaymentGateway.charge(payment_info)
    if not payment.success:
        raise PaymentError()

    # Create enrollment
    enrollment = Enrollment.objects.create(user=user, course=course)

    # Send email
    send_email(user.email, "Welcome!", ...)

    return enrollment

# ✅ Good - each function does one thing
def validate_enrollment_eligibility(user, course):
    if not user.is_active:
        raise UserInactiveError()
    if course.is_full:
        raise CourseFullError()

def process_enrollment(user, course, payment_info):
    validate_enrollment_eligibility(user, course)
    payment = process_payment(payment_info)
    enrollment = create_enrollment(user, course)
    notify_user(user, enrollment)
    return enrollment
```

### Function Arguments

```python
# ❌ Bad - too many arguments
def create_course(title, description, price, category_id, instructor_id,
                  is_published, thumbnail_url, duration_hours, level):
    pass

# ✅ Good - use objects
@dataclass
class CourseData:
    title: str
    description: str
    price: Decimal
    category_id: int
    instructor_id: int
    is_published: bool = False
    thumbnail_url: str = ""
    duration_hours: int = 0
    level: str = "beginner"

def create_course(data: CourseData):
    pass
```

### Return Early

```python
# ❌ Bad - nested conditionals
def get_discount(user, course):
    discount = 0
    if user is not None:
        if user.is_premium:
            if course.has_discount:
                discount = course.discount_percent
            else:
                discount = 10
        else:
            if user.is_student:
                discount = 20
    return discount

# ✅ Good - return early
def get_discount(user, course):
    if user is None:
        return 0

    if user.is_student:
        return 20

    if user.is_premium:
        return course.discount_percent if course.has_discount else 10

    return 0
```

---

## 🏛️ CLASSES

### Cohesion

```python
# ❌ Bad - low cohesion, unrelated methods
class UserManager:
    def create_user(self): pass
    def send_email(self): pass
    def process_payment(self): pass
    def generate_report(self): pass

# ✅ Good - high cohesion
class UserService:
    def create_user(self): pass
    def update_user(self): pass
    def deactivate_user(self): pass

class EmailService:
    def send_email(self): pass
    def send_bulk_email(self): pass

class PaymentService:
    def process_payment(self): pass
    def refund_payment(self): pass
```

### Encapsulation

```python
# ❌ Bad - exposing internals
class User:
    def __init__(self):
        self.password = ""  # Public!

user.password = "plain_text"  # Direct access

# ✅ Good - hide implementation
class User:
    def __init__(self):
        self._password_hash = ""

    def set_password(self, plain_password: str):
        self._password_hash = hash_password(plain_password)

    def verify_password(self, plain_password: str) -> bool:
        return verify_hash(plain_password, self._password_hash)
```

---

## 💬 COMMENTS & DOCUMENTATION

### When to Comment

```python
# ❌ Bad - obvious comment
# Increment counter by 1
counter += 1

# ❌ Bad - outdated comment
# Returns user name
def get_user_email():  # Comment is wrong!
    pass

# ✅ Good - explains "why"
# Using retry because payment gateway occasionally times out
@retry(max_attempts=3)
def process_payment():
    pass

# ✅ Good - explains complex logic
# Fibonacci sequence uses golden ratio approximation for O(1) lookup
def fib(n):
    phi = (1 + math.sqrt(5)) / 2
    return round(phi ** n / math.sqrt(5))
```

### Docstrings

```python
def calculate_course_completion_rate(user_id: int, course_id: int) -> float:
    """
    Calculate the completion percentage for a user's course enrollment.

    Args:
        user_id: The ID of the enrolled user.
        course_id: The ID of the course.

    Returns:
        A float between 0.0 and 1.0 representing completion percentage.

    Raises:
        EnrollmentNotFoundError: If user is not enrolled in the course.

    Example:
        >>> calculate_course_completion_rate(123, 456)
        0.75
    """
    pass
```

---

## ⚠️ ERROR HANDLING

### Specific Exceptions

```python
# ❌ Bad - catching everything
try:
    process_payment()
except Exception:
    pass  # Silent failure!

# ✅ Good - specific exceptions
try:
    process_payment()
except PaymentDeclinedError as e:
    logger.warning(f"Payment declined: {e}")
    raise
except PaymentGatewayError as e:
    logger.error(f"Gateway error: {e}")
    raise ServiceUnavailableError()
```

### Custom Exceptions

```python
class ApplicationError(Exception):
    """Base exception for application errors."""
    pass

class EnrollmentError(ApplicationError):
    """Errors related to course enrollment."""
    pass

class DuplicateEnrollmentError(EnrollmentError):
    """User already enrolled in this course."""
    pass

class CourseCapacityError(EnrollmentError):
    """Course has reached maximum capacity."""
    pass
```

---

## 📏 CODE FORMATTING

### Consistency

```python
# Use formatters: Black (Python), dart format (Dart)
# Configure in pyproject.toml or analysis_options.yaml

# settings.json (VS Code)
{
    "editor.formatOnSave": true,
    "[python]": {
        "editor.defaultFormatter": "ms-python.black-formatter"
    }
}
```

### Line Length

```python
# ❌ Bad - too long
result = some_function(very_long_argument_name, another_long_argument, yet_another_argument, final_argument)

# ✅ Good - readable
result = some_function(
    very_long_argument_name,
    another_long_argument,
    yet_another_argument,
    final_argument,
)
```

---

## 🔷 SOLID PRINCIPLES

### S - Single Responsibility

```python
# Each class has one reason to change
class UserValidator:
    def validate(self, user): pass

class UserRepository:
    def save(self, user): pass

class UserNotifier:
    def notify(self, user, message): pass
```

### O - Open/Closed

```python
# Open for extension, closed for modification
class PaymentProcessor(ABC):
    @abstractmethod
    def process(self, amount: Decimal): pass

class CreditCardProcessor(PaymentProcessor):
    def process(self, amount): pass

class PayPalProcessor(PaymentProcessor):
    def process(self, amount): pass

# Add new payment types without modifying existing code
```

### L - Liskov Substitution

```python
# Subtypes must be substitutable for their base types
class Bird(ABC):
    @abstractmethod
    def move(self): pass

class Sparrow(Bird):
    def move(self):
        return self.fly()

class Penguin(Bird):
    def move(self):
        return self.swim()  # Still moves, just differently
```

### I - Interface Segregation

```python
# ❌ Bad - fat interface
class Worker(ABC):
    @abstractmethod
    def work(self): pass
    @abstractmethod
    def eat(self): pass  # Robots don't eat!

# ✅ Good - segregated interfaces
class Workable(ABC):
    @abstractmethod
    def work(self): pass

class Eatable(ABC):
    @abstractmethod
    def eat(self): pass

class Human(Workable, Eatable):
    def work(self): pass
    def eat(self): pass

class Robot(Workable):
    def work(self): pass
```

### D - Dependency Inversion

```python
# Depend on abstractions, not concrete implementations
class NotificationService:
    def __init__(self, sender: MessageSender):  # Interface
        self._sender = sender

    def notify(self, user, message):
        self._sender.send(user.email, message)

# Can inject any sender that implements MessageSender
service = NotificationService(EmailSender())
service = NotificationService(SMSSender())
service = NotificationService(PushNotificationSender())
```

---

## 🔄 REFACTORING TRIGGERS

| Code Smell                | Refactoring                   |
| ------------------------- | ----------------------------- |
| Long function (>20 lines) | Extract method                |
| Duplicate code            | Extract to shared function    |
| Long parameter list       | Introduce parameter object    |
| Deep nesting              | Extract method, return early  |
| Comments explaining code  | Rename to be self-documenting |
| Dead code                 | Delete it                     |
| Magic numbers             | Extract to named constant     |

---

## 💎 CLEAN CODE GOLDEN RULES

1. **Code is read more than written** - Optimize for reading
2. **Boy Scout Rule** - Leave code cleaner than you found it
3. **DRY (Don't Repeat Yourself)** - One source of truth
4. **YAGNI (You Ain't Gonna Need It)** - Don't over-engineer
5. **KISS (Keep It Simple, Stupid)** - Simplest solution that works

---

**SINGULARITY ENGINE v16.0**  
_"Clean code reads like well-written prose."_

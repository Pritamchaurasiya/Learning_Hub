# 🧪 TESTING STRATEGIES: FROM UNIT TO PRODUCTION

## Comprehensive Testing for Full-Stack Applications

---

## 📋 TABLE OF CONTENTS

1. [Testing Pyramid](#-testing-pyramid)
2. [Unit Testing](#-unit-testing)
3. [Integration Testing](#-integration-testing)
4. [End-to-End Testing](#-end-to-end-testing)
5. [Performance Testing](#-performance-testing)
6. [Security Testing](#-security-testing)
7. [Flutter Testing](#-flutter-testing)
8. [CI/CD Integration](#-cicd-integration)

---

## 🔺 TESTING PYRAMID

```
                    ╱╲
                   ╱  ╲
                  ╱ E2E╲      ← Slow, Expensive, Few
                 ╱──────╲
                ╱        ╲
               ╱Integration╲   ← Medium Speed, Medium Cost
              ╱────────────╲
             ╱              ╲
            ╱  Unit Tests    ╲  ← Fast, Cheap, Many
           ╱──────────────────╲
```

### Test Distribution

| Type        | Coverage | Speed             | Cost   |
| ----------- | -------- | ----------------- | ------ |
| Unit        | 70%      | Fast (<1ms)       | Low    |
| Integration | 20%      | Medium (100ms-1s) | Medium |
| E2E         | 10%      | Slow (seconds)    | High   |

---

## 🧪 UNIT TESTING

### Django Unit Tests

```python
# tests/test_models.py
import pytest
from django.test import TestCase
from apps.users.models import User

@pytest.mark.django_db
class TestUserModel:
    def test_create_user(self):
        """Test user creation with valid data."""
        user = User.objects.create_user(
            email="test@example.com",
            password="securepass123"
        )
        assert user.email == "test@example.com"
        assert user.check_password("securepass123")
        assert not user.is_staff

    def test_create_superuser(self):
        """Test superuser has proper privileges."""
        admin = User.objects.create_superuser(
            email="admin@example.com",
            password="adminpass123"
        )
        assert admin.is_staff
        assert admin.is_superuser

    def test_email_normalized(self):
        """Test email is normalized to lowercase."""
        user = User.objects.create_user(
            email="Test@EXAMPLE.com",
            password="pass123"
        )
        assert user.email == "test@example.com"

    def test_invalid_email_raises_error(self):
        """Test that blank email raises ValueError."""
        with pytest.raises(ValueError):
            User.objects.create_user(email="", password="pass123")
```

### Testing Services

```python
# tests/test_services.py
import pytest
from unittest.mock import Mock, patch
from apps.gamification.services import GamificationService
from apps.gamification.models import UserXP

@pytest.mark.django_db
class TestGamificationService:
    @pytest.fixture
    def user(self, db):
        return User.objects.create_user(
            email="test@example.com",
            password="pass123"
        )

    def test_add_xp_creates_record_if_not_exists(self, user):
        """Test XP addition creates UserXP record."""
        result = GamificationService.add_xp(user, 100, "test_action")

        user_xp = UserXP.objects.get(user=user)
        assert user_xp.total_xp == 100
        assert result["new_xp"] == 100

    def test_add_xp_accumulates(self, user):
        """Test XP accumulates correctly."""
        GamificationService.add_xp(user, 100, "first")
        GamificationService.add_xp(user, 50, "second")

        user_xp = UserXP.objects.get(user=user)
        assert user_xp.total_xp == 150

    @patch('apps.gamification.services.cache')
    def test_leaderboard_uses_cache(self, mock_cache, user):
        """Test leaderboard retrieval uses caching."""
        mock_cache.get.return_value = [{"rank": 1, "username": "test"}]

        result = GamificationService.get_leaderboard()

        mock_cache.get.assert_called_once()
        assert len(result) == 1
```

### Fixtures & Factories

```python
# conftest.py
import pytest
from pytest_factoryboy import register
from tests.factories import UserFactory, CourseFactory

register(UserFactory)
register(CourseFactory)

@pytest.fixture
def api_client():
    from rest_framework.test import APIClient
    return APIClient()

@pytest.fixture
def authenticated_client(api_client, user):
    api_client.force_authenticate(user=user)
    return api_client

# factories.py
import factory
from apps.users.models import User
from apps.courses.models import Course

class UserFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = User

    email = factory.Sequence(lambda n: f"user{n}@example.com")
    password = factory.PostGenerationMethodCall('set_password', 'testpass123')
    is_active = True

class CourseFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Course

    title = factory.Faker('sentence', nb_words=4)
    slug = factory.LazyAttribute(lambda obj: slugify(obj.title))
    instructor = factory.SubFactory(UserFactory)
    is_published = True
```

---

## 🔗 INTEGRATION TESTING

### API Integration Tests

```python
# tests/test_api.py
import pytest
from rest_framework import status

@pytest.mark.django_db
class TestCourseAPI:
    def test_list_courses_authenticated(self, authenticated_client, course):
        """Test authenticated users can list courses."""
        response = authenticated_client.get('/api/v1/courses/')

        assert response.status_code == status.HTTP_200_OK
        assert response.data['status'] == 'success'
        assert len(response.data['data']) >= 1

    def test_list_courses_unauthenticated(self, api_client):
        """Test unauthenticated access is denied."""
        response = api_client.get('/api/v1/courses/')

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_enroll_course(self, authenticated_client, course):
        """Test user can enroll in a course."""
        response = authenticated_client.post(
            f'/api/v1/courses/{course.slug}/enroll/'
        )

        assert response.status_code == status.HTTP_201_CREATED
        assert Enrollment.objects.filter(
            user=authenticated_client.user,
            course=course
        ).exists()

    def test_cannot_enroll_twice(self, authenticated_client, course, enrollment):
        """Test duplicate enrollment is rejected."""
        response = authenticated_client.post(
            f'/api/v1/courses/{course.slug}/enroll/'
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST
```

### Database Integration

```python
# tests/test_database.py
import pytest
from django.db import transaction

@pytest.mark.django_db(transaction=True)
class TestDatabaseIntegration:
    def test_enrollment_updates_course_count(self, user, course):
        """Test enrollment increments course enrollment_count."""
        initial_count = course.enrollment_count

        Enrollment.objects.create(user=user, course=course)

        course.refresh_from_db()
        assert course.enrollment_count == initial_count + 1

    def test_cascade_delete(self, user):
        """Test user deletion cascades to related records."""
        course = CourseFactory(instructor=user)
        Enrollment.objects.create(user=user, course=course)

        user.delete()

        assert not Enrollment.objects.filter(course=course).exists()
```

---

## 🌐 END-TO-END TESTING

### Playwright for Web

```python
# e2e/test_login_flow.py
import pytest
from playwright.sync_api import Page, expect

@pytest.fixture
def page(browser):
    page = browser.new_page()
    yield page
    page.close()

class TestLoginFlow:
    def test_successful_login(self, page: Page):
        """Test complete login flow."""
        page.goto("http://localhost:3000/login")

        # Fill form
        page.fill('[data-testid="email-input"]', 'test@example.com')
        page.fill('[data-testid="password-input"]', 'password123')

        # Submit
        page.click('[data-testid="login-button"]')

        # Verify redirect to dashboard
        expect(page).to_have_url("/dashboard")
        expect(page.locator('[data-testid="welcome-message"]')).to_be_visible()

    def test_invalid_credentials(self, page: Page):
        """Test login with invalid credentials shows error."""
        page.goto("http://localhost:3000/login")

        page.fill('[data-testid="email-input"]', 'wrong@example.com')
        page.fill('[data-testid="password-input"]', 'wrongpass')
        page.click('[data-testid="login-button"]')

        # Verify error message
        expect(page.locator('[data-testid="error-message"]')).to_be_visible()
        expect(page.locator('[data-testid="error-message"]')).to_contain_text(
            "Invalid credentials"
        )
```

---

## ⚡ PERFORMANCE TESTING

### Load Testing with Locust

```python
# locustfile.py
from locust import HttpUser, task, between

class LearningHubUser(HttpUser):
    wait_time = between(1, 5)

    def on_start(self):
        """Login on start."""
        response = self.client.post("/api/v1/auth/login/", json={
            "email": "loadtest@example.com",
            "password": "testpass123"
        })
        self.token = response.json()["data"]["accessToken"]

    @task(3)
    def list_courses(self):
        """Browse courses (frequent)."""
        self.client.get(
            "/api/v1/courses/",
            headers={"Authorization": f"Bearer {self.token}"}
        )

    @task(1)
    def get_leaderboard(self):
        """Check leaderboard (less frequent)."""
        self.client.get(
            "/api/v1/gamification/leaderboard/",
            headers={"Authorization": f"Bearer {self.token}"}
        )

    @task(2)
    def view_course_detail(self):
        """View course details."""
        self.client.get(
            "/api/v1/courses/python-basics/",
            headers={"Authorization": f"Bearer {self.token}"}
        )
```

### Running Load Tests

```bash
# Run with 100 users, 10 spawn rate
locust -f locustfile.py --host=http://localhost:8000 -u 100 -r 10 --headless -t 5m
```

---

## 🔒 SECURITY TESTING

### OWASP Testing

```python
# tests/test_security.py
import pytest

class TestSecurityHeaders:
    def test_csrf_token_required(self, api_client):
        """Test CSRF protection is active."""
        # POST without CSRF token should fail for session auth
        response = api_client.post("/api/v1/auth/login/", json={
            "email": "test@example.com",
            "password": "pass123"
        })
        # For token auth, this should work; for session, it should fail

    def test_sql_injection_prevented(self, authenticated_client):
        """Test SQL injection is blocked."""
        malicious_input = "'; DROP TABLE users; --"
        response = authenticated_client.get(
            f"/api/v1/courses/?search={malicious_input}"
        )

        # Should not cause error, just return no results
        assert response.status_code in [200, 400]
        assert User.objects.exists()  # Table still exists

    def test_xss_escaped(self, authenticated_client, user):
        """Test XSS payloads are escaped."""
        xss_payload = "<script>alert('xss')</script>"

        response = authenticated_client.patch(
            "/api/v1/users/profile/",
            json={"display_name": xss_payload}
        )

        user.refresh_from_db()
        assert "<script>" not in user.display_name

class TestRateLimiting:
    def test_login_rate_limited(self, api_client):
        """Test login endpoint is rate limited."""
        for _ in range(10):
            api_client.post("/api/v1/auth/login/", json={
                "email": "wrong@example.com",
                "password": "wrongpass"
            })

        # 11th request should be rate limited
        response = api_client.post("/api/v1/auth/login/", json={
            "email": "wrong@example.com",
            "password": "wrongpass"
        })

        assert response.status_code == 429  # Too Many Requests
```

---

## 📱 FLUTTER TESTING

### Unit Tests

```dart
// test/services/auth_service_test.dart
import 'package:flutter_test/flutter_test.dart';
import 'package:mockito/mockito.dart';

class MockApiClient extends Mock implements ApiClient {}

void main() {
  group('AuthService', () {
    late AuthService authService;
    late MockApiClient mockApiClient;

    setUp(() {
      mockApiClient = MockApiClient();
      authService = AuthService(mockApiClient);
    });

    test('login returns user on success', () async {
      when(mockApiClient.post('/auth/login/', data: anyNamed('data')))
          .thenAnswer((_) async => Response(
            data: {
              'status': 'success',
              'data': {
                'user': {'id': '1', 'email': 'test@example.com'},
                'accessToken': 'token123',
                'refreshToken': 'refresh123',
              }
            },
          ));

      final user = await authService.login('test@example.com', 'pass123');

      expect(user.email, 'test@example.com');
    });

    test('login throws on invalid credentials', () async {
      when(mockApiClient.post('/auth/login/', data: anyNamed('data')))
          .thenThrow(DioException(
            response: Response(statusCode: 401, data: {}),
          ));

      expect(
        () => authService.login('wrong@example.com', 'wrong'),
        throwsA(isA<AuthException>()),
      );
    });
  });
}
```

### Widget Tests

```dart
// test/widgets/login_screen_test.dart
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

void main() {
  testWidgets('LoginScreen shows email and password fields', (tester) async {
    await tester.pumpWidget(
      ProviderScope(
        child: MaterialApp(home: LoginScreen()),
      ),
    );

    expect(find.byType(TextField), findsNWidgets(2));
    expect(find.text('Email'), findsOneWidget);
    expect(find.text('Password'), findsOneWidget);
  });

  testWidgets('LoginScreen validates empty fields', (tester) async {
    await tester.pumpWidget(
      ProviderScope(
        child: MaterialApp(home: LoginScreen()),
      ),
    );

    // Tap login without entering data
    await tester.tap(find.byKey(Key('login-button')));
    await tester.pump();

    expect(find.text('Email is required'), findsOneWidget);
    expect(find.text('Password is required'), findsOneWidget);
  });

  testWidgets('LoginScreen navigates on success', (tester) async {
    final mockAuthRepo = MockAuthRepository();
    when(mockAuthRepo.login(any, any))
        .thenAnswer((_) async => User.test());

    await tester.pumpWidget(
      ProviderScope(
        overrides: [
          authRepositoryProvider.overrideWithValue(mockAuthRepo),
        ],
        child: MaterialApp(
          home: LoginScreen(),
          routes: {'/home': (_) => HomeScreen()},
        ),
      ),
    );

    await tester.enterText(find.byKey(Key('email')), 'test@example.com');
    await tester.enterText(find.byKey(Key('password')), 'password123');
    await tester.tap(find.byKey(Key('login-button')));
    await tester.pumpAndSettle();

    expect(find.byType(HomeScreen), findsOneWidget);
  });
}
```

### Integration Tests

```dart
// integration_test/app_test.dart
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  testWidgets('Full login and course browsing flow', (tester) async {
    await tester.pumpWidget(MyApp());
    await tester.pumpAndSettle();

    // Navigate to login
    await tester.tap(find.text('Login'));
    await tester.pumpAndSettle();

    // Login
    await tester.enterText(find.byKey(Key('email')), 'test@example.com');
    await tester.enterText(find.byKey(Key('password')), 'password123');
    await tester.tap(find.text('Sign In'));
    await tester.pumpAndSettle();

    // Verify on home screen
    expect(find.text('Welcome'), findsOneWidget);

    // Browse courses
    await tester.tap(find.text('Courses'));
    await tester.pumpAndSettle();

    expect(find.byType(CourseCard), findsWidgets);
  });
}
```

---

## 🔄 CI/CD INTEGRATION

### GitHub Actions

```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  backend-tests:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v4

      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: "3.11"

      - name: Install dependencies
        run: pip install -r requirements.txt

      - name: Run tests with coverage
        run: pytest --cov=apps --cov-report=xml

      - name: Upload coverage
        uses: codecov/codecov-action@v3

  frontend-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up Flutter
        uses: subosito/flutter-action@v2
        with:
          flutter-version: "3.16.0"

      - name: Get dependencies
        run: flutter pub get

      - name: Analyze
        run: flutter analyze

      - name: Run tests
        run: flutter test --coverage
```

---

## 💎 TESTING GOLDEN RULES

1. **Test behavior, not implementation** - Focus on what, not how
2. **Fast tests are run tests** - Slow tests get skipped
3. **Isolated tests** - No dependencies between tests
4. **Readable tests** - Tests are documentation
5. **One assertion per test** - Single reason to fail
6. **Test edge cases** - Empty, null, max, min
7. **Mock external services** - Don't hit real APIs

---

**SINGULARITY ENGINE v16.0**  
_"Untested code is broken code you haven't discovered yet."_

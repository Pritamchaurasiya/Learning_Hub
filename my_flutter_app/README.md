# My Flutter App - Enhanced Learning Platform

A production-grade, feature-rich Flutter application designed for learning management, built with a robust architecture and advanced features.

## 🚀 Key Features

### Core Functionality

- **Course Management**: Browsing, details, and enrollment simulation.
- **Authentication**: Secure login/register flow with `flutter_secure_storage`.
- **Offline Support**: Full offline capability using `internet_connection_checker` and `connectivity_wrapper`.
- **Advanced Networking**: Resilient API client with retry policies (`dio_smart_retry`) and functional error handling (`fpdart`).

### Architecture & Quality

- **State Management**: Using `riverpod` for clean, testable state management.
- **Error Handling**: Standardized `Either<Failure, T>` return types for predictable error flows.
- **Logging**: Centralized `AppLogger` for consistent observability.
- **Testing**: Comprehensive unit and integration tests (`integration_test/app_test.dart`).

## 🛠️ Tech Stack

- **Flutter**: UI Framework
- **Riverpod**: State Management
- **Dio**: Networking
- **Freezed**: Immutable Data Classes (Planned)
- **GoRouter**: Navigation
- **Flutter Secure Storage**: Secure Data Persistence
- **Logger**: Advanced Logging

## 🔧 Setup & Installation

1.  **Clone the repository**:

    ```bash
    git clone https://github.com/yourusername/my_flutter_app.git
    ```

2.  **Install Dependencies**:

    ```bash
    flutter pub get
    ```

3.  **Run the App**:
    ```bash
    flutter run
    ```

## 🧪 Testing

Run unit tests:

```bash
flutter test
```

Run integration tests:

```bash
flutter test integration_test/app_test.dart
```

## 📈 DevOps

- **CI/CD**: GitHub Actions workflow included in `.github/workflows/flutter_ci.yml`.
- **Analysis**: Strict linting enabled via `analysis_options.yaml`.

---

_Built with ❤️ by Project Anti-Gravity_

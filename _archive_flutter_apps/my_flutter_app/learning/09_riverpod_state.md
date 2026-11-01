# 💙 Module 9: Flutter State Management (Riverpod)

## 9.1 Why Riverpod?

### Problems with Other Solutions

- **setState**: Doesn't scale. State scattered everywhere.
- **Provider**: Global state is messy. No compile-time safety.
- **BLoC**: Verbose. Too much boilerplate.

### Riverpod Advantages

- **Compile-time safety**: Errors caught before runtime.
- **Testable**: Easy to mock providers.
- **No BuildContext required**: Access state anywhere.

---

## 9.2 Core Concepts

### Provider Types

```dart
// Simple value
final helloProvider = Provider<String>((ref) => 'Hello World');

// Async data
final userProvider = FutureProvider<User>((ref) async {
  final api = ref.watch(apiClientProvider);
  return await api.getUser();
});

// Mutable state
final counterProvider = StateProvider<int>((ref) => 0);

// Complex state + logic
final authProvider = StateNotifierProvider<AuthNotifier, AuthState>((ref) {
  return AuthNotifier(ref.watch(authRepositoryProvider));
});
```

---

## 9.3 Real-World Auth Flow

```dart
// auth_controller.dart
final authControllerProvider = StateNotifierProvider<AuthController, AsyncValue<User?>>((ref) {
  return AuthController(ref.watch(authRepositoryProvider));
});

class AuthController extends StateNotifier<AsyncValue<User?>> {
  AuthController(this._repo) : super(const AsyncValue.data(null));
  final AuthRepository _repo;

  Future<void> login(String email, String password) async {
    state = const AsyncValue.loading();
    state = await AsyncValue.guard(() => _repo.login(email, password));
  }

  Future<void> logout() async {
    await _repo.logout();
    state = const AsyncValue.data(null);
  }
}
```

---

## 9.4 Consuming Providers in UI

```dart
class LoginScreen extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final authState = ref.watch(authControllerProvider);

    return authState.when(
      loading: () => const CircularProgressIndicator(),
      error: (e, _) => Text('Error: $e'),
      data: (user) => user != null
          ? const HomeScreen()
          : const LoginForm(),
    );
  }
}
```

---

_Updated: 2026-01-06 (God Mode v7.0)_

# 📱 FLUTTER STATE MANAGEMENT: COMPLETE GUIDE

## From Basics to Advanced Patterns

---

## 📋 TABLE OF CONTENTS

1. [State Management Overview](#-state-management-overview)
2. [setState & ValueNotifier](#-setstate--valuenotifier)
3. [Provider](#-provider)
4. [Riverpod](#-riverpod)
5. [BLoC Pattern](#-bloc-pattern)
6. [Redux](#-redux)
7. [Comparison & When to Use](#-comparison--when-to-use)
8. [Best Practices](#-best-practices)

---

## 🧠 STATE MANAGEMENT OVERVIEW

### Types of State

```
┌─────────────────────────────────────────────────────────────┐
│                    Application State                         │
├─────────────────────────┬───────────────────────────────────┤
│      Ephemeral State    │         App State                 │
│      (Local/UI)         │         (Shared/Global)           │
├─────────────────────────┼───────────────────────────────────┤
│ - Text input            │ - User authentication             │
│ - Current tab           │ - Shopping cart                   │
│ - Animation state       │ - User preferences                │
│ - Form validation       │ - API data                        │
├─────────────────────────┼───────────────────────────────────┤
│ Use: setState           │ Use: Provider/Riverpod/BLoC       │
└─────────────────────────┴───────────────────────────────────┘
```

### Choosing a Solution

```
Simple app, 1-2 screens → setState
Medium app, shared state → Provider
Complex app, testability → Riverpod or BLoC
Large team, strict patterns → BLoC or Redux
```

---

## ⚡ SETSTATE & VALUENOTIFIER

### setState (Simplest)

```dart
class CounterWidget extends StatefulWidget {
  @override
  _CounterWidgetState createState() => _CounterWidgetState();
}

class _CounterWidgetState extends State<CounterWidget> {
  int _count = 0;

  void _increment() {
    setState(() {
      _count++;
    });
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Text('Count: $_count'),
        ElevatedButton(
          onPressed: _increment,
          child: Text('Increment'),
        ),
      ],
    );
  }
}
```

### ValueNotifier (Better Performance)

```dart
// Shared value that can be listened to
final counterNotifier = ValueNotifier<int>(0);

// Widget that rebuilds when value changes
class CounterDisplay extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return ValueListenableBuilder<int>(
      valueListenable: counterNotifier,
      builder: (context, count, child) {
        return Text('Count: $count');
      },
    );
  }
}

// Increment from anywhere
void increment() => counterNotifier.value++;
```

---

## 🎯 PROVIDER

### Setup

```yaml
# pubspec.yaml
dependencies:
  provider: ^6.0.0
```

### Basic Provider

```dart
// 1. Create a ChangeNotifier
class CartNotifier extends ChangeNotifier {
  final List<Product> _items = [];

  List<Product> get items => List.unmodifiable(_items);
  int get count => _items.length;
  double get total => _items.fold(0, (sum, p) => sum + p.price);

  void add(Product product) {
    _items.add(product);
    notifyListeners();  // 🔔 Trigger rebuild
  }

  void remove(Product product) {
    _items.remove(product);
    notifyListeners();
  }

  void clear() {
    _items.clear();
    notifyListeners();
  }
}

// 2. Provide it at the top
void main() {
  runApp(
    ChangeNotifierProvider(
      create: (_) => CartNotifier(),
      child: MyApp(),
    ),
  );
}

// 3. Consume anywhere below
class CartIcon extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final cart = context.watch<CartNotifier>();
    return Badge(
      label: Text('${cart.count}'),
      child: Icon(Icons.shopping_cart),
    );
  }
}

// 4. Trigger actions
class ProductCard extends StatelessWidget {
  final Product product;

  @override
  Widget build(BuildContext context) {
    return ElevatedButton(
      onPressed: () {
        context.read<CartNotifier>().add(product);
      },
      child: Text('Add to Cart'),
    );
  }
}
```

### Multiple Providers

```dart
void main() {
  runApp(
    MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AuthNotifier()),
        ChangeNotifierProvider(create: (_) => CartNotifier()),
        ChangeNotifierProvider(create: (_) => ThemeNotifier()),
      ],
      child: MyApp(),
    ),
  );
}
```

---

## 🚀 RIVERPOD

### Setup

```yaml
dependencies:
  flutter_riverpod: ^2.4.0
```

### Provider Types

```dart
import 'package:flutter_riverpod/flutter_riverpod.dart';

// 1. Simple Provider (constant value)
final apiBaseUrlProvider = Provider<String>((ref) => 'https://api.example.com');

// 2. StateProvider (simple mutable state)
final counterProvider = StateProvider<int>((ref) => 0);

// 3. StateNotifierProvider (complex state)
final cartProvider = StateNotifierProvider<CartNotifier, CartState>((ref) {
  return CartNotifier();
});

// 4. FutureProvider (async data)
final userProvider = FutureProvider<User>((ref) async {
  final api = ref.watch(apiClientProvider);
  return api.getUser();
});

// 5. StreamProvider (reactive data)
final messagesProvider = StreamProvider<List<Message>>((ref) {
  final socket = ref.watch(socketProvider);
  return socket.messageStream;
});
```

### Usage

```dart
// Wrap app with ProviderScope
void main() {
  runApp(ProviderScope(child: MyApp()));
}

// Consume in widgets
class CounterWidget extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final count = ref.watch(counterProvider);

    return Column(
      children: [
        Text('Count: $count'),
        ElevatedButton(
          onPressed: () => ref.read(counterProvider.notifier).state++,
          child: Text('Increment'),
        ),
      ],
    );
  }
}
```

### AsyncValue Handling

```dart
class UserProfile extends ConsumerWidget {
  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final userAsync = ref.watch(userProvider);

    return userAsync.when(
      loading: () => CircularProgressIndicator(),
      error: (error, stack) => Text('Error: $error'),
      data: (user) => Column(
        children: [
          Text(user.name),
          Text(user.email),
        ],
      ),
    );
  }
}
```

### StateNotifier (Complex State)

```dart
// State class (immutable)
@freezed
class CartState with _$CartState {
  const factory CartState({
    @Default([]) List<Product> items,
    @Default(false) bool isLoading,
    String? error,
  }) = _CartState;
}

// Notifier class
class CartNotifier extends StateNotifier<CartState> {
  CartNotifier() : super(const CartState());

  void addItem(Product product) {
    state = state.copyWith(
      items: [...state.items, product],
    );
  }

  void removeItem(Product product) {
    state = state.copyWith(
      items: state.items.where((p) => p.id != product.id).toList(),
    );
  }

  Future<void> checkout() async {
    state = state.copyWith(isLoading: true);
    try {
      await paymentService.process(state.items);
      state = state.copyWith(items: [], isLoading: false);
    } catch (e) {
      state = state.copyWith(error: e.toString(), isLoading: false);
    }
  }
}
```

---

## 🧱 BLOC PATTERN

### Setup

```yaml
dependencies:
  flutter_bloc: ^8.1.0
  bloc: ^8.1.0
```

### Core Concepts

```
        ┌─────────────────────────────────────────┐
        │                  BLoC                    │
        │                                          │
Events ──►│  mapEventToState()  ──►  New State    │
        │                                          │
        └─────────────────────────────────────────┘
                          │
                          ▼
                   StreamBuilder
                   (rebuilds UI)
```

### Implementation

```dart
// 1. Events
abstract class AuthEvent {}

class LoginRequested extends AuthEvent {
  final String email;
  final String password;
  LoginRequested(this.email, this.password);
}

class LogoutRequested extends AuthEvent {}

// 2. States
abstract class AuthState {}

class AuthInitial extends AuthState {}
class AuthLoading extends AuthState {}
class AuthSuccess extends AuthState {
  final User user;
  AuthSuccess(this.user);
}
class AuthFailure extends AuthState {
  final String message;
  AuthFailure(this.message);
}

// 3. BLoC
class AuthBloc extends Bloc<AuthEvent, AuthState> {
  final AuthRepository _authRepository;

  AuthBloc(this._authRepository) : super(AuthInitial()) {
    on<LoginRequested>(_onLoginRequested);
    on<LogoutRequested>(_onLogoutRequested);
  }

  Future<void> _onLoginRequested(
    LoginRequested event,
    Emitter<AuthState> emit,
  ) async {
    emit(AuthLoading());
    try {
      final user = await _authRepository.login(event.email, event.password);
      emit(AuthSuccess(user));
    } catch (e) {
      emit(AuthFailure(e.toString()));
    }
  }

  Future<void> _onLogoutRequested(
    LogoutRequested event,
    Emitter<AuthState> emit,
  ) async {
    await _authRepository.logout();
    emit(AuthInitial());
  }
}
```

### UI Integration

```dart
// Provide BLoC
void main() {
  runApp(
    BlocProvider(
      create: (_) => AuthBloc(AuthRepository()),
      child: MyApp(),
    ),
  );
}

// Consume with BlocBuilder
class LoginScreen extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return BlocConsumer<AuthBloc, AuthState>(
      listener: (context, state) {
        if (state is AuthFailure) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text(state.message)),
          );
        }
        if (state is AuthSuccess) {
          Navigator.pushReplacementNamed(context, '/home');
        }
      },
      builder: (context, state) {
        if (state is AuthLoading) {
          return Center(child: CircularProgressIndicator());
        }

        return LoginForm(
          onSubmit: (email, password) {
            context.read<AuthBloc>().add(LoginRequested(email, password));
          },
        );
      },
    );
  }
}
```

---

## 🔄 REDUX

### Setup

```yaml
dependencies:
  flutter_redux: ^0.10.0
  redux: ^5.0.0
```

### Implementation

```dart
// 1. State
@immutable
class AppState {
  final int counter;
  final User? user;

  AppState({this.counter = 0, this.user});

  AppState copyWith({int? counter, User? user}) {
    return AppState(
      counter: counter ?? this.counter,
      user: user ?? this.user,
    );
  }
}

// 2. Actions
class IncrementAction {}
class DecrementAction {}
class SetUserAction {
  final User user;
  SetUserAction(this.user);
}

// 3. Reducer
AppState appReducer(AppState state, dynamic action) {
  if (action is IncrementAction) {
    return state.copyWith(counter: state.counter + 1);
  }
  if (action is DecrementAction) {
    return state.copyWith(counter: state.counter - 1);
  }
  if (action is SetUserAction) {
    return state.copyWith(user: action.user);
  }
  return state;
}

// 4. Store
final store = Store<AppState>(appReducer, initialState: AppState());

// 5. Provide & Consume
void main() {
  runApp(
    StoreProvider<AppState>(
      store: store,
      child: MyApp(),
    ),
  );
}

class CounterWidget extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return StoreConnector<AppState, int>(
      converter: (store) => store.state.counter,
      builder: (context, counter) {
        return Text('Count: $counter');
      },
    );
  }
}
```

---

## 📊 COMPARISON & WHEN TO USE

| Solution     | Complexity | Learning | Testing   | Use Case       |
| ------------ | ---------- | -------- | --------- | -------------- |
| **setState** | Low        | Easy     | Manual    | Simple widgets |
| **Provider** | Medium     | Easy     | Good      | Most apps      |
| **Riverpod** | Medium     | Medium   | Excellent | Modern apps    |
| **BLoC**     | High       | Hard     | Excellent | Enterprise     |
| **Redux**    | High       | Hard     | Excellent | Large teams    |

### Decision Tree

```
Is state purely UI/local?
├─ YES → setState or ValueNotifier
└─ NO → Need to share state?
         ├─ NO → setState
         └─ YES → Need advanced features?
                  ├─ NO → Provider
                  └─ YES → Need strict separation?
                           ├─ NO → Riverpod
                           └─ YES → BLoC
```

---

## 💎 BEST PRACTICES

### 1. Keep State Immutable

```dart
// ❌ BAD: Mutating state
state.items.add(product);
notifyListeners();

// ✅ GOOD: Create new state
state = state.copyWith(
  items: [...state.items, product],
);
```

### 2. Minimize Rebuilds

```dart
// ❌ BAD: Rebuilds on any cart change
final cart = context.watch<CartNotifier>();
Text('Total: ${cart.total}');

// ✅ GOOD: Only rebuild when total changes
Selector<CartNotifier, double>(
  selector: (_, cart) => cart.total,
  builder: (_, total, __) => Text('Total: $total'),
);
```

### 3. Separate Business Logic

```dart
// ❌ BAD: Logic in widget
onPressed: () async {
  final response = await http.post('/cart/add', body: {...});
  if (response.statusCode == 200) {
    cart.add(product);
  }
}

// ✅ GOOD: Logic in notifier/bloc
onPressed: () => cart.addProduct(product)  // Notifier handles HTTP
```

### 4. Handle Loading & Error States

```dart
class DataState<T> {
  final T? data;
  final bool isLoading;
  final String? error;

  const DataState({this.data, this.isLoading = false, this.error});

  DataState<T> loading() => DataState(isLoading: true);
  DataState<T> success(T data) => DataState(data: data);
  DataState<T> failure(String error) => DataState(error: error);
}
```

---

**SINGULARITY ENGINE v16.0**  
_"State management is about choosing the right tool for your complexity level."_

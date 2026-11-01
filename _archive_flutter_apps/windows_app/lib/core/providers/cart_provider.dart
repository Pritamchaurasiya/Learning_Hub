import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:learning_hub/core/services/cart_service.dart';
import 'package:learning_hub/data/models/course_model.dart';

class CartState {
  final List<CartItem> items;
  final bool isLoading;
  final String? error;

  const CartState({
    this.items = const [],
    this.isLoading = false,
    this.error,
  });

  double get total => items.fold(0, (sum, item) => sum + item.price);

  CartState copyWith({
    List<CartItem>? items,
    bool? isLoading,
    String? error,
  }) {
    return CartState(
      items: items ?? this.items,
      isLoading: isLoading ?? this.isLoading,
      error: error,
    );
  }
}

class CartNotifier extends StateNotifier<CartState> {
  final CartService _service = CartService.instance;

  CartNotifier() : super(const CartState()) {
    _loadCart();
  }

  Future<void> _loadCart() async {
    state = state.copyWith(isLoading: true);
    try {
      final items = await _service.getCartItems();
      state = state.copyWith(items: items, isLoading: false);
    } catch (e) {
      state = state.copyWith(isLoading: false, error: e.toString());
    }
  }

  Future<void> addToCart(Course course) async {
    if (state.items.any((item) => item.courseId == course.id)) {
      return; // Already in cart
    }

    final newItem = CartItem.fromCourse(course);
    final newItems = [...state.items, newItem];

    state = state.copyWith(items: newItems);
    await _service.saveCartItems(newItems);
  }

  Future<void> removeFromCart(String courseId) async {
    final newItems = state.items.where((i) => i.courseId != courseId).toList();
    state = state.copyWith(items: newItems);
    await _service.saveCartItems(newItems);
  }

  Future<void> clearCart() async {
    state = state.copyWith(items: []);
    await _service.clearCart();
  }

  // Checkout simulation
  Future<bool> checkout() async {
    state = state.copyWith(isLoading: true);
    try {
      // Simulate API call
      await Future<void>.delayed(const Duration(seconds: 2));
      await clearCart();
      state = state.copyWith(isLoading: false);
      return true;
    } catch (e) {
      state = state.copyWith(isLoading: false, error: 'Checkout failed');
      return false;
    }
  }
}

final cartProvider = StateNotifierProvider<CartNotifier, CartState>((ref) {
  return CartNotifier();
});

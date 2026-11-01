import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:my_flutter_app/src/features/courses/domain/course_model.dart';

/// A single item in the shopping cart
class CartItem {
  const CartItem({required this.course, this.couponCode});
  final Course course;
  final String? couponCode;

  double get price => course.price;

  CartItem copyWith({String? couponCode}) {
    return CartItem(course: course, couponCode: couponCode ?? this.couponCode);
  }
}

/// Client-side cart state
class CartState {
  const CartState({
    this.items = const [],
    this.appliedCoupon,
    this.discountPercent = 0,
  });

  final List<CartItem> items;
  final String? appliedCoupon;
  final double discountPercent;

  double get subtotal => items.fold(0, (sum, item) => sum + item.price);
  double get discount => subtotal * discountPercent;
  double get total => subtotal - discount;
  int get itemCount => items.length;
  bool get isEmpty => items.isEmpty;

  bool containsCourse(String courseId) =>
      items.any((item) => item.course.id == courseId);

  CartState copyWith({
    List<CartItem>? items,
    String? appliedCoupon,
    double? discountPercent,
  }) {
    return CartState(
      items: items ?? this.items,
      appliedCoupon: appliedCoupon ?? this.appliedCoupon,
      discountPercent: discountPercent ?? this.discountPercent,
    );
  }
}

/// Manages the cart state
class CartNotifier extends StateNotifier<CartState> {
  CartNotifier() : super(const CartState());

  void addToCart(Course course) {
    if (state.containsCourse(course.id)) {
      return; // Prevent duplicates
    }
    state = state.copyWith(
      items: [...state.items, CartItem(course: course)],
    );
  }

  void removeFromCart(String courseId) {
    state = state.copyWith(
      items: state.items.where((item) => item.course.id != courseId).toList(),
    );
  }

  void clearCart() {
    state = const CartState();
  }

  /// Apply a coupon code. In a real app, this would validate against a backend.
  void applyCoupon(String code) {
    // Supported demo coupons
    final coupons = <String, double>{
      'SAVE20': 0.20,
      'SAVE10': 0.10,
      'HALFOFF': 0.50,
    };

    final discount = coupons[code.toUpperCase()];
    if (discount != null) {
      state = state.copyWith(
        appliedCoupon: code.toUpperCase(),
        discountPercent: discount,
      );
    }
  }

  void removeCoupon() {
    state = CartState(items: state.items);
  }
}

final cartProvider = StateNotifierProvider<CartNotifier, CartState>((ref) {
  return CartNotifier();
});

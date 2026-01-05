import 'dart:convert';
import 'package:learning_hub/data/models/course_model.dart';
import 'package:shared_preferences/shared_preferences.dart';

/// Item in the shopping cart
class CartItem {
  final String courseId;
  final String title;
  final String instructorName;
  final double price;
  final String? thumbnailUrl;

  const CartItem({
    required this.courseId,
    required this.title,
    required this.instructorName,
    required this.price,
    this.thumbnailUrl,
  });

  Map<String, dynamic> toJson() => {
        'courseId': courseId,
        'title': title,
        'instructorName': instructorName,
        'price': price,
        'thumbnailUrl': thumbnailUrl,
      };

  factory CartItem.fromJson(Map<String, dynamic> json) => CartItem(
        courseId: json['courseId'] as String,
        title: json['title'] as String,
        instructorName: json['instructorName'] as String,
        price: (json['price'] as num).toDouble(),
        thumbnailUrl: json['thumbnailUrl'] as String?,
      );

  factory CartItem.fromCourse(Course course) => CartItem(
        courseId: course.id,
        title: course.title,
        instructorName: course.instructorName,
        price: course.price,
        thumbnailUrl: course.thumbnailUrl,
      );
}

class CartService {
  static const String _cartKey = 'user_cart_items';

  CartService._();
  static final CartService instance = CartService._();

  Future<List<CartItem>> getCartItems() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final String? jsonString = prefs.getString(_cartKey);
      if (jsonString == null) return [];

      final List<dynamic> jsonList = jsonDecode(jsonString) as List<dynamic>;
      return jsonList
          .map((e) => CartItem.fromJson(e as Map<String, dynamic>))
          .toList();
    } catch (e) {
      return [];
    }
  }

  Future<void> saveCartItems(List<CartItem> items) async {
    final prefs = await SharedPreferences.getInstance();
    final String jsonString = jsonEncode(items.map((e) => e.toJson()).toList());
    await prefs.setString(_cartKey, jsonString);
  }

  Future<void> clearCart() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_cartKey);
  }
}

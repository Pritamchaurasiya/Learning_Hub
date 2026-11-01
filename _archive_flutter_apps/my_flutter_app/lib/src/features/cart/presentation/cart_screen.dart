import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_animate/flutter_animate.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:my_flutter_app/src/features/analytics/data/analytics_repository.dart';
import 'package:my_flutter_app/src/features/auth/presentation/auth_controller.dart';
import 'package:my_flutter_app/src/features/cart/data/cart_repository.dart';
import 'package:my_flutter_app/src/features/payments/services/payment_service.dart';

class ShoppingCartScreen extends ConsumerStatefulWidget {
  const ShoppingCartScreen({super.key});

  @override
  ConsumerState<ShoppingCartScreen> createState() => _ShoppingCartScreenState();
}

class _ShoppingCartScreenState extends ConsumerState<ShoppingCartScreen> {
  final _couponController = TextEditingController();
  bool _isProcessing = false;
  StreamSubscription<PaymentStatus>? _paymentSub;

  @override
  void initState() {
    super.initState();
    // Listen to payment outcomes
    _paymentSub =
        ref.read(paymentServiceProvider).paymentResult.listen((status) {
      if (!mounted) {
        return;
      }
      if (status == PaymentStatus.success) {
        _onPaymentSuccess();
      } else if (status == PaymentStatus.failed) {
        _onPaymentFailed();
      }
    });
  }

  @override
  void dispose() {
    _couponController.dispose();
    _paymentSub?.cancel();
    super.dispose();
  }

  void _onPaymentSuccess() {
    // Track purchase for AI Heatmap
    final cart = ref.read(cartProvider);
    for (final item in cart.items) {
      ref.read(analyticsRepositoryProvider).trackActivity(
        action: 'completed_purchase',
        contentType: 'course',
        objectId: int.tryParse(item.course.id),
        metadata: {'course_title': item.course.title},
      );
    }
    // Clear cart
    ref.read(cartProvider.notifier).clearCart();
    setState(() => _isProcessing = false);
    // Show success dialog
    showDialog<void>(
      context: context,
      builder: (ctx) => AlertDialog(
        icon: const Icon(Icons.check_circle, color: Colors.green, size: 64),
        title: Text('Payment Successful!',
            style: GoogleFonts.outfit(fontWeight: FontWeight.bold)),
        content: Text(
          'You have been enrolled successfully. Start learning now!',
          style: GoogleFonts.outfit(),
          textAlign: TextAlign.center,
        ),
        actions: [
          FilledButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Start Learning'),
          ),
        ],
      ),
    );
  }

  void _onPaymentFailed() {
    setState(() => _isProcessing = false);
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: const Text('Payment failed. Please try again.'),
        backgroundColor: Colors.red[700],
      ),
    );
  }

  Future<void> _checkout() async {
    final cart = ref.read(cartProvider);
    if (cart.isEmpty) {
      return;
    }

    setState(() => _isProcessing = true);

    // Process the first item (Razorpay single-order model)
    final firstItem = cart.items.first;
    final courseId = int.tryParse(firstItem.course.id) ?? 0;

    try {
      await ref.read(paymentServiceProvider).startPayment(
            courseId: courseId,
            userEmail: ref.read(authControllerProvider).value?.email ?? '',
            userPhone: '',
            couponCode: cart.appliedCoupon,
          );
    } on Exception catch (e) {
      if (mounted) {
        setState(() => _isProcessing = false);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Checkout error: $e')),
        );
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final cart = ref.watch(cartProvider);

    return Scaffold(
      backgroundColor: const Color(0xFF0F172A),
      appBar: AppBar(
        title: Text(
          'Shopping Cart',
          style: GoogleFonts.outfit(
            fontWeight: FontWeight.bold,
            color: Colors.white,
          ),
        ),
        backgroundColor: Colors.transparent,
        elevation: 0,
        foregroundColor: Colors.white,
        actions: [
          Padding(
            padding: const EdgeInsets.only(right: 16),
            child: Center(
              child: Text(
                '${cart.itemCount} Items',
                style: GoogleFonts.outfit(
                  color: const Color(0xFF3B82F6),
                  fontWeight: FontWeight.w600,
                ),
              ),
            ),
          ),
        ],
      ),
      body: cart.isEmpty
          ? _buildEmptyState()
          : SingleChildScrollView(
              padding: const EdgeInsets.all(20),
              child: Column(
                children: [
                  // Cart Items
                  ...cart.items
                      .map((item) => _CartItemCard(
                            item: item,
                            onRemove: () => ref
                                .read(cartProvider.notifier)
                                .removeFromCart(item.course.id),
                          ))
                      .toList()
                      .animate(interval: 100.ms)
                      .fadeIn()
                      .slideX(),

                  const SizedBox(height: 24),

                  // Coupon
                  _CouponSection(
                    controller: _couponController,
                    appliedCoupon: cart.appliedCoupon,
                    onApply: () {
                      final code = _couponController.text.trim();
                      if (code.isNotEmpty) {
                        ref.read(cartProvider.notifier).applyCoupon(code);
                      }
                    },
                    onRemove: () {
                      _couponController.clear();
                      ref.read(cartProvider.notifier).removeCoupon();
                    },
                  ).animate().fadeIn(delay: 300.ms),

                  const SizedBox(height: 24),

                  // Order Summary
                  _OrderSummary(
                    subtotal: cart.subtotal,
                    discount: cart.discount,
                    total: cart.total,
                    discountLabel: cart.appliedCoupon != null
                        ? 'Discount (${cart.appliedCoupon})'
                        : null,
                  ).animate().fadeIn(delay: 400.ms),

                  const SizedBox(height: 32),

                  // Checkout Button
                  SizedBox(
                    width: double.infinity,
                    height: 56,
                    child: FilledButton(
                      onPressed: _isProcessing ? null : _checkout,
                      style: FilledButton.styleFrom(
                        backgroundColor: const Color(0xFF3B82F6),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                        elevation: 4,
                        shadowColor:
                            const Color(0xFF3B82F6).withValues(alpha: 0.4),
                      ),
                      child: _isProcessing
                          ? const SizedBox(
                              width: 24,
                              height: 24,
                              child: CircularProgressIndicator(
                                  color: Colors.white, strokeWidth: 2),
                            )
                          : Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Text(
                                  'Proceed to Checkout',
                                  style: GoogleFonts.outfit(
                                    fontSize: 16,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                                const SizedBox(width: 8),
                                const Icon(Icons.arrow_forward),
                              ],
                            ),
                    ),
                  ).animate().fadeIn(delay: 500.ms).slideY(begin: 0.2),

                  const SizedBox(height: 16),

                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(Icons.lock_outline,
                          size: 12, color: Colors.grey),
                      const SizedBox(width: 4),
                      Text(
                        'SECURE SSL ENCRYPTED CHECKOUT',
                        style: GoogleFonts.outfit(
                          fontSize: 10,
                          color: Colors.grey,
                          fontWeight: FontWeight.w600,
                          letterSpacing: 1,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
    );
  }

  Widget _buildEmptyState() {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.shopping_cart_outlined,
              size: 80, color: Colors.white.withValues(alpha: 0.15)),
          const SizedBox(height: 16),
          Text(
            'Your cart is empty',
            style: GoogleFonts.outfit(
              fontSize: 20,
              fontWeight: FontWeight.bold,
              color: Colors.white70,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Browse courses and add them to your cart',
            style: GoogleFonts.outfit(color: Colors.white38),
          ),
        ],
      ),
    ).animate().fadeIn().scale(begin: const Offset(0.9, 0.9));
  }
}

class _CartItemCard extends StatelessWidget {
  const _CartItemCard({required this.item, required this.onRemove});

  final CartItem item;
  final VoidCallback onRemove;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: const Color(0xFF1E293B),
        borderRadius: BorderRadius.circular(16),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.2),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Row(
        children: [
          Container(
            height: 64,
            width: 64,
            decoration: BoxDecoration(
              color: const Color(0xFF334155),
              borderRadius: BorderRadius.circular(12),
              image: item.course.thumbnailUrl != null
                  ? DecorationImage(
                      image: NetworkImage(item.course.thumbnailUrl!),
                      fit: BoxFit.cover,
                    )
                  : null,
            ),
            child: item.course.thumbnailUrl == null
                ? const Icon(Icons.school, color: Colors.grey)
                : null,
          ),
          const SizedBox(width: 16),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  item.course.title,
                  style: GoogleFonts.outfit(
                    fontWeight: FontWeight.bold,
                    fontSize: 16,
                    color: Colors.white,
                  ),
                ),
                if (item.course.instructorName != null)
                  Text(
                    'by ${item.course.instructorName}',
                    style: GoogleFonts.outfit(
                      color: Colors.white38,
                      fontSize: 12,
                    ),
                  ),
                const SizedBox(height: 4),
                Text(
                  '\$${item.price.toStringAsFixed(2)}',
                  style: GoogleFonts.outfit(
                    color: const Color(0xFF3B82F6),
                    fontWeight: FontWeight.bold,
                    fontSize: 16,
                  ),
                ),
              ],
            ),
          ),
          IconButton(
            onPressed: onRemove,
            icon: const Icon(Icons.delete_outline, color: Colors.redAccent),
          ),
        ],
      ),
    );
  }
}

class _CouponSection extends StatelessWidget {
  const _CouponSection({
    required this.controller,
    required this.appliedCoupon,
    required this.onApply,
    required this.onRemove,
  });

  final TextEditingController controller;
  final String? appliedCoupon;
  final VoidCallback onApply;
  final VoidCallback onRemove;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: const Color(0xFF1E293B),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Apply Coupon',
            style: GoogleFonts.outfit(
              fontWeight: FontWeight.w600,
              fontSize: 14,
              color: Colors.white,
            ),
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: TextField(
                  controller: controller,
                  style: const TextStyle(color: Colors.white),
                  decoration: InputDecoration(
                    hintText: 'Enter promo code',
                    hintStyle: GoogleFonts.outfit(color: Colors.white38),
                    prefixIcon: const Icon(Icons.local_offer_outlined,
                        color: Colors.white38, size: 20),
                    contentPadding: const EdgeInsets.symmetric(
                        horizontal: 16, vertical: 12),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(8),
                      borderSide: const BorderSide(color: Colors.white10),
                    ),
                    enabledBorder: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(8),
                      borderSide: const BorderSide(color: Colors.white10),
                    ),
                    filled: true,
                    fillColor: Colors.black26,
                  ),
                ),
              ),
              const SizedBox(width: 12),
              FilledButton(
                onPressed: onApply,
                style: FilledButton.styleFrom(
                  backgroundColor: const Color(0xFF3B82F6),
                  padding:
                      const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(8),
                  ),
                ),
                child: Text(
                  'Apply',
                  style: GoogleFonts.outfit(fontWeight: FontWeight.bold),
                ),
              ),
            ],
          ),
          if (appliedCoupon != null) ...[
            const SizedBox(height: 12),
            Row(
              children: [
                const Icon(Icons.check_circle,
                    color: Color(0xFF10B981), size: 16),
                const SizedBox(width: 8),
                Text(
                  '$appliedCoupon coupon applied!',
                  style: GoogleFonts.outfit(
                    color: const Color(0xFF10B981),
                    fontWeight: FontWeight.w600,
                    fontSize: 12,
                  ),
                ),
                const Spacer(),
                GestureDetector(
                  onTap: onRemove,
                  child: const Icon(Icons.close, size: 16, color: Colors.grey),
                ),
              ],
            ),
          ],
        ],
      ),
    );
  }
}

class _OrderSummary extends StatelessWidget {
  const _OrderSummary({
    required this.subtotal,
    required this.discount,
    required this.total,
    this.discountLabel,
  });

  final double subtotal;
  final double discount;
  final double total;
  final String? discountLabel;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: const Color(0xFF1E293B),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'ORDER SUMMARY',
            style: GoogleFonts.outfit(
              fontWeight: FontWeight.bold,
              fontSize: 12,
              letterSpacing: 1,
              color: Colors.white70,
            ),
          ),
          const SizedBox(height: 20),
          _SummaryRow(
              label: 'Subtotal', value: '\$${subtotal.toStringAsFixed(2)}'),
          if (discount > 0) ...[
            const SizedBox(height: 12),
            _SummaryRow(
              label: discountLabel ?? 'Discount',
              value: '-\$${discount.toStringAsFixed(2)}',
              valueColor: const Color(0xFF10B981),
            ),
          ],
          const Padding(
            padding: EdgeInsets.symmetric(vertical: 16),
            child: Divider(),
          ),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Total Amount',
                style: GoogleFonts.outfit(
                  fontWeight: FontWeight.bold,
                  fontSize: 16,
                  color: Colors.white,
                ),
              ),
              Text(
                '\$${total.toStringAsFixed(2)}',
                style: GoogleFonts.outfit(
                  fontWeight: FontWeight.bold,
                  fontSize: 24,
                  color: const Color(0xFF3B82F6),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _SummaryRow extends StatelessWidget {
  const _SummaryRow({
    required this.label,
    required this.value,
    this.valueColor,
  });

  final String label;
  final String value;
  final Color? valueColor;

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: GoogleFonts.outfit(color: Colors.grey[600]),
        ),
        Text(
          value,
          style: GoogleFonts.outfit(
            fontWeight: FontWeight.w600,
            color: valueColor ?? Colors.white70,
          ),
        ),
      ],
    );
  }
}

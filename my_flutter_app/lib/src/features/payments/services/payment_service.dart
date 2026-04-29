import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:my_flutter_app/src/features/payments/data/payment_repository.dart';
import 'package:razorpay_flutter/razorpay_flutter.dart';

class PaymentService {
  PaymentService(this._repo);
  final PaymentRepository _repo;
  late Razorpay _razorpay;

  // Stream for UI to listen to payment outcomes
  final _paymentResultController = StreamController<PaymentStatus>.broadcast();
  Stream<PaymentStatus> get paymentResult => _paymentResultController.stream;

  void init() {
    _razorpay = Razorpay()
      ..on(Razorpay.EVENT_PAYMENT_SUCCESS, _handlePaymentSuccess)
      ..on(Razorpay.EVENT_PAYMENT_ERROR, _handlePaymentError)
      ..on(Razorpay.EVENT_EXTERNAL_WALLET, _handleExternalWallet);
  }

  void dispose() {
    _razorpay.clear();
    _paymentResultController.close();
  }

  Future<void> startPayment(
      {required int courseId,
      required String userEmail,
      required String userPhone,
      String? couponCode}) async {
    try {
      // 1. Create Order on Backend
      final orderData =
          await _repo.createOrder(courseId: courseId, couponCode: couponCode);

      // 2. Open Razorpay Checkout
      final options = {
        'key': orderData['key'],
        'amount': orderData['amount'],
        'name': 'Learning Hub',
        'description': 'Course Purchase',
        'order_id': orderData['id'], // razorpay_order_id
        'prefill': {'contact': userPhone, 'email': userEmail},
        'external': {
          'wallets': ['paytm']
        }
      };

      if (!kIsWeb &&
          (defaultTargetPlatform == TargetPlatform.windows ||
              defaultTargetPlatform == TargetPlatform.linux)) {
        // Mock for Desktop Dev
        debugPrint('PaymentService: Desktop Detected. Mocking Success.');
        await Future<void>.delayed(const Duration(seconds: 2));
        final orderId = orderData['id']?.toString() ?? '';
        await _handleMockSuccess(orderId);
      } else {
        _razorpay.open(options);
      }
    } on Exception catch (e) {
      debugPrint('PaymentService: Error starting payment $e');
      _paymentResultController.add(PaymentStatus.failed);
    }
  }

  Future<void> _handlePaymentSuccess(PaymentSuccessResponse response) async {
    debugPrint('PaymentService: Success! ${response.paymentId}');
    try {
      // 3. Verify on Backend
      await _repo.verifyPayment(
          paymentId: response.paymentId!,
          orderId: response.orderId!,
          signature: response.signature!);
      _paymentResultController.add(PaymentStatus.success);
    } on Exception catch (e) {
      debugPrint('PaymentService: Verification Failed $e');
      _paymentResultController.add(PaymentStatus.failed);
    }
  }

  void _handlePaymentError(PaymentFailureResponse response) {
    debugPrint('PaymentService: Error ${response.code} - ${response.message}');
    _paymentResultController.add(PaymentStatus.failed);
  }

  void _handleExternalWallet(ExternalWalletResponse response) {
    debugPrint('PaymentService: External Wallet ${response.walletName}');
  }

  // Mock function for Windows testing
  Future<void> _handleMockSuccess(String orderId) async {
    try {
      // We can't actually verify a mock signature on backend,
      // so in a real app create a bypass endpoint for DEBUG=True only.
      // Here we just notify UI of success.
      debugPrint('PaymentService: Mock Payment Success');
      _paymentResultController.add(PaymentStatus.success);
    } on Exception catch (_) {
      // ignore
    }
  }
}

enum PaymentStatus { success, failed, processing }

final paymentServiceProvider = Provider<PaymentService>((ref) {
  final repo = ref.watch(paymentRepositoryProvider);
  final service = PaymentService(repo)..init();
  ref.onDispose(service.dispose);
  return service;
});

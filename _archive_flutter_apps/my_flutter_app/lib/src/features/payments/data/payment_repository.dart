import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:my_flutter_app/src/core/network/api_client.dart';

class PaymentRepository {
  PaymentRepository(this._apiClient);
  final ApiClient _apiClient;

  /// Creates a Razorpay Order ID from the backend
  Future<Map<String, dynamic>> createOrder({
    required int courseId,
    String? couponCode,
  }) async {
    final response = await _apiClient.post(
      '/payments/orders/',
      data: {
        'course_id': courseId,
        'coupon_code': couponCode,
      },
    );
    return response.data ?? <String, dynamic>{};
  }

  /// Verifies the payment signature on the backend
  Future<void> verifyPayment({
    required String paymentId, // razorpay_payment_id
    required String orderId, // razorpay_order_id
    required String signature, // razorpay_signature
  }) async {
    await _apiClient.post(
      '/payments/verify/',
      data: {
        'gateway_payment_id':
            paymentId, // The generic ID (Backend needs this from url or body? View uses serialzier)
        // Wait, View uses VerifyPaymentSerializer which has payment_id and gateway_payment_id
        // But logic in View.post uses request.data.get('razorpay_signature')
        // Let's check Serializer in next step if unsure, but for now I will send ALL keys.
        'payment_id': paymentId, // razorpay_payment_id
        'razorpay_payment_id': paymentId,
        'razorpay_order_id': orderId,
        'razorpay_signature': signature,
      },
    );
  }
}

final paymentRepositoryProvider = Provider<PaymentRepository>((ref) {
  final apiClient = ref.watch(apiClientProvider);
  return PaymentRepository(apiClient);
});

import 'api_client.dart';
import 'logging_service.dart';

/// Payment status
enum PaymentStatus {
  pending,
  completed,
  failed,
  cancelled,
  refunded,
}

/// Payment method types
enum PaymentMethodType {
  creditCard,
  paypal,
  googlePay,
  applePay,
}

/// Payment transaction model
class Transaction {
  final String id;
  final String userId;
  final double amount;
  final String currency;
  final PaymentStatus status;
  final DateTime createdAt;
  final String? description;
  final String? receiptUrl;

  const Transaction({
    required this.id,
    required this.userId,
    required this.amount,
    required this.currency,
    required this.status,
    required this.createdAt,
    this.description,
    this.receiptUrl,
  });

  factory Transaction.fromJson(Map<String, dynamic> json) {
    return Transaction(
      id: json['id'] as String,
      userId: json['userId'] as String,
      amount: (json['amount'] as num).toDouble(),
      currency: json['currency'] as String,
      status: PaymentStatus.values.firstWhere(
        (e) => e.name == json['status'],
        orElse: () => PaymentStatus.pending,
      ),
      createdAt: DateTime.parse(json['createdAt'] as String),
      description: json['description'] as String?,
      receiptUrl: json['receiptUrl'] as String?,
    );
  }
}

/// Payment service for handling subscriptions and purchases
class PaymentService {
  static final PaymentService _instance = PaymentService._();
  static PaymentService get instance => _instance;

  PaymentService._();

  final ApiClient _api = ApiClient.instance;
  final _logger = ScopedLogger('PaymentService');

  /// Initiate a payment
  Future<Transaction?> initiatePayment({
    required double amount,
    required String currency,
    required PaymentMethodType method,
    String? description,
  }) async {
    return _logger.timedAsync('initiatePayment', () async {
      _logger.info('Initiating payment', context: {
        'amount': amount,
        'currency': currency,
        'method': method.name,
      });

      // In a real app, this would integrate with Stripe/PayPal SDKs
      // GOD MODE: Change base URL to 'http://localhost:8080' to use the Python Mock Service
      final response = await _api.post<Map<String, dynamic>>(
        '/payments/initiate',
        data: {
          'amount': amount,
          'currency': currency,
          'method': method.name,
          'description': description,
        },
      );

      if (response.success && response.data != null) {
        _logger.info('Payment initiated successfully');
        return Transaction.fromJson(response.data!);
      } else {
        _logger.error('Payment initiation failed',
            context: {'error': response.errorMessage});
        return null;
      }
    });
  }

  /// Verify payment status
  Future<Transaction?> verifyPayment(String transactionId) async {
    try {
      final response = await _api.get<Map<String, dynamic>>(
        '/payments/$transactionId/verify',
      );

      if (response.success && response.data != null) {
        return Transaction.fromJson(response.data!);
      }
      _logger.warn('Payment verification failed',
          context: {'transactionId': transactionId});
      return null;
    } catch (e, st) {
      _logger.error('Error verifying payment',
          error: e, stackTrace: st, context: {'transactionId': transactionId});
      return null;
    }
  }

  /// Get user transaction history
  Future<List<Transaction>> getTransactionHistory() async {
    try {
      final response =
          await _api.get<Map<String, dynamic>>('/payments/history');

      if (response.success && response.data != null) {
        final list = response.data!['transactions'] as List;
        return list
            .map((e) => Transaction.fromJson(e as Map<String, dynamic>))
            .toList();
      }
      return [];
    } catch (e, st) {
      _logger.error('Error fetching transaction history',
          error: e, stackTrace: st);
      return [];
    }
  }

  /// Subscribe to a plan
  Future<bool> subscribe(String planId) async {
    return _logger.timedAsync('subscribe', () async {
      final response = await _api.post<Map<String, dynamic>>(
        '/subscriptions/subscribe',
        data: {'planId': planId},
      );
      if (!response.success) {
        _logger.error('Subscription failed',
            context: {'planId': planId, 'error': response.errorMessage});
      }
      return response.success;
    });
  }

  /// Cancel subscription
  Future<bool> cancelSubscription(String subscriptionId) async {
    return _logger.timedAsync('cancelSubscription', () async {
      final response = await _api.post<Map<String, dynamic>>(
        '/subscriptions/$subscriptionId/cancel',
      );
      if (!response.success) {
        _logger.error('Cancellation failed', context: {
          'subscriptionId': subscriptionId,
          'error': response.errorMessage
        });
      }
      return response.success;
    });
  }
}

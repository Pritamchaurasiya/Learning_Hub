import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:my_flutter_app/src/core/constants/api_constants.dart';
import 'package:my_flutter_app/src/core/network/api_client.dart';
import 'package:my_flutter_app/src/features/support/domain/feedback_ticket_model.dart';

final supportRepositoryProvider = Provider<SupportRepository>((ref) {
  return SupportRepository(ref.watch(apiClientProvider));
});

class SupportRepository {
  SupportRepository(this._apiClient);
  final ApiClient _apiClient;

  Future<List<FeedbackTicket>> getMyTickets() async {
    final response = await _apiClient.get(ApiConstants.feedback);
    // Standard DRF ModelViewSet returns list or paginated result
    // Assuming list for now or handling 'results' key if paginated
    final data = response.data;
    final List<dynamic> rawList;

    if (data != null && data.containsKey('results')) {
      rawList = (data['results'] as List<dynamic>?) ?? [];
    } else if (data != null && data.containsKey('data')) {
      rawList = (data['data'] as List<dynamic>?) ?? [];
    } else {
      rawList = [];
    }

    return rawList
        .map((dynamic e) => FeedbackTicket.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  Future<FeedbackTicket> createTicket(Map<String, dynamic> data) async {
    final response = await _apiClient.post(ApiConstants.feedback, data: data);
    final responseData = response.data;
    if (responseData == null) {
      throw Exception('Failed to create ticket: No data returned');
    }
    return FeedbackTicket.fromJson(responseData);
  }
}

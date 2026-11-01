import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:my_flutter_app/src/core/constants/api_constants.dart';
import 'package:my_flutter_app/src/core/network/api_client.dart';

class CertificateRepository {
  CertificateRepository(this._apiClient);
  final ApiClient _apiClient;

  Future<String?> generateCertificate(String courseSlug) async {
    final response = await _apiClient.post(
      '${ApiConstants.courses}$courseSlug/certificate/',
    );
    final data = response.data;
    if (data is Map<String, dynamic> && data.containsKey('download_url')) {
      return data['download_url'] as String?;
    }
    return null;
  }
}

final certificateRepositoryProvider = Provider<CertificateRepository>((ref) {
  final apiClient = ref.watch(apiClientProvider);
  return CertificateRepository(apiClient);
});

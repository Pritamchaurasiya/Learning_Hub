import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../../core/constants/api_constants.dart';
import '../../../core/network/api_client.dart';
import '../domain/download_model.dart';

final downloadRepositoryProvider = Provider<DownloadRepository>((ref) {
  return DownloadRepository(ref.watch(apiClientProvider));
});

class DownloadRepository {

  DownloadRepository(this._apiClient);
  final ApiClient _apiClient;

  Future<List<DownloadItem>> getDownloads() async {
    final response = await _apiClient.get(ApiConstants.downloads);
    if (response.data is Map && (response.data! as Map).containsKey('results')) {
      return ((response.data! as Map)['results'] as List)
          .map((json) => DownloadItem.fromJson(json as Map<String, dynamic>))
          .toList();
    }
    return (response.data! as List)
        .map((json) => DownloadItem.fromJson(json as Map<String, dynamic>))
        .toList();
  }

  Future<DownloadStats> getStats() async {
    final response = await _apiClient.get('${ApiConstants.downloads}stats/');
    return DownloadStats.fromJson(response.data!);
  }

  Future<void> deleteDownload(int id) async {
    await _apiClient.delete('${ApiConstants.downloads}$id/');
  }

  Future<void> markExpired(int id) async {
    await _apiClient.post('${ApiConstants.downloads}$id/mark_expired/');
  }
}

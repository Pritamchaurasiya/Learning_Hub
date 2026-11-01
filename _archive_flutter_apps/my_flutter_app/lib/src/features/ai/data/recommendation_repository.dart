import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'package:my_flutter_app/src/core/network/api_client.dart';
import 'package:my_flutter_app/src/features/courses/domain/course_model.dart';

class RecommendationRepository {
  RecommendationRepository(this._api);
  final ApiClient _api;

  Future<List<Course>> getRecommendations() async {
    try {
      final response = await _api.get('/ai/recommendations/');
      final data = (response.data?['data'] as List?) ?? [];
      return data.map((json) {
        // Map the simplified recommendation format to Course model
        // This assumes the backend returns necessary fields or we fill defaults
        final jsonMap =
            json is Map ? json.cast<String, dynamic>() : <String, dynamic>{};
        return Course(
          id: jsonMap['id']?.toString() ?? '',
          title: jsonMap['title'] as String? ?? 'Untitled',
          slug: jsonMap['slug'] as String? ?? jsonMap['id']?.toString() ?? '',
          description: jsonMap['description'] as String? ?? '',
          thumbnailUrl: jsonMap['thumbnail'] as String?,
          instructorName: jsonMap['instructor'] is Map<String, dynamic>
              ? (jsonMap['instructor'] as Map<String, dynamic>)['name']
                      as String? ??
                  'AI Recommended'
              : 'AI Recommended',
          price: 0,
          avgRating: 4.8,
          categoryName: 'Recommended',
          isPublished: true,
        );
      }).toList();
    } on Exception catch (_) {
      return []; // Return empty on error to handle gracefully
    }
  }
}

final recommendationRepositoryProvider =
    Provider<RecommendationRepository>((ref) {
  return RecommendationRepository(ref.read(apiClientProvider));
});

final recommendationsProvider = FutureProvider<List<Course>>((ref) async {
  return ref.read(recommendationRepositoryProvider).getRecommendations();
});

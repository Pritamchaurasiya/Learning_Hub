import 'package:flutter/foundation.dart';
import '../services/api_client.dart';

class BackendAiService {
  final ApiClient _apiClient = ApiClient.instance;

  /// Calls the backend to explain a code snippet
  Future<String> explainCode(String code, {String context = 'general'}) async {
    try {
      final response = await _apiClient.post<Map<String, dynamic>>(
        '/ai/tutor/explain/',
        data: {
          'code': code,
          'context': context,
        },
      );

      if (response.success && response.data != null) {
        final data = response.data as Map<String, dynamic>;
        if (data['status'] == 'success') {
          final inner = data['data'] as Map<String, dynamic>?;
          return (inner?['explanation'] ?? '') as String;
        }
      }
      throw Exception(response.message ?? 'Failed to get explanation');
    } catch (e) {
      throw Exception('Error explaining code: $e');
    }
  }

  /// Generates a DSA hint based on the problem and user level
  Future<String> getDsaHint(String problemSlug) async {
    try {
      final response = await _apiClient.get<Map<String, dynamic>>(
        '/dsa/problems/$problemSlug/hint/',
      );

      if (response.success && response.data != null) {
        final data = response.data as Map<String, dynamic>;
        return (data['hint'] ?? 'No hint available.') as String;
      }
      throw Exception(response.message ?? 'Failed to get hint');
    } catch (e) {
      // Fail gracefully for hints
      return 'Hint: Review the problem constraints and edge cases.';
    }
  }

  /// Moderates content for safety
  /// Returns null if safe, or a reason string if unsafe.
  Future<String?> moderateContent(String text, {String type = 'chat'}) async {
    try {
      final response = await _apiClient.post<Map<String, dynamic>>(
        '/dashboard/moderate/',
        data: {'content': text, 'content_type': type},
      );

      if (response.success && response.data != null) {
        final responseData = response.data as Map<String, dynamic>;
        final data = responseData['data'] as Map<String, dynamic>;
        final isSafe = data['is_safe'] as bool? ?? true;
        if (!isSafe) {
          return data['reason'] as String? ?? 'Content violation';
        }
      }
      return null; // Safe
    } catch (e) {
      // If moderation fails, assume safe to avoid blocking in case of outage,
      // or block if strict. For now, log and assume safe.
      debugPrint('Moderation check failed: $e');
      return null;
    }
  }
}

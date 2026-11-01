import 'dart:async';
import 'package:flutter/foundation.dart';
import '../api_client.dart';
import 'llm_client.dart';

/// LLM Client that proxies requests to the Django Backend
/// Falls back to a secondary client (e.g., local Gemini) if backend fails
class BackendLLMClient implements LLMClient {
  final ApiClient _apiClient;
  final LLMClient? _fallbackClient;

  BackendLLMClient({ApiClient? apiClient, LLMClient? fallbackClient})
      : _apiClient = apiClient ?? ApiClient.instance,
        _fallbackClient = fallbackClient;

  @override
  bool get isAvailable => true;

  @override
  Future<String> generateText(String prompt) async {
    return chat([], prompt);
  }

  @override
  Future<String> chat(List<Map<String, String>> history, String message) async {
    try {
      final response = await _apiClient.post<Map<String, dynamic>>(
        '/ai/tutor/ask/',
        data: {
          'question': message,
          'module_filename': 'general',
          'history': history,
        },
      );

      if (response.success && response.data != null) {
        final data = response.data!['data'] as Map<String, dynamic>;
        return data['answer'] as String;
      } else {
        throw Exception(response.message ?? 'Unknown backend error');
      }
    } catch (e) {
      debugPrint('[BackendLLMClient] Chat error: $e');
      final fallback = _fallbackClient;
      if (fallback != null && fallback.isAvailable) {
        debugPrint('[BackendLLMClient] Falling back to secondary client...');
        return fallback.chat(history, message);
      }
      rethrow;
    }
  }

  @override
  Stream<String> streamChat(
      List<Map<String, String>> history, String message) async* {
    try {
      final stream = _apiClient.stream(
        '/ai/tutor/stream/',
        data: {
          'question': message,
          'module_filename': 'general',
        },
      );

      await for (final chunk in stream) {
        yield chunk;
      }
    } catch (e) {
      debugPrint('[BackendLLMClient] Stream error: $e');
      final fallback = _fallbackClient;
      if (fallback != null && fallback.isAvailable) {
        debugPrint('[BackendLLMClient] Falling back to secondary stream...');
        yield* fallback.streamChat(history, message);
        return;
      }
      yield 'Error connecting to AI Tutor and no fallback available: ${e.toString()}';
    }
  }
}

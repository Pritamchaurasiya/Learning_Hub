import 'dart:convert';
import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import '../api_client.dart';
import 'llm_client.dart';

/// Gemini Pro implementation using REST API via Dio
class GeminiClient implements LLMClient {
  static const String _baseUrl =
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';
  static const String _streamUrl =
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:streamGenerateContent?alt=sse';
  final String? _apiKey;
  final Dio _dio;

  GeminiClient({String? apiKey})
      : _apiKey = apiKey ?? const String.fromEnvironment('GEMINI_API_KEY'),
        _dio = Dio(BaseOptions(
          connectTimeout: const Duration(seconds: 10),
          receiveTimeout: const Duration(seconds: 20),
        ));

  @override
  bool get isAvailable => _apiKey != null && _apiKey.isNotEmpty;

  @override
  Future<String> generateText(String prompt) async {
    return _callGemini([
      {
        'role': 'user',
        'parts': [
          {'text': prompt}
        ]
      }
    ]);
  }

  @override
  Future<String> chat(List<Map<String, String>> history, String message) async {
    // Convert generic history to Gemini format
    final contents = history.map((msg) {
      return {
        'role': msg['role'] == 'assistant' ? 'model' : 'user',
        'parts': [
          {'text': msg['content']}
        ]
      };
    }).toList();

    // Add new message
    contents.add({
      'role': 'user',
      'parts': [
        {'text': message}
      ]
    });

    return _callGemini(contents);
  }

  @override
  Stream<String> streamChat(
      List<Map<String, String>> history, String message) async* {
    if (!isAvailable) throw Exception('Gemini API Key not configured');

    final contents = history.map((msg) {
      return {
        'role': msg['role'] == 'assistant' ? 'model' : 'user',
        'parts': [
          {'text': msg['content']}
        ]
      };
    }).toList();

    contents.add({
      'role': 'user',
      'parts': [
        {'text': message}
      ]
    });

    yield* _streamGemini(contents);
  }

  Stream<String> _streamGemini(List<Map<String, dynamic>> contents) async* {
    if (!isAvailable) throw Exception('Gemini API Key not configured');

    try {
      final response = await _dio.post<ResponseBody>(
        _streamUrl,
        queryParameters: {'key': _apiKey},
        data: {
          'contents': contents,
          'generationConfig': {
            // For streaming, we might want slightly different configs, but keeping same for consistency
            'temperature': 0.7,
            'topK': 40,
            'topP': 0.95,
            'maxOutputTokens': 2048,
          }
        },
        options: Options(
          responseType: ResponseType.stream,
        ),
      );

      final responseBody = response.data!;
      final byteStream = responseBody.stream as Stream<List<int>>;

      // Decode bytes to string
      final stringStream = byteStream.transform(utf8.decoder);

      // Buffer for partial lines
      String buffer = '';

      await for (final String chunk in stringStream) {
        buffer += chunk;

        // Process buffer line by line
        while (buffer.contains('\n')) {
          final index = buffer.indexOf('\n');
          final line = buffer.substring(0, index).trim();
          buffer = buffer.substring(index + 1);

          if (line.startsWith('data: ')) {
            final jsonStr = line.substring(6); // Remove 'data: ' prefix
            if (jsonStr == '[DONE]') continue; // Request finished

            try {
              final data = jsonDecode(jsonStr) as Map<String, dynamic>;
              final candidates = data['candidates'] as List<dynamic>?;
              if (candidates != null && candidates.isNotEmpty) {
                final candidateMap = candidates[0] as Map<String, dynamic>;
                final content =
                    candidateMap['content'] as Map<String, dynamic>?;
                if (content != null) {
                  final parts = content['parts'] as List<dynamic>?;
                  if (parts != null && parts.isNotEmpty) {
                    final firstPart = parts[0] as Map<String, dynamic>;
                    final text = firstPart['text'] as String?;
                    if (text != null) {
                      yield text;
                    }
                  }
                }
              }
            } catch (e) {
              // Skip malformed chunks or empty lines
              if (kDebugMode) debugPrint('[GeminiStream] Parse error: $e');
            }
          }
        }
      }
    } on DioException catch (e) {
      if (kDebugMode) debugPrint('[Gemini] Stream Error: ${e.message}');
      throw ApiException.fromDioError(e);
    } catch (e) {
      if (kDebugMode) debugPrint('[Gemini] Unknown Stream Error: $e');
      throw ApiException(message: e.toString(), type: ApiErrorType.unknown);
    }
  }

  Future<String> _callGemini(List<Map<String, dynamic>> contents) async {
    if (!isAvailable) throw Exception('Gemini API Key not configured');

    try {
      final response = await _dio.post<Map<String, dynamic>>(
        _baseUrl,
        queryParameters: {'key': _apiKey},
        data: {
          'contents': contents,
          'generationConfig': {
            'temperature': 0.7,
            'topK': 40,
            'topP': 0.95,
            'maxOutputTokens': 1024,
          }
        },
      );

      if (response.statusCode == 200) {
        final data = response.data!;
        final candidates = data['candidates'] as List<dynamic>?;
        if (candidates != null && candidates.isNotEmpty) {
          final content = (candidates[0] as Map<String, dynamic>)['content']
              as Map<String, dynamic>;
          if (content['parts'] != null &&
              (content['parts'] as List).isNotEmpty) {
            final part = (content['parts'] as List)[0] as Map<String, dynamic>;
            return part['text'] as String;
          }
        }
      }

      throw const ApiException(
        message: 'Invalid response format from Gemini',
        type: ApiErrorType.serverError,
      );
    } on DioException catch (e) {
      if (kDebugMode) debugPrint('[Gemini] Error: ${e.message}');
      throw ApiException.fromDioError(e);
    } catch (e) {
      if (kDebugMode) debugPrint('[Gemini] Unknown Error: $e');
      throw ApiException(message: e.toString(), type: ApiErrorType.unknown);
    }
  }
}

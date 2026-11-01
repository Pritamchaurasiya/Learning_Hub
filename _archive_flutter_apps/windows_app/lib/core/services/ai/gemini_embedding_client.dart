import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import '../api_client.dart';
import 'embedding_client.dart';

/// Gemini implementation of text embeddings using REST API
class GeminiEmbeddingClient implements EmbeddingClient {
  static const String _baseUrl =
      'https://generativelanguage.googleapis.com/v1beta/models/embedding-001:embedContent';
  static const String _batchUrl =
      'https://generativelanguage.googleapis.com/v1beta/models/embedding-001:batchEmbedContents';

  final String? _apiKey;
  final Dio _dio;

  GeminiEmbeddingClient({String? apiKey})
      : _apiKey = apiKey ?? const String.fromEnvironment('GEMINI_API_KEY'),
        _dio = Dio(BaseOptions(
          connectTimeout: const Duration(seconds: 10),
          receiveTimeout: const Duration(seconds: 20),
        ));

  @override
  bool get isAvailable => _apiKey != null && _apiKey.isNotEmpty;

  @override
  Future<List<double>> generateEmbedding(String text) async {
    if (!isAvailable) throw Exception('Gemini API Key not configured');

    try {
      final response = await _dio.post<Map<String, dynamic>>(
        _baseUrl,
        queryParameters: {'key': _apiKey},
        data: {
          'model': 'models/embedding-001',
          'content': {
            'parts': [
              {'text': text}
            ]
          }
        },
      );

      if (response.statusCode == 200) {
        final data = response.data!;
        final embedding = data['embedding'] as Map<String, dynamic>?;
        if (embedding != null && embedding['values'] != null) {
          return List<double>.from(
              (embedding['values'] as List).map((e) => (e as num).toDouble()));
        }
      }

      throw const ApiException(
          message: 'Invalid response from Embedding API',
          type: ApiErrorType.serverError);
    } on DioException catch (e) {
      if (kDebugMode) debugPrint('[Embedding] Error: ${e.message}');
      throw ApiException.fromDioError(e);
    } catch (e) {
      throw ApiException(message: e.toString(), type: ApiErrorType.unknown);
    }
  }

  @override
  Future<List<List<double>>> generateEmbeddings(List<String> inputs) async {
    if (!isAvailable) throw Exception('Gemini API Key not configured');
    if (inputs.isEmpty) return [];

    try {
      final response = await _dio.post<Map<String, dynamic>>(
        _batchUrl,
        queryParameters: {'key': _apiKey},
        data: {
          'requests': inputs
              .map((text) => {
                    'model': 'models/embedding-001',
                    'content': {
                      'parts': [
                        {'text': text}
                      ]
                    }
                  })
              .toList(),
        },
      );

      if (response.statusCode == 200) {
        final data = response.data!;
        final embeddings = data['embeddings'] as List<dynamic>?;
        if (embeddings != null) {
          return embeddings.map((emb) {
            final embMap = emb as Map<String, dynamic>;
            return List<double>.from(
                (embMap['values'] as List).map((e) => (e as num).toDouble()));
          }).toList();
        }
      }

      throw const ApiException(
          message: 'Invalid batch response from Embedding API',
          type: ApiErrorType.serverError);
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    } catch (e) {
      throw ApiException(message: e.toString(), type: ApiErrorType.unknown);
    }
  }
}

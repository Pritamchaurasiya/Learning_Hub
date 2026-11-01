import 'dart:async';
import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:my_flutter_app/src/core/network/api_client.dart';

final aiRepositoryProvider = Provider<AiRepository>((ref) {
  return AiRepository(ref.watch(apiClientProvider));
});

class AiRepository {
  AiRepository(this._apiClient);
  final ApiClient _apiClient;

  /// Streams the answer from the AI Tutor token-by-token.
  Stream<String> streamTutorAnswer(
      String question, String moduleFilename) async* {
    try {
      final response = await _apiClient.streamPost(
        '/ai/stream_tutor/',
        data: {
          'question': question,
          'module_filename': moduleFilename,
        },
      );

      final stream = response.data?.stream;
      if (stream == null) {
        throw Exception('Stream unavailable');
      }

      // Decode the stream of bytes to strings
      await for (final chunk in stream) {
        // Dio returns Uint8List chunks
        final text = utf8.decode(chunk, allowMalformed: true);
        debugPrint('AI Stream Chunk: $text');
        yield text;
      }
    } on Exception catch (e) {
      debugPrint('AI Streaming Error: $e');
      yield ' [Connection Error] ';
      rethrow;
    }
  }
}

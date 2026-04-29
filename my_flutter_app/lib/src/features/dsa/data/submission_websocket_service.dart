import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';
import 'package:web_socket_channel/web_socket_channel.dart';

import '../../../../src/core/network/token_manager.dart';
import '../../../core/constants/api_constants.dart';

part 'submission_websocket_service.g.dart';

@riverpod
class SubmissionWebSocketService extends _$SubmissionWebSocketService {
  WebSocketChannel? _channel;

  @override
  Stream<Map<String, dynamic>> build(String userId) async* {
    await _connect(userId);

    if (_channel == null) {
      yield {};
      return;
    }

    ref.onDispose(() {
      _channel?.sink.close();
    });

    yield* _channel!.stream.map((event) {
      try {
        final decoded = jsonDecode(event as String) as Map<String, dynamic>;
        if (decoded['type'] == 'submission_update') {
          return decoded['data'] as Map<String, dynamic>;
        }
      } on Exception catch (e) {
        debugPrint('Error decoding WebSocket message: $e');
      }
      return <String, dynamic>{};
    });
  }

  Future<void> _connect(String userId) async {
    final tokenManager = ref.watch(tokenManagerProvider);
    final token = await tokenManager.getAccessToken();
    if (token == null) {
      return;
    }

    final url =
        '${ApiConstants.wsUrl}/ws/dsa/submissions/$userId/?token=$token';
    debugPrint('Connecting to WebSocket: $url');
    _channel = WebSocketChannel.connect(Uri.parse(url));
  }
}

import 'dart:async';
import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:my_flutter_app/src/core/constants/api_constants.dart';
import 'package:my_flutter_app/src/core/network/api_client.dart';
import 'package:my_flutter_app/src/features/auth/data/auth_repository.dart';
import 'package:my_flutter_app/src/features/live_sessions/domain/live_session_model.dart';
import 'package:web_socket_channel/web_socket_channel.dart';

class LiveSessionRepository {
  LiveSessionRepository(this._ref, this._apiClient);
  final Ref _ref;
  final ApiClient _apiClient;

  WebSocketChannel? _channel;
  final _eventController = StreamController<Map<String, dynamic>>.broadcast();

  Stream<Map<String, dynamic>> get events => _eventController.stream;

  /// Get upcoming live sessions from API
  Future<List<LiveSession>> getUpcomingSessions() async {
    final response = await _apiClient.get(ApiConstants.liveSessions);
    final data = response.data;
    final results = (data?['results'] as List<dynamic>?) ?? <dynamic>[];
    return results
        .whereType<Map<String, dynamic>>()
        .map(LiveSession.fromJson)
        .toList();
  }

  /// Join a live session
  Future<Map<String, dynamic>> joinSession(String sessionId) async {
    final response = await _apiClient.post(
      '${ApiConstants.liveSessions}$sessionId/join/',
    );
    return response.data ?? <String, dynamic>{'message': 'Joined successfully'};
  }

  Future<void> connect(String sessionId) async {
    final authRepo = _ref.read(authRepositoryProvider);
    final token = await authRepo.getAccessToken();

    if (token == null) {
      return;
    }

    try {
      final wsUrl = _getWsUrl(sessionId);
      debugPrint('LiveSession: Connecting to $wsUrl');

      _channel = WebSocketChannel.connect(
        Uri.parse('$wsUrl?token=$token'),
      );

      _channel!.stream.listen(
        (dynamic message) {
          debugPrint('LiveSession: Received $message');
          try {
            final messageStr = message.toString();
            final data = jsonDecode(messageStr);
            if (data is Map<String, dynamic>) {
              _eventController.add(data);
            }
          } on FormatException catch (e) {
            debugPrint('LiveSession: JSON Error $e');
          }
        },
        onError: (Object e) => debugPrint('LiveSession: Error $e'),
        onDone: () => debugPrint('LiveSession: Closed'),
      );
    } on Exception catch (e) {
      debugPrint('LiveSession: Connection attempt failed $e');
    }
  }

  void disconnect() {
    _channel?.sink.close();
    _channel = null;
  }

  void submitAnswer(String answer) {
    if (_channel != null) {
      _channel!.sink.add(jsonEncode({
        'action': 'submit_answer',
        'answer': answer,
      }));
    }
  }

  String _getWsUrl(String sessionId) {
    return '${ApiConstants.wsUrl}/ws/live/$sessionId/';
  }
}

final liveSessionRepositoryProvider = Provider<LiveSessionRepository>((ref) {
  final apiClient = ref.watch(apiClientProvider);
  return LiveSessionRepository(ref, apiClient);
});

// Stream provider for specific session
final liveSessionEventsProvider =
    StreamProvider.family<Map<String, dynamic>, String>((ref, sessionId) {
  final repo = ref.watch(liveSessionRepositoryProvider)..connect(sessionId);
  ref.onDispose(repo.disconnect);
  return repo.events;
});

import 'dart:async';
import 'package:flutter/foundation.dart';

/// Session event types
enum SessionEvent {
  /// Session has expired - user should be logged out and redirected to login
  expired,
  
  /// Token was successfully refreshed
  refreshed,
  
  /// User explicitly logged out
  loggedOut,
}

/// Service for managing session state events across the app.
/// 
/// This singleton service provides a global event stream that broadcasts
/// session-related events (expired, refreshed, loggedOut) to all listeners.
/// 
/// Used to:
/// - Coordinate authentication state across multiple app components
/// - Trigger navigation changes on session expiry
/// - Prevent race conditions during token refresh
/// - Enable silent session expiry handling
/// 
/// Example:
/// ```dart
/// // Listen to session events
/// SessionEventService.instance.events.listen((event) {
///   if (event == SessionEvent.expired) {
///     // Handle session expiry - navigate to login
///   }
/// });
/// 
/// // Emit a session expired event
/// SessionEventService.instance.emitSessionExpired();
/// ```
class SessionEventService {
  static final SessionEventService _instance = SessionEventService._();
  static SessionEventService get instance => _instance;

  SessionEventService._() {
    _controller = StreamController<SessionEvent>.broadcast(
      onListen: _onListen,
      onCancel: _onCancel,
    );
  }

  late final StreamController<SessionEvent> _controller;
  int _listenerCount = 0;
  SessionEvent? _lastEvent;
  DateTime? _lastEventTime;
  
  /// Maximum time between duplicate events (to prevent spam)
  static const Duration _deduplicationWindow = Duration(seconds: 2);

  /// Stream of session events
  Stream<SessionEvent> get events => _controller.stream;

  /// Check if there are active listeners
  bool get hasListeners => _listenerCount > 0;

  /// Get the last emitted event (for debugging)
  SessionEvent? get lastEvent => _lastEvent;

  void _onListen() {
    _listenerCount++;
    if (kDebugMode) {
      debugPrint('[SessionEventService] Listener added (total: $_listenerCount)');
    }
  }

  void _onCancel() {
    _listenerCount--;
    if (kDebugMode) {
      debugPrint('[SessionEventService] Listener removed (total: $_listenerCount)');
    }
  }

  /// Emit a session event with deduplication
  void _emitEvent(SessionEvent event) {
    // Prevent duplicate events within the deduplication window
    final now = DateTime.now();
    if (_lastEvent == event && 
        _lastEventTime != null && 
        now.difference(_lastEventTime!) < _deduplicationWindow) {
      if (kDebugMode) {
        debugPrint('[SessionEventService] Duplicate $event event suppressed');
      }
      return;
    }

    _lastEvent = event;
    _lastEventTime = now;

    if (_controller.isClosed) {
      if (kDebugMode) {
        debugPrint('[SessionEventService] Cannot emit $event - controller is closed');
      }
      return;
    }

    _controller.add(event);
    
    if (kDebugMode) {
      debugPrint('[SessionEventService] Event emitted: $event');
    }
  }

  /// Emit session expired event
  /// 
  /// Called when:
  /// - Token refresh fails permanently (multiple consecutive failures)
  /// - Backend returns 401 with explicit session expiry message
  /// - Session timeout is detected
  void emitSessionExpired() {
    _emitEvent(SessionEvent.expired);
  }

  /// Emit token refreshed event
  /// 
  /// Called when token refresh succeeds
  void emitTokenRefreshed() {
    _emitEvent(SessionEvent.refreshed);
  }

  /// Emit logged out event
  /// 
  /// Called when user explicitly logs out
  void emitLoggedOut() {
    _emitEvent(SessionEvent.loggedOut);
  }

  /// Reset event deduplication state
  /// 
  /// Useful for testing or after handling a session event
  void resetDeduplication() {
    _lastEvent = null;
    _lastEventTime = null;
  }

  /// Dispose the service (should only be called on app shutdown)
  @mustCallSuper
  void dispose() {
    if (!_controller.isClosed) {
      _controller.close();
      if (kDebugMode) {
        debugPrint('[SessionEventService] Service disposed');
      }
    }
  }
}

/// Global instance for easy access
final sessionEventService = SessionEventService.instance;

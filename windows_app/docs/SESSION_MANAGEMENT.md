# Session Management Architecture

## Overview

The Learning Hub Flutter app implements a robust session management system that handles authentication, token refresh, and session expiry with the following key features:

- **Race condition prevention** - Multiple simultaneous 401 errors trigger only ONE token refresh attempt
- **Exponential backoff** - Failed refresh attempts use progressive delays (1s, 3s)
- **Silent session expiry** - Users are automatically redirected to login without intrusive dialogs
- **Memory leak prevention** - All stream controllers are properly disposed
- **Event-driven architecture** - Session state changes are broadcast to all interested components

## Architecture Components

### 1. SessionEventService

**Location**: `lib/core/services/session_event_service.dart`

A singleton service that broadcasts session-related events across the app.

**Events**:
- `SessionEvent.expired` - Session has expired, user should be logged out
- `SessionEvent.refreshed` - Token was successfully refreshed
- `SessionEvent.loggedOut` - User explicitly logged out

**Features**:
- Event deduplication (prevents spam within 2-second window)
- Broadcast stream for multiple listeners
- Proper disposal and cleanup
- Debug logging in development mode

**Usage**:
```dart
// Listen to session events
SessionEventService.instance.events.listen((event) {
  if (event == SessionEvent.expired) {
    // Handle session expiry
  }
});

// Emit events
sessionEventService.emitSessionExpired();
sessionEventService.emitTokenRefreshed();
sessionEventService.emitLoggedOut();
```

### 2. ApiClient Token Refresh

**Location**: `lib/core/services/api_client.dart`

Handles HTTP requests with automatic token refresh on 401 errors.

**Key Features**:

#### Deduplication with Completer
```dart
Completer<bool>? _refreshCompleter;
```
- Only one token refresh happens at a time
- Concurrent 401 errors wait for the same refresh attempt
- Prevents race conditions and duplicate refresh requests

#### Failure Tracking
```dart
int _refreshFailureCount = 0;
static const int _maxRefreshFailures = 2;
```
- Tracks consecutive refresh failures
- After 2 failures, emits `SessionEvent.expired`
- Prevents infinite retry loops

#### Exponential Backoff
```dart
static const Duration _refreshBackoffBase = Duration(seconds: 1);
```
- First retry: 1 second delay
- Second retry: 2 seconds delay (exponential)
- Prevents server overload during outages

#### Token Refresh Flow
```
401 Error Received
    ↓
Check if refresh in progress → Yes → Wait for existing refresh
    ↓ No
Check failure count → >= 2 → Emit SessionEvent.expired → Don't retry
    ↓ < 2
Apply exponential backoff if needed
    ↓
Perform token refresh
    ↓
Success? → Yes → Reset failure count → Retry original request
    ↓ No
Increment failure count
    ↓
>= 2 failures? → Yes → Emit SessionEvent.expired
```

### 3. Router Integration

**Location**: `lib/core/router/app_router.dart`

Listens to session events and handles navigation.

**Session Event Listener**:
```dart
sessionEventService.events.listen((event) {
  if (event == SessionEvent.expired || event == SessionEvent.loggedOut) {
    router.go('/login'); // Silent redirect
  }
});
```

**Features**:
- Silent redirect to login on session expiry
- No navigation stack (prevents back button to protected screens)
- Automatic cleanup via `ref.onDispose()`

### 4. AuthService Integration

**Location**: `lib/core/services/auth_service.dart`

Emits session events during authentication operations.

**Logout Flow**:
```dart
Future<AuthResult> signOut() async {
  // 1. Emit event BEFORE clearing state
  sessionEventService.emitLoggedOut();
  
  // 2. Clear WebSocket token
  webSocketService.setWsToken(null);
  
  // 3. Clear all session data (cookies, state, tracking)
  await _client.clearAllSessionData();
  
  return AuthResult.success(...);
}
```

### 5. UserService Integration

**Location**: `lib/core/services/user_service.dart`

Manages user profile state with proper cleanup.

**Memory Leak Prevention**:
```dart
void dispose() {
  if (!_userController.isClosed) {
    _userController.close();
  }
}
```

**Safe Stream Operations**:
```dart
if (!_userController.isClosed) {
  _userController.add(null);
}
```

### 6. AuthNotifier Integration

**Location**: `lib/core/providers/auth_provider.dart`

Riverpod state management with session event listening.

**Auto-Logout on Session Expiry**:
```dart
_sessionSubscription = sessionEventService.events.listen((event) {
  if (event == SessionEvent.expired || event == SessionEvent.loggedOut) {
    state = const AsyncValue.data(null);
  }
});

ref.onDispose(() {
  _sessionSubscription?.cancel();
});
```

## Session Expiry Flow

### User Perspective (Silent)
1. User is using the app
2. Access token expires (60 minutes by default)
3. Next API request returns 401
4. App silently refreshes token in background
5. If refresh succeeds: Request retried transparently
6. If refresh fails (after 2 attempts): User redirected to login screen
7. No error dialogs or toasts shown

### Technical Flow
```
Multiple API Requests → All return 401
    ↓
All trigger interceptor error handler
    ↓
First request starts token refresh (Completer)
    ↓
Other requests wait for same Completer
    ↓
Refresh attempt 1 → Fail
    ↓
Exponential backoff (1s)
    ↓
Refresh attempt 2 → Fail
    ↓
Failure count = 2 (max reached)
    ↓
SessionEventService.emitSessionExpired()
    ↓
Router listener receives event
    ↓
router.go('/login')
    ↓
AuthNotifier listener receives event
    ↓
state = AsyncValue.data(null)
    ↓
User sees login screen
```

## Configuration

### Token Lifetimes (Backend)
- **Access Token**: 60 minutes (configurable via `JWT_ACCESS_TOKEN_LIFETIME_MINUTES`)
- **Refresh Token**: 7 days (configurable via `JWT_REFRESH_TOKEN_LIFETIME_DAYS`)

### Retry Configuration
```dart
// ApiClient settings
static const int _maxRefreshFailures = 2;
static const Duration _refreshBackoffBase = Duration(seconds: 1);
static const int _maxRetries = 3; // For network errors
```

### Event Deduplication
```dart
// SessionEventService
static const Duration _deduplicationWindow = Duration(seconds: 2);
```

## Testing Scenarios

### 1. Simultaneous 401 Errors
**Test**: Make multiple API calls simultaneously when token is expired
**Expected**: Only one refresh attempt, all requests wait for the same refresh

### 2. Failed Token Refresh
**Test**: Block refresh endpoint or return 401 from refresh
**Expected**: After 2 attempts with backoff, session expired event emitted, user redirected to login

### 3. Rapid Login/Logout
**Test**: Quickly log in and out multiple times
**Expected**: No memory leaks, all streams properly disposed, clean state transitions

### 4. Offline Scenario
**Test**: Disable network, make API requests
**Expected**: Network errors handled separately, not treated as session expiry

### 5. Session Expiry During Active Use
**Test**: Let access token expire naturally during app usage
**Expected**: Silent token refresh, user continues without interruption

## Memory Management

### Stream Controllers
All stream controllers use broadcast streams and are properly disposed:
- `SessionEventService._controller` - disposed in `dispose()`
- `UserService._userController` - disposed in `dispose()`
- `AuthNotifier._sessionSubscription` - cancelled via `ref.onDispose()`
- `Router._sessionSubscription` - cancelled via `ref.onDispose()`

### Completer Cleanup
```dart
// Clear completer after brief delay to allow waiting callers to complete
Future<void>.delayed(const Duration(milliseconds: 100), () {
  _refreshCompleter = null;
});
```

## Best Practices

### 1. Event Emission Order
Always emit events BEFORE clearing state:
```dart
// ✅ Correct
sessionEventService.emitLoggedOut();
await clearState();

// ❌ Wrong
await clearState();
sessionEventService.emitLoggedOut(); // Listeners can't access state anymore
```

### 2. Stream Safety
Always check if stream is closed before adding:
```dart
if (!_controller.isClosed) {
  _controller.add(event);
}
```

### 3. Error Handling
Always ensure cleanup even on errors:
```dart
try {
  await operation();
} catch (e) {
  // Handle error
} finally {
  await cleanup(); // Always runs
}
```

### 4. Idempotent Operations
Make cleanup operations idempotent (safe to call multiple times):
```dart
Future<void> clearAllSessionData() async {
  // Reset counters
  _refreshFailureCount = 0;
  _lastRefreshAttempt = null;
  
  // Clear data (safe even if already cleared)
  await logout(); // Ignores errors
}
```

## Debugging

### Enable Debug Logs
All session management components include debug logging in development mode:

```dart
if (kDebugMode) {
  debugPrint('[SessionEventService] Event emitted: $event');
  debugPrint('[ApiClient] Token refresh successful');
  debugPrint('[UserService] Stream controller disposed');
}
```

### Common Issues

**Issue**: "Session expired" error loops
**Cause**: Infinite retry without failure tracking
**Solution**: Implemented max failure count and backoff

**Issue**: Multiple token refresh attempts
**Cause**: Race condition from simultaneous 401s
**Solution**: Implemented Completer-based deduplication

**Issue**: Memory leaks after logout
**Cause**: Stream controllers not closed
**Solution**: Proper disposal in all services and providers

**Issue**: User can navigate back to protected screens after logout
**Cause**: Navigation stack not cleared
**Solution**: Use `router.go()` instead of `router.push()` for login redirect

## Migration Notes

### Breaking Changes
- `ApiClient.clearAuthState()` is deprecated in favor of `clearAllSessionData()`
- Session expiry now uses event stream instead of direct navigation

### Backwards Compatibility
```dart
@Deprecated('Use clearAllSessionData() instead')
Future<void> clearAuthState() async {
  await clearAllSessionData();
}
```

## Future Enhancements

Potential improvements for more advanced session management:

1. **Proactive Token Refresh**
   - Refresh tokens 5 minutes before expiry
   - Reduces 401 errors during active usage

2. **Session Activity Tracking**
   - Track user activity
   - Implement idle timeout warnings

3. **Multi-Device Session Management**
   - Sync session state across devices
   - Remote logout capability

4. **Offline Token Caching**
   - Cache encrypted tokens for offline use
   - Automatic sync when online

5. **Session Analytics**
   - Track session duration
   - Monitor refresh success rates
   - Identify session expiry patterns

---

**Last Updated**: 2026-10-22
**Version**: 1.0.0
**Maintained by**: Learning Hub Team

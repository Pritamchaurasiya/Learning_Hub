# LearningHub — Canonical Notifications & WebSocket Contract

This document defines the **single source of truth** for the notification and WebSocket contracts.

## Goals

1. All WebSocket connections require **authenticated** users
2. Notifications are **user-specific** (no cross-user data leak)
3. Real-time events use **server-validated** room access
4. WebSocket message rate limiting prevents abuse
5. Both backends serve identical notification shape

## Notification Model (Canonical)

Both Node (Prisma) and Django (models.Notification) expose the same shape:

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique notification ID |
| `userId` | string | Owner of the notification (always set) |
| `type` | enum | INFO, SUCCESS, WARNING, ERROR, ACHIEVEMENT, REMINDER, SYSTEM, TEST_RESULT, COURSE_COMPLETE, STREAK, CONTEST_START, CONTEST_RESULT, SUBSCRIPTION, LEVEL_UP |
| `title` | string | Notification title (max 200 chars) |
| `message` | string | Notification body |
| `isRead` | bool | Read status |
| `actionUrl` | string? | Optional URL to navigate to on click |
| `metadata` | object? | Additional structured data |
| `createdAt` | string (ISO) | When notification was created |
| `readAt` | string? (ISO) | When marked as read (if applicable) |

## Notification Endpoints

### `GET /api/v1/notifications`

**Auth:** Required
**Throttle:** 30/min

**Query params:**
- `page` (default 1)
- `limit` (default 20, max 50)
- `unread` (true|false) — filter unread only
- `type` (string) — filter by type

**Response 200:**
```json
{
  "status": "success",
  "data": [
    {
      "id": "notif-xxx",
      "type": "ACHIEVEMENT",
      "title": "🏆 Achievement Unlocked!",
      "message": "You unlocked: First Test",
      "isRead": false,
      "actionUrl": "/achievements",
      "createdAt": "2026-01-01T00:00:00Z"
    }
  ],
  "meta": { "total": 10, "unread_count": 3, "page": 1, "pages": 1 }
}
```

### `GET /api/v1/notifications/unread-count`

**Auth:** Required
**Throttle:** 30/min

**Response 200:**
```json
{ "status": "success", "data": { "count": 3 } }
```

### `PATCH /api/v1/notifications/:id/read`

**Auth:** Required
**Throttle:** 30/min

**Response 200:**
```json
{ "status": "success", "data": { "marked": true, "id": "notif-xxx" }, "message": "Notification marked as read" }
```

**SECURITY:** 404 if notification doesn't belong to user (don't leak existence).

### `POST /api/v1/notifications/mark-all-read`

**Auth:** Required
**Throttle:** 30/min

**Response 200:**
```json
{ "status": "success", "data": { "marked_count": 5 }, "message": "All notifications marked as read" }
```

### `DELETE /api/v1/notifications/:id`

**Auth:** Required
**SECURITY:** Only deletes notifications owned by the user.

**Response 200:**
```json
{ "status": "success", "data": { "deleted_count": 1 }, "message": "Notification deleted" }
```

## WebSocket Security

### Authentication (Both Backends)

**Node (Socket.IO):**
```typescript
io.use(async (socket, next) => {
  const authToken = socket.handshake.auth.token
  const cookieToken = parseCookies(socket.handshake.headers.cookie)?.access_token
  const token = authToken || cookieToken
  if (!token) return next(new Error('Authentication required'))

  const decoded = verifyAccessToken(token)
  const user = await prisma.user.findUnique({ where: { id: decoded.userId } })
  if (!user) return next(new Error('User not found'))
  if (user.deletedAt || (user.lockedUntil && user.lockedUntil > new Date())) {
    return next(new Error('Account inactive'))
  }
  socket.data.userId = decoded.userId
  next()
})
```

**Django (Channels):**
```python
async def connect(self):
    user = self.scope.get('user')
    if not user or not user.is_authenticated:
        await self.close(code=4401)  # custom auth required
        return
    self.user = user
    self.user_id = str(user.id)
```

### Rate Limiting

**Node (Socket.IO):**
- 50 connections per IP per minute
- 500ms cooldown between messages
- Message length limit: 2000 chars

**Django (Channels):**
- Default user throttle: 1000/min
- Notifications scope: 30/min (custom)
- Leaderboard scope: 60/min (custom)

### Room Access Control

**Node (Socket.IO):**
```typescript
const hasRoomAccess = async (userId, roomId) => {
  if (roomId === userId) return true
  if (roomId.startsWith('quiz-', 'test-', 'contest-', 'live-')) return true
  const testSession = await prisma.testSession.findFirst({
    where: { id: roomId, userId }
  })
  return !!testSession
}
```

**Django (Channels):**
```python
@database_sync_to_async
def _check_attempt_access(self, attempt_id, user):
    from apps.tests_engine.models import TestAttempt
    try:
        TestAttempt.objects.get(pk=attempt_id, user=user)
        return True
    except TestAttempt.DoesNotExist:
        # Proctors can monitor any attempt
        return getattr(user, 'role', None) in ('ADMIN', 'SUPERADMIN')
```

## Implementation Matrix

| Concern | Node Backend | Django Backend | Status |
|---------|--------------|----------------|--------|
| Notification model | ✅ Prisma `Notification` | ✅ `social.Notification` | ALIGNED |
| User-specific queries | ✅ `where: { userId }` | ✅ `filter(user=request.user)` | ALIGNED |
| WebSocket auth | ✅ JWT/cookie + active check | ✅ IsAuthenticated + scope user | ALIGNED |
| Connection rate limit | ✅ 50/IP/min | ⚠️ 1000/min default | DJANGO TIGHTER NEEDED |
| Message rate limit | ✅ 500ms cooldown | ⚠️ Not implemented | PARTIAL |
| Room access control | ✅ hasRoomAccess() | ✅ _check_attempt_access | ALIGNED |
| Mark-as-read security | ✅ userId check | ✅ user filter | ALIGNED |
| Delete security | ✅ userId check | ✅ user filter | ALIGNED |
| Per-user WS group | ✅ socket.join(userId) | ✅ `notifications_user_{userId}` | ALIGNED |
| Throttling on HTTP | ✅ 60/min reads | ✅ 30/min custom | ALIGNED |

## Anti-Cheat & Security Requirements

1. **NEVER trust client-supplied notification data** — all notifications are server-created
2. **All WS connections MUST require authentication** — reject anonymous with 4401
3. **Inactive accounts (deleted/locked) MUST be rejected** — check before allowing join
4. **Notifications MUST filter by `userId`** — never query without `where: { userId }`
5. **Cross-user notification access MUST 404** — don't leak existence
6. **WS message rate limiting** — prevent flooding
7. **Room access MUST be validated server-side** — clients cannot join arbitrary rooms
8. **Throttle notification endpoints** — 30/min for HTTP, 500ms cooldown for WS

## Common Attack Vectors Prevented

| Attack | Mitigation |
|--------|------------|
| **Anonymous WS connect** | Auth check in `connect()` |
| **Steal another user's notifications** | `where: { userId: req.user.id }` |
| **Spam notifications** | 30/min HTTP throttle, 500ms WS cooldown |
| **DoS via WS reconnects** | 50/IP/min connection limit |
| **Bypass auth via WebSocket** | Channels middleware requires auth user in scope |
| **XSS via notification title/message** | DOMPurify on frontend, length limit on backend |

## Migration Path

Phase 1 (DONE in this cycle):
- Add `Notification` model to Django with all fields
- Add `NotificationSerializer` and `create_notification` helper
- Fix Django notification endpoints to query real DB (not fake data)
- Add auth check to ALL Django Channels consumers
- Add room access validation to `ExamMonitoringConsumer`
- Add throttling to notification/leaderboard HTTP endpoints
- Document canonical notifications contract
- Add WebSocket security test

Phase 2 (TODO):
- Add notification preferences model (per-user mute categories)
- Add WebSocket connection reconnection logic on frontend
- Add notification push for email/SMS
- Add notification search/filter API
- Implement WebSocket event replay on reconnect

## Related Documentation

- `CANONICAL_AUTH_CONTRACT.md` — Auth token handling
- `ANTI_CHEAT_TIMER.md` — Anti-cheat patterns
- `CANONICAL_GAMIFICATION_CONTRACT.md` — XP/badges/streaks

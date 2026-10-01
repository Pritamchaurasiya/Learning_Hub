# LearningHub — Anti-Cheat & Server-Side Timer Enforcement

This document defines the **canonical security contract** for timer enforcement and anti-cheat in the LearningHub test engine.

## Why Server-Side Timer Enforcement is Critical

**Client-side timer is not security.** A motivated user can:
1. Open DevTools
2. Override `Date.now()` or `setInterval`
3. Submit with manipulated `timeSpentSeconds`
4. Get an inflated score, XP, or time-based ranking

**Server MUST compute and trust its own time.**

## Canonical Timer Enforcement Contract

### Rules

1. **Server is the source of truth for time.**
   - Server computes `actualTime = now() - startedAt`
   - Server uses `MAX(clientTime, actualTime)` to detect cheating
   - Cheaters cannot make their time appear LOWER than reality (because server time wins)

2. **Timeout is a terminal state — two accepted encodings (canonical clarification).**
    - If `actualTime > timeLimit` → the attempt is over-time. Backends encode this as **either**:
      - `status: "TIMEOUT"` (strict timeout), **or**
      - `status: "SUBMITTED"` **plus** `time_overrun: true` (+ `server_time_validated: true`)
    - Both encodings are valid terminal states. **Frontends and idempotency checks MUST accept either** (`TIMEOUT` OR `SUBMITTED`+`time_overrun`) as "already submitted, do not re-score".
    - Reduce XP for timeout (encourages finishing on time)
    - User can still see their score (fair to user)

3. **Suspiciously fast submissions are rejected.**
   - If `timeLimit > 60s` AND `actualTime < 5s` → reject as suspicious
   - Prevents automation/bot cheating

4. **Idempotency preserved.**
   - Even if timer is wrong on first submission, subsequent calls return same result
   - XP not double-awarded

## Implementation Pattern (Both Backends)

### Node Backend (TestScoringService.ts)

```typescript
const timeLimitSeconds = test.timeLimit * 60
let actualTimeTaken = typeof timeTaken === 'number' ? Math.max(0, timeTaken) : 0

if (existingResult?.startedAt) {
  const serverTimeTaken = Math.floor((Date.now() - existingResult.startedAt.getTime()) / 1000)
  // Server time wins if client is being modest
  if (serverTimeTaken > actualTimeTaken + 10) {
    actualTimeTaken = serverTimeTaken
  }
}

const isOverTime = actualTimeTaken > timeLimitSeconds
const finalStatus: AttemptStatus = isOverTime ? 'TIMEOUT' : 'COMPLETED'
```

### Django Backend (tests_engine/views.py)

```python
client_time_spent_seconds = int(request.data.get('timeSpentSeconds') or 0)
server_time_spent_seconds = 0
if attempt.started_at:
    server_time_spent_seconds = int((timezone.now() - attempt.started_at).total_seconds())

# Server wins
actual_time_spent_seconds = max(client_time_spent_seconds, server_time_spent_seconds)
time_spent_seconds = actual_time_spent_seconds

time_limit_seconds = test.duration_minutes * 60
is_over_time = time_limit_seconds > 0 and time_spent_seconds > time_limit_seconds

if not already_submitted and is_over_time:
    attempt.status = 'TIMEOUT'
    attempt.save(update_fields=['time_spent_seconds', 'submitted_at', 'status'])
```

## Response Shape (Canonical)

When submission completes (success, timeout, or duplicate), response includes:

```json
{
  "status": "success",
  "data": {
    "attempt_id": "att-1",
    "status": "COMPLETED" | "TIMEOUT" | "SUBMITTED",
    "score": 80,
    "time_taken": 1200,          // server-validated
    "timeTaken": 1200,            // camelCase alias
    "time_limit": 60,
    "time_limit_seconds": 3600,
    "server_time_validated": true,
    ...
  },
  "message": "Test evaluated and scored successfully"
}
```

For timeout:
- `status: "TIMEOUT"`
- `message: "Test time exceeded. Marked as TIMEOUT."`
- HTTP 200 (not 201, since not a "new" submission success)
- XP reduced to 10 (vs 50 for pass, 20 for fail)

## Backend Implementation Matrix

| Concern | Node Backend | Django Backend | Status |
|---------|--------------|----------------|--------|
| Server time computation | ✅ Lines 77-85 of TestScoringService | ✅ Lines 224-237 of tests_engine/views.py | ALIGNED |
| MAX(client, server) | ✅ Line 82-84 | ✅ Line 236 | ALIGNED |
| TIMEOUT status | ✅ Line 88, sets to TIMEOUT | ✅ Sets to TIMEOUT when over time | ALIGNED |
| Reduced XP for timeout | ✅ Not seen in controller (TODO) | ✅ 10 XP for timeout | PARTIAL (Node TODO) |
| Response includes timer flags | ✅ Added `server_time_validated`, `time_limit_seconds` | ✅ Added `time_overrun`, `server_time_validated` | ALIGNED |
| Reject too-fast submissions | ❌ Not implemented | ⚠️ `is_too_fast` flag set but not rejected | TODO |

## Edge Cases Handled

1. **Resume mid-test** — Started_at preserved across sessions
2. **Network latency** — Server uses actual elapsed time, not just request time
3. **Time zone changes** — Server uses UTC throughout
4. **Clock skew** — Client cannot make server time appear LATER (only earlier, which is rejected)
5. **Concurrent submissions** — Database transaction ensures atomicity
6. **Retry on timeout** — Idempotent: returns existing result

## Tests

### Unit Tests (Node)
- ✅ `enforces server-side timer: marks TIMEOUT when over time limit`
- ✅ `anti-cheat: server time wins over client-supplied time`

### Integration Tests (TODO)
- [ ] Test timer across multi-device resume
- [ ] Test clock manipulation detection
- [ ] Test suspicious fast submission rejection

## Migration Path

Phase 1 (DONE in this cycle):
- Add server time validation to Django submit endpoint
- Add TIMEOUT status handling in Django
- Add `time_overrun` and `server_time_validated` to response
- Add 2 new Node tests for timer enforcement
- Document anti-cheat contract

Phase 2 (TODO):
- Add too-fast rejection to both backends
- Add suspicious activity logging
- Add anomaly detection (rapid retries, etc.)
- Add CAPTCHA after N failed attempts

## Related Documentation

- `CANONICAL_TEST_ENGINE_CONTRACT.md` — Full test engine contract
- `CANONICAL_AUTH_CONTRACT.md` — Auth token handling

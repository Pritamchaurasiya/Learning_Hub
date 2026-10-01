# LearningHub — Canonical AI Safety & Integration Contract

This document defines the **single source of truth** for AI service safety, rate limiting, and fallback behavior.

## CRITICAL Architecture Rule

> **AI must NEVER be a hard dependency for core platform functionality.**

This means:
- All AI endpoints MUST work in NO_AI mode (server-side fallback)
- Platform must function if AI provider is unavailable, slow, or expensive
- No AI cost can block user access to courses, tests, or content

## AI Modes (Canonical)

| Mode | Behavior | Use Case |
|------|----------|----------|
| `NO_AI` | Skip AI entirely, use deterministic content (question bank, rules) | Default for free tier, dev mode, cost control |
| `AI_OPTIONAL` | Use AI when available, fall back to deterministic | Pro tier, user preference |
| `AI_REQUIRED` | Require AI, fail if unavailable | Premium features that need AI |
| `HYBRID` | Mix AI and deterministic (best of both) | Adaptive learning paths |

## Required Endpoints (Node Backend)

| Endpoint | Rate Limit | AI Mode | Auth |
|----------|-----------|---------|------|
| `POST /ai/tutor` | 5/min | All | Required |
| `POST /ai/tutor/stream` | 5/min | All | Required |
| `POST /ai/generate-test` | 2/min | All | Required |
| `POST /ai/code-review` | 5/min | All | Required |
| `POST /ai/ebook/summarize-chapter` | 5/min | All | Required |
| `POST /ai/ebook/explain-paragraph` | 5/min | All | Required |

## Required Endpoints (Django Backend)

| Endpoint | Rate Limit | AI Mode | Auth |
|----------|-----------|---------|------|
| `POST /ai/chat` (AITutorQueryView) | 10/min | All | Required |
| `POST /ai/chat/stream` (AITutorStreamView) | 10/min | All | Required |
| `POST /ai/code-review` (AICodeReviewView) | 10/min | All | Required |
| `GET /ai/recommendations` (AIRecommendationsView) | 10/min | All | Required |
| `POST /ai/study-plan` (GenerateStudyPlanView) | 10/min | All | Required |

## AI Safety Pipeline

```
CLIENT REQUEST
  ↓
[1] AUTH CHECK
  ↓ (authenticated user only)
[2] RATE LIMIT CHECK
  ↓ (within user/anon limits)
[3] PROMPT SANITIZATION
  ↓ (strip control chars, truncate, remove injection attempts)
[4] LENGTH VALIDATION
  ↓ (max 2000 chars for prompt, 50000 for code)
[5] AI MODE CHECK
  ↓
  ├─ NO_AI → Use deterministic fallback (no AI call)
  ├─ AI_OPTIONAL/HYBRID → Try AI, fall back on error
  └─ AI_REQUIRED → Call AI, fail with 503 if unavailable
[6] AI PROVIDER CALL (with timeout)
  ↓
[7] RESPONSE VALIDATION
  ↓ (schema check, content moderation)
[8] DATABASE PERSISTENCE (if needed)
  ↓
[9] CLIENT RESPONSE (with metadata)
```

## Rate Limiting Strategy

### Unified Limits Table (canonical — both backends)

| Endpoint class | Node limit | Django limit | Why they differ |
|----------------|-----------|--------------|-----------------|
| AI tutor / chat / stream / code-review / ebook / recommendations / study-plan | 5/min per user | 10/min per user | **Intentional during migration:** Node is the cost-constrained production path (tighter), Django is the migration target under test (looser). Do not "align" without a cost decision. |
| AI test generation | 2/min per user | 2/min equivalent (study-plan/test-gen path) | Expensive op — same on both |
| Anonymous (unauthenticated, where allowed) | 3/min | 3/min | Stricter, no account = lower limit |

### Cost Control
- AI tutor: 5/min (Node) / 10/min (Django) per user — see table above
- AI test generation: 2/min per user (expensive operation)
- Code review: 5/min (Node) / 10/min (Django) per user
- Anon users: 3/min (stricter, no account = lower limit)

### Implementation
Both backends:
- Use `UserRateThrottle` (DRF) / `createRateLimiter` (Express)
- Per-user/per-IP tracking
- HTTP 429 on exceeded
- Rate limit headers in response

## Prompt Injection Protection

### Defenses
1. **Length limits:** Max 2000 chars for prompt, 50000 for code
2. **Character filtering:** Strip control characters
3. **Content validation:** Check for known injection patterns
4. **System prompt isolation:** System prompt is separate, never user-controllable
5. **Response validation:** Verify AI response is safe before persisting

### Common Attack Vectors Blocked
- "Ignore previous instructions and..." → Truncated/length-limited
- 10000-token prompt to exhaust quota → Max 2000 chars enforced
- Repeated identical requests to spam → Rate limit
- Code injection via prompt → Code submitted to separate `code` field, validated
- Cross-user data leak via prompt → All responses are user-scoped

## NO_AI Mode Implementation (Mandatory)

### Node Backend
```typescript
if (req.aiMode === 'NO_AI') {
  return this.generateFromQuestionBank(req, questionCount, timeLimit)
}
```

### Django Backend
The `AITutorEngine` has fallback responses when Gemini is unavailable:
- If `GOOGLE_API_KEY` not set → use rule-based response
- If Gemini API throws → use rule-based response
- Rule-based response is always available

## Implementation Matrix

| Concern | Node Backend | Django Backend | Status |
|---------|--------------|----------------|--------|
| Auth required | ✅ Yes | ❌ → ✅ FIXED | ALIGNED |
| Rate limiting | ✅ 5/min (2/min for tests) | ❌ → ✅ ADDED (10/min) | ALIGNED |
| Prompt length limit | ✅ In Zod schemas | ❌ → ✅ ADDED (2000) | ALIGNED |
| NO_AI mode | ✅ Native in AITestService | ✅ Fallback responses | ALIGNED |
| Mock provider | ✅ MockAIAdapter | ✅ Rule-based engine | ALIGNED |
| User-specific data | ✅ Always | ❌ → ✅ FIXED | ALIGNED |
| Cross-user data leak | ✅ None | ❌ → ✅ FIXED | ALIGNED |
| Response schema validation | ⚠️ Partial | ⚠️ Partial | TODO |
| Content moderation | ❌ | ❌ | TODO |
| Cost tracking | ❌ | ❌ | TODO |
| Anomaly detection | ❌ | ❌ | TODO |

## Security Rules (CRITICAL)

1. **NEVER trust client-supplied AI mode** — Server validates `ai_mode` is in allowed enum
2. **NEVER skip auth on AI endpoints** — Even "free" AI tutor must require auth
3. **NEVER fall back to "first user"** — If not authenticated, return 401
4. **NEVER expose other users' chat sessions** — Filter by `user=request.user`
5. **NEVER store full AI responses without sanitization** — Strip PII, validate format
6. **NEVER skip rate limiting** — Even on "free" endpoints
7. **NEVER bypass validation in dev mode** — Same rules apply everywhere
8. **NEVER log full prompts in production** — Log only metadata, not content

## AI Provider Configuration

### Node Backend (`AIServiceFactory`)
```typescript
// Default: Gemini with MockAIAdapter fallback
AIServiceFactory.initialize('gemini')  // or 'mock'

// Environment variable: AI_PROVIDER
// Values: 'gemini' | 'openai' | 'anthropic' | 'mock'
```

### Django Backend
- Uses `google-genai` SDK
- Reads `GOOGLE_API_KEY` from environment
- Falls back to rule-based if key missing or API call fails
- NO_AI mode is implicit (no AI call made)

## AI Cost Control

### Per-User Limits
- Daily AI calls: 100 (configurable)
- Monthly token budget: tracked per user
- Rate limit per minute: 5-10 (per endpoint)

### Global Limits
- Total daily AI spend: alarm at $X
- Per-user cost anomaly detection
- Automatic downgrade to NO_AI mode if budget exceeded

### Tracking
- Log: user_id, endpoint, tokens_used, response_time, status
- Aggregate: daily/monthly cost reports
- Alert: anomaly detection (spike in usage)

## Migration Path

Phase 1 (DONE in this cycle):
- Fix Django AI tutor: require auth, rate limit, prompt sanitization
- Add IsAuthenticated to all Django AI endpoints
- Remove "first user" fallback (use real user)
- Verify session ownership before use
- Remove fake recommendation data
- Add throttle classes for AI endpoints
- Add MAX_PROMPT_LENGTH and MAX_CODE_LENGTH
- Add _sanitize_prompt helper
- Document canonical AI safety contract

Phase 2 (TODO):
- Add response schema validation
- Add content moderation (toxicity filter)
- Add cost tracking and alerting
- Add anomaly detection
- Implement AI provider abstraction in Django
- Add AI usage dashboard for admins
- Implement tier-based AI limits (free vs pro)

## Related Documentation

- `CANONICAL_AUTH_CONTRACT.md` — Auth token handling
- `CANONICAL_TEST_ENGINE_CONTRACT.md` — AI test generation
- `ANTI_CHEAT_TIMER.md` — Anti-cheat patterns
- `PERFORMANCE_OPTIMIZATION.md` — Performance considerations

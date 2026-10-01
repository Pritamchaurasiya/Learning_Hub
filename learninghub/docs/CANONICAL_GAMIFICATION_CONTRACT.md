# LearningHub — Canonical Gamification API Contract

This document defines the **single source of truth** for the gamification domain (XP, levels, streaks, badges, leaderboard).

## Goals

1. XP is **server-authoritative** — clients cannot grant themselves XP
2. Streak calculation is **timezone-consistent** (UTC) and **race-safe**
3. Leaderboard is **server-computed** with proper auth
4. Badges are **idempotent** — same condition never awards twice
5. All gamification events are **auditable**

## XP Awards — Canonical Reward Table

| Action | XP Awarded | Cap | Atomic | Idempotent |
|--------|------------|-----|--------|------------|
| `test_completed` | 10 | 10 | ✅ | ✅ (per attempt) |
| `test_passed` | 25 | 25 | ✅ | ✅ (per attempt) |
| `perfect_score` | 50 | 50 | ✅ | ✅ (per attempt) |
| `daily_goal_met` | 15 | 15 | ✅ | ✅ (per day) |
| `streak_milestone` | 30 | 30 | ✅ | ✅ (per milestone) |
| `achievement_unlocked` | 20 | 20 | ✅ | ✅ (per achievement) |
| `first_test` | 25 | 25 | ✅ | ✅ (per user, once) |
| `practice_session` | 5 | 5 | ✅ | ⚠️ (per session) |

**RULE:** Max single XP award is 50. No action grants more.

## Streak Rules

**Server-computed, timezone-aware:**

1. **Streak counts consecutive days of activity**
2. **Day boundary = UTC midnight** (not user's local timezone)
3. **Activity = any learning event** (test start, lesson complete, problem submit, etc.)
4. **Streak milestones:** 7, 30, 100 days
5. **Streak awards XP once per milestone** (no double-awarding)
6. **Grace period:** 36 hours (so timezone differences don't break streaks)

**Race-safe implementation:**

- Use optimistic concurrency: `WHERE id = ? AND streak = ?` (Prisma)
- Re-read on conflict, recalculate, retry up to 3 times
- Use database transaction for all streak operations
- **Never** allow client to set streak directly

## Leaderboard Rules

**Server-computed:**

1. **Sort by XP (descending)**
2. **Filter:** `is_active = true AND xp > 0` (no empty accounts)
3. **Pagination:** Top 50 by default
4. **Soft-deleted users excluded**
5. **Caching:** 5-minute cache to reduce DB load
6. **Auth:** `/leaderboard/me` requires authentication
7. **No PII leak:** Return only `username`, `avatar`, `xp`, `level`, `streak` — NOT email, NOT profile

## Badge Rules

**Idempotent:**

1. **Condition-based:** Each badge has a function `condition: (stats) => boolean`
2. **Unique constraint:** `(userId, achievementId)` — cannot award same badge twice
3. **Audit trail:** Log every badge award with timestamp
4. **Server-side trigger:** Badges are awarded by backend, not client

**Available Badges:**

| ID | Name | Condition |
|----|------|-----------|
| `first_test` | First Step | Total tests >= 1 |
| `first_pass` | Breakthrough | Total passed >= 1 |
| `perfect_score` | Perfectionist | Perfect scores >= 1 |
| `streak_7` | Week Warrior | Longest streak >= 7 |
| `streak_30` | Monthly Machine | Longest streak >= 30 |
| `streak_100` | Unstoppable | Longest streak >= 100 |
| `level_5` | Rising Star | Level >= 5 |
| `level_10` | Expert | Level >= 10 |

## Daily Goals

**Server-validated — Model `DailyGoal` (`django_backend/apps/gamification/models.py:40`):**

| Field | Type | Default | Notes |
|-------|------|---------|-------|
| `user` | FK `User` | — | `related_name='daily_goals'`, part of `unique_together` |
| `date` | `DateField` | `timezone.now` | part of `unique_together = ('user', 'date')` |
| `target_xp` | `IntegerField` | 100 | daily target |
| `earned_xp` | `IntegerField` | 0 | progress toward target |
| `is_completed` | `BooleanField` | `False` | `True` when `earned_xp >= target_xp` |

**Constraints & Rules:**

1. **Per-user, per-day** (`unique_together = ('user', 'date')` — `Meta.db_table = 'lh_daily_goals'`)
2. **Default target:** `target_xp = 100` XP per day
3. **Progress tracked:** `earned_xp` vs `target_xp`; `is_completed` derived as `earned_xp >= target_xp`
4. **Max XP per request:** 50 (anti-cheat cap)
5. **Hard cap per day:** 1000 XP (prevents grinding)
6. **XP must be earned through legitimate activities** — never via arbitrary client input

## Security Requirements

1. **No client-supplied XP amounts** — XP is awarded by backend only
2. **All gamification endpoints require authentication** (except public leaderboard)
3. **No fake/hardcoded data** in production endpoints
4. **All XP changes logged** for audit
5. **Leaderboard excludes test/sandbox users**

## Backend Implementation Matrix

| Concern | Node Backend | Django Backend | Status |
|---------|--------------|----------------|--------|
| XP atomic increment | ✅ `xp: { increment: amount }` | ✅ `F('xp') + value` | ALIGNED |
| XP level calculation | ✅ Math-based | ✅ `F('xp') + value` | ALIGNED |
| Streak calculation | ✅ Race-safe (optimistic concurrency) | ⚠️ Manual via login | PARTIAL |
| Streak timezone | ✅ UTC | ⚠️ `timezone.now()` (Django TZ) | DJANGO OK |
| Badge criteria | ✅ Function-based | ✅ Hardcoded in views | ALIGNED |
| Leaderboard auth | ⚠️ Check needed | ✅ Now IsAuthenticated | ALIGNED |
| Daily goal XP cap | ❌ No cap | ✅ Now capped at 50/1000 | DJANGO FIXED |
| Notification user-specific | ❌ Not user-specific | ✅ Now user-specific | DJANGO FIXED |
| Fake data in responses | ❌ Hardcoded fake data | ⚠️ Removed | DJANGO FIXED |

## Migration Path

Phase 1 (DONE in this cycle):
- Add XP cap (50) and daily cap (1000) to Django `DailyGoalView`
- Remove fake data from Django leaderboard (courses_completed, targetCollege)
- Require authentication for Django `LeaderboardMeView`
- Require authentication for Django notification endpoints
- Return user-specific notification data
- Add 2 new Node tests for XP atomicity and security
- Document canonical gamification contract

Phase 2 (TODO):
- Implement Notification model in Django (or add to Node)
- Add WebSocket-based real-time leaderboard
- Add Prometheus metrics for XP awards
- Implement server-side activity detection (for streak maintenance)

## Anti-Cheat Patterns

1. **Atomic operations:** Use `increment`/`F()` — never read-modify-write
2. **Optimistic concurrency:** Use `WHERE col = old_value` for race detection
3. **Server-computed values:** Client never sets XP, streak, or badge
4. **Hard caps:** Max single award, max daily, max level jump
5. **Audit log:** Every XP change logged
6. **Anomaly detection:** Flag rapid XP gains for review

## Related Documentation

- `CANONICAL_AUTH_CONTRACT.md` — Auth token handling
- `CANONICAL_TEST_ENGINE_CONTRACT.md` — Test scoring (XP source)
- `CANONICAL_COURSE_CONTRACT.md` — Course completion (XP source)
- `ANTI_CHEAT_TIMER.md` — Anti-cheat patterns

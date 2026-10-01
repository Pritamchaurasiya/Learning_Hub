# LearningHub — Performance Optimization Guide

This document describes the **performance optimizations** applied across the LearningHub platform.

## Performance Issues Found

### Backend: N+1 Queries

| Location | Issue | Fix |
|----------|-------|-----|
| `django_backend/apps/tests_engine/views.py` SubmitTestView | For each question in `test.questions.all()`, did `q.options.all()` — N+1 queries (N+1 with N questions) | Refetch test with `prefetch_related('questions__options')`, build O(1) options map |
| `django_backend/apps/tests_engine/views.py` StartTestView | Already uses `prefetch_related('questions__options')` ✓ | None needed |
| `django_backend/apps/tests_engine/views.py` TestAttemptDetailView | Already uses `prefetch_related('test__questions__options', 'answers__selected_option')` ✓ | None needed |
| `django_backend/apps/tests_engine/scoring.py` IRT engine | Already uses `prefetch_related('options')` ✓ | None needed |

### Backend: Missing Indexes

| Model | Field | Index Type | Reason |
|-------|-------|-----------|--------|
| `Order` | `idempotency_key` | btree | Fast idempotency lookup during checkout |
| `Order` | `(status, created_at)` | composite | Fast webhook processing |
| `Notification` | `(user, is_read, created_at)` | composite | Fast unread listing |
| `Notification` | `(user, type, created_at)` | composite | Fast type filter |

### Frontend: Already Optimized

The frontend already implements:

1. **Route-level code splitting:** All non-critical pages use `React.lazy()` and `Suspense`
2. **Critical page eager loading:** HomePage, AuthPage, ProfilePage, TestsAPage are eagerly loaded
3. **TanStack Query caching:** Server state cached and shared across components
4. **Zustand stores:** Lightweight client state management
5. **IndexedDB service worker:** Offline support via MSW
6. **Image lazy loading:** Native `loading="lazy"` for images
7. **Error boundaries:** Granular error handling prevents full-page crashes

## Performance Rules Going Forward

### Rule 1: No N+1 Queries in Django

**Always** use:
- `select_related('fk1__fk2')` for ForeignKey/OneToOneField
- `prefetch_related('m2m_field', 'reverse_fk__nested')` for ManyToManyField and reverse ForeignKey
- `values()` / `values_list()` for read-only queries that don't need ORM objects

**Anti-pattern:**
```python
for q in test.questions.all():
    for o in q.options.all():  # ❌ N+1
        ...
```

**Correct pattern:**
```python
test = Test.objects.prefetch_related('questions__options').get(pk=pk)
for q in test.questions.all():  # ✓ 1 query for all questions
    for o in q.options.all():  # ✓ 1 query for all options (prefetched)
        ...
```

### Rule 2: No N+1 Queries in Prisma

**Always** use:
- `include: { relation: true }` for single relations
- `include: { collection: true }` for arrays
- `select: { ... }` to limit fields when not all are needed

**Anti-pattern:**
```typescript
const tests = await prisma.test.findMany()
for (const test of tests) {
  const questions = await prisma.question.findMany({ where: { testId: test.id } })  // ❌ N+1
}
```

**Correct pattern:**
```typescript
const tests = await prisma.test.findMany({
  include: { questions: true }  // ✓ 1 query with JOIN
})
```

### Rule 3: Pagination Everywhere

All list endpoints MUST have pagination. No "return all" endpoints that could fetch thousands of rows.

### Rule 4: Cache Hot Data

Use Redis or in-memory cache for:
- Course lists (5min TTL)
- Test questions (15min TTL, invalidate on update)
- Leaderboard top 50 (1min TTL)
- User profile (5min TTL, invalidate on update)

### Rule 5: Slow Query Logging

Log all queries > 100ms. Use `django.db.connection.queries` (DEBUG) or Prometheus instrumentation (production).

## Frontend Performance Best Practices

1. **Lazy load routes** with `React.lazy()` — DONE
2. **Memoize expensive computations** with `useMemo` — depends on usage
3. **Stable callback references** with `useCallback` — depends on usage
4. **Avoid unnecessary re-renders** with proper React.memo
5. **Use Virtual DOM efficiently** — minimize prop changes
6. **Bundle splitting** — current setup has good defaults
7. **Image optimization** — use WebP, srcset, lazy loading
8. **Service Worker** — MSW for offline + caching

## Performance Metrics (Targets)

| Metric | Target | Current |
|--------|--------|---------|
| Backend p50 response time | < 100ms | Unknown (need measurement) |
| Backend p99 response time | < 1s | Unknown |
| Frontend TTI (Time to Interactive) | < 2s | Unknown |
| Frontend TBT (Total Blocking Time) | < 200ms | Unknown |
| Initial JS bundle size | < 500KB | Unknown |
| Largest Contentful Paint (LCP) | < 2.5s | Unknown |
| First Input Delay (FID) | < 100ms | Unknown |
| Cumulative Layout Shift (CLS) | < 0.1 | Unknown |

**Action needed:** Set up Prometheus + Grafana for backend metrics, and Lighthouse CI for frontend metrics.

## Anti-Performance Patterns to Avoid

1. **Returning all rows** — Always paginate
2. **Computing on every request** — Cache computed values
3. **N+1 queries** — Use eager loading
4. **Full-text search without index** — Add GIN index for PostgreSQL
5. **Large payload responses** — Return only needed fields
6. **Synchronous I/O in request path** — Use async
7. **Loading all frontend pages at startup** — Use lazy loading
8. **Large images** — Optimize before serving
9. **No HTTP caching** — Set Cache-Control headers

## Performance Test Strategy

1. **Backend:** Add pytest-benchmark for endpoint latency tests
2. **Database:** Use `EXPLAIN ANALYZE` on slow queries
3. **Frontend:** Use Lighthouse CI in GitHub Actions
4. **Bundle:** Use `vite-bundle-visualizer` to track bundle size

## Related Documentation

- `CANONICAL_AUTH_CONTRACT.md` — Auth performance considerations
- `CANONICAL_TEST_ENGINE_CONTRACT.md` — Test engine performance
- `CANONICAL_GAMIFICATION_CONTRACT.md` — Leaderboard caching

# LEARNINGHUB STUDENT UPDATES HUB — PRODUCTION DEPLOYMENT CHECKLIST

> **Target Release:** LearningHub Updates Hub V1.0  
> **Environment:** Staging / Production  
> **Date:** September 2026  

---

## 1. PRE-DEPLOYMENT GATES

- [ ] **Database Schema & Migrations:**
  - [ ] Django migrations for `apps.updates` executed without error.
  - [ ] Composite database indexes verified: `(category, published_at)`, `(user, is_read)`, `content_hash`.
  - [ ] Seed sources loaded into `lh_update_sources` (MGKVP, SSC, NTA, AKTU).
- [ ] **Security & SSRF Hardening:**
  - [ ] `validate_safe_external_url` enforces private IP, loopback, and metadata blocking.
  - [ ] DOMPurify configured on frontend; Bleach configured on backend.
  - [ ] Snyk SAST & dependency audit executed with 0 High/Critical findings.
  - [ ] RBAC verification: Only `IsAdminUserRole` can access source editing or manual ingestion.
- [ ] **Background Workers & Caching:**
  - [ ] Celery Beat schedule registered for `poll_registered_sources` and `check_scheduled_reminders`.
  - [ ] Redis distributed lock active on `lock:update_source_{id}`.
  - [ ] Channels WebSocket `/ws/notifications/` connected and receiving authenticated events.
- [ ] **Cross-Feature Verification:**
  - [ ] Cross-linking verified between `StudentUpdate` -> `Test` (Test A+), `Ebook`, and `Course`.
  - [ ] Deep links navigate cleanly without page reloads.
- [ ] **Frontend & UX:**
  - [ ] Sidebar and MobileNav navigation links present with `BellRing` icon and active state indicator.
  - [ ] Urgent notices rendered with measured visual hierarchy (no false red sirens).
  - [ ] Zero layout shift (CLS < 0.05), LCP < 1.5s.
  - [ ] Mobile responsive layout verified across 375px, 768px, 1024px, and 1440px.

---

## 2. ROLLBACK & INCIDENT RECOVERY PLAN

1. **Source Outage / Spam Protection:**
   - If an external university website enters infinite redirection or emits malformed notices, disable the source via:
     `PATCH /api/v1/updates/admin/sources/{source_id}/ {"is_enabled": false}`
2. **Notification Killswitch:**
   - Feature flag `STUDENT_UPDATES_NOTIFICATIONS_ENABLED=False` immediately silences outbound push and email alerts while keeping in-app feeds active.
3. **Database Rollback:**
   - `python manage.py migrate updates zero` cleanly reverses tables without affecting `lh_users` or other core domain apps.

# LearningHub — Cycle 18: Node→Django Migration Plan (Course + Cart)

## Migration Overview
**Objective:** Fully migrate Course and Cart/Payment domains from Node/Express to Django/DRF
**Timeline:** 1 week (5 working days)
**Risk Level:** Medium (careful data migration required)
**Rollback:** Feature flags + blue-green deployment

---

## MIGRATION SCOPE

### Phase 1: Course Domain Migration (Days 1-3)
| Component | Node (Current) | Django (Target) | Status |
|-----------|---------------|-----------------|--------|
| Course Model | Test (proxy) | Native Course/Chapter/Lesson | ✅ Done |
| Enrollment | TestResult proxy | Native Enrollment | ✅ Done |
| Progress | TestResult.progress | Native progress field | ✅ Done |
| Reviews | CourseReview | CourseReview | ✅ Done |
| Bookmarks | - | CourseBookmark | ✅ Done |
| Categories | - | Course.categories | ✅ Done |

### Phase 2: Cart/Payment Migration (Days 3-4)
| Component | Node (Current) | Django (Target) | Status |
|-----------|---------------|-----------------|--------|
| Cart | In-memory Map | lh_carts (PostgreSQL) | ✅ Done |
| Cart Items | In-memory array | lh_cart_items (FK to Course) | ✅ Done |
| Coupons | In-memory | Coupon model | ✅ Done |
| Checkout | In-memory | Order (PENDING) + Webhook | ✅ Done |
| Orders | In-memory Map | Order/OrderItem models | ✅ Done |
| Payments | Stripe stub | Webhook + Stripe SDK | ⚠️ Partial |
| Certificates | In-memory | Certificate model | ✅ Done |

### Phase 3: Feature Parity Verification (Day 5)
- API contract testing
- Load testing
- Data migration validation
- Feature flag cutover

---

## MIGRATION STRATEGY: BLUE-GREEN WITH FEATURE FLAGS

### Feature Flag Strategy
```python
# settings.py
MIGRATION_FLAGS = {
    'COURSE_DOMAIN_DJANGO': True,      # Enable Django course endpoints
    'CART_DOMAIN_DJANGO': True,        # Enable Django cart endpoints
    'PAYMENTS_DJANGO': False,          # Keep Node for payments (Stripe)
    'COURSE_LEGACY_FALLBACK': False,   # Disable Node course fallback
    'CART_LEGACY_FALLBACK': False,     # Disable Node cart fallback
}
```

### API Routing Strategy
```
# During migration (feature flags ON):
/api/v1/courses/*        -> Django (COURSE_DOMAIN_DJANGO=True)
/api/v1/commerce/cart/*  -> Django (CART_DOMAIN_DJANGO=True)
/api/v1/checkout         -> Django (CART_DOMAIN_DJANGO=True)
/api/v1/payments/*       -> Node (PAYMENTS_DJANGO=False)  # Stripe stays on Node
/api/v1/ai/*             -> Django (already migrated)
/api/v1/gamification/*   -> Django (already migrated)

# Legacy fallback (feature flag OFF)
/api/v1/courses/*        -> Node (legacy)
/api/v1/commerce/cart/*  -> Node (legacy)
```

---

## DATA MIGRATION PLAN

### Step 1: Course Data Migration (Day 1 Morning)
```python
# migration_scripts/migrate_courses.py
def migrate_courses():
    """Migrate courses from Node Test model to Django Course/Chapter/Lesson"""
    courses_migrated = 0
    for test in Test.objects.filter(is_published=True):
        # Create Course
        course = Course.objects.create(
            id=f"crs-{test.id[:8]}",
            title=test.title,
            slug=slugify(test.title),
            description=test.description,
            short_description=test.description[:200],
            instructor=test.creator,
            category=test.category,
            level=test.difficulty,
            price=Decimal('0.00'),  # Free courses initially
            duration_hours=test.time_limit,
            is_published=test.is_published,
        )
        
        # Create Chapters from test sections
        for i, section in enumerate(test.sections.all()):
            chapter = Chapter.objects.create(
                id=f"chp-{section.id[:8]}",
                course=course,
                title=section.title,
                order=i
            )
            
            # Create Lessons from questions
            for j, question in enumerate(section.questions.all()):
                Lesson.objects.create(
                    id=f"lsn-{question.id[:8]}",
                    chapter=chapter,
                    title=question.text[:200],
                    content=question.explanation or '',
                    duration_minutes=5,
                    order=j,
                    is_free_preview=question.is_free,
                )
        
        courses_migrated += 1
    
    return courses_migrated
```

### Step 2: Enrollment Migration (Day 1 Afternoon)
```python
# migration_scripts/migrate_enrollments.py
def migrate_enrollments():
    """Migrate TestResult -> Enrollment"""
    enrollments_migrated = 0
    for result in TestResult.objects.filter(status='COMPLETED'):
        enrollment, created = Enrollment.objects.get_or_create(
            user=result.user,
            course_id=f"crs-{result.test_id[:8]}",
            defaults={
                'progress': Decimal(str(result.percentage)),
                'status': 'COMPLETED' if result.passed else 'IN_PROGRESS',
                'enrolled_at': result.started_at,
                'completed_at': result.completed_at if result.passed else None,
            }
        )
        if created:
            enrollments_migrated += 1
    return enrollments_migrated
```

### Step 3: Lesson Progress Migration
```python
# migration_scripts/migrate_lesson_progress.py
def migrate_lesson_progress():
    """Migrate TestAttemptAnswer -> LessonProgress"""
    for attempt in TestAttempt.objects.filter(status__in=['SUBMITTED', 'COMPLETED']):
        enrollment = Enrollment.objects.get(
            user=attempt.user,
            course_id=f"crs-{attempt.test_id[:8]}"
        )
        for answer in AttemptAnswer.objects.filter(attempt=attempt):
            question = answer.question
            lesson = Lesson.objects.filter(
                chapter__course_id=f"crs-{attempt.test_id[:8]}",
                title__icontains=question.text[:50]
            ).first()
            if lesson:
                LessonProgress.objects.update_or_create(
                    user=attempt.user,
                    lesson=lesson,
                    defaults={
                        'completed': answer.is_correct,
                        'completed_at': attempt.submitted_at if answer.is_correct else None,
                    }
                )
```

### Step 4: Cart & Orders Migration
```python
# migration_scripts/migrate_cart_orders.py
def migrate_cart_orders():
    """Migrate Node in-memory cart/orders to Django"""
    # Note: Node cart is in-memory, so only migrate completed orders
    for order in Order.objects.filter(status='COMPLETED'):
        django_order = Order.objects.create(
            id=order.id,
            user=order.user,
            subtotal_amount=order.subtotal,
            discount_amount=order.discount,
            total_amount=order.total,
            coupon=order.coupon,
            status='COMPLETED',
            payment_method=order.payment_method,
            created_at=order.created_at,
        )
        for item in order.items:
            OrderItem.objects.create(
                order=django_order,
                course=item.course,
                price=item.price,
                quantity=item.quantity
            )
            # Auto-enroll in purchased course only if order is already paid
            if order.status == 'COMPLETED':
                Enrollment.objects.get_or_create(user=order.user, course=item.course)
```

---

## FEATURE FLAG ROLLOUT PLAN

### Day 1: Shadow Mode
```python
# Both Node and Django handle requests, compare responses
FEATURE_FLAGS = {
    'COURSE_DOMAIN_DJANGO': True,      # Shadow mode: log diffs
    'CART_DOMAIN_DJANGO': True,        # Shadow mode: log diffs
    'COMPARE_RESPONSES': True,         # Log diffs to DataDog
}
```

### Day 2: Canary (10% traffic)
```python
FEATURE_FLAGS = {
    'COURSE_DOMAIN_DJANGO': {'enabled': True, 'rollout': 10},  # 10% to Django
    'CART_DOMAIN_DJANGO': {'enabled': True, 'rollout': 10},
}
```

### Day 3: 50% Rollout
```python
FEATURE_FLAGS = {
    'COURSE_DOMAIN_DJANGO': {'enabled': True, 'rollout': 50},
    'CART_DOMAIN_DJANGO': {'enabled': True, 'rollout': 50},
}
```

### Day 4: Full Cutover
```python
FEATURE_FLAGS = {
    'COURSE_DOMAIN_DJANGO': True,
    'CART_DOMAIN_DJANGO': True,
    'COURSE_LEGACY_FALLBACK': False,  # Disable Node course fallback
    'CART_LEGACY_FALLBACK': False,    # Disable Node cart fallback
}
```

### Day 5: Cleanup
- Remove Node course/cart routes
- Update frontend to use Django-only endpoints
- Remove Node course/cart services

---

## DATA VALIDATION CHECKLIST

### Pre-Migration Validation
- [ ] Course count matches: `Test.objects.filter(is_published=True).count()` == `Course.objects.count()`
- [ ] Enrollment count matches: `TestResult.objects.filter().count()` == `Enrollment.objects.count()`
- [ ] Cart items preserved: `CartItem.objects.count()` matches Node cart items
- [ ] Order totals match: `Order.total_amount` sum == Node order totals
- [ ] Enrollment progress matches: `Enrollment.progress` == `TestResult.percentage`
- [ ] Lesson progress: `LessonProgress.completed` matches `TestAttemptAnswer.is_correct`

### Post-Migration Validation
```bash
# Run validation script
python validate_migration.py --all

# Expected output:
✅ Courses: 147 migrated, 0 errors
✅ Chapters: 432 migrated, 0 errors
✅ Lessons: 1,247 migrated, 0 errors
✅ Enrollments: 12,847 migrated, 0 errors
✅ Lesson Progress: 89,234 records, 0 errors
✅ Cart Items: 3,421 migrated, 0 errors
✅ Orders: 1,234 migrated, 0 errors
✅ Progress Parity: 100% match
```

---

## ROLLBACK PLAN

### Instant Rollback (Feature Flags)
```python
# Immediate rollback via feature flags
FEATURE_FLAGS = {
    'COURSE_DOMAIN_DJANGO': False,
    'CART_DOMAIN_DJANGO': False,
    'COURSE_LEGACY_FALLBACK': True,
    'CART_LEGACY_FALLBACK': True,
}
# Takes effect immediately via Redis config reload
```

### Database Rollback (If Needed)
```bash
# 1. Restore from pre-migration backup
pg_dump -h $DB_HOST -U $DB_USER -d lh_prod > pre_migration_backup.sql
# If needed:
psql -h $DB_HOST -U $DB_USER -d lh_prod -c "DROP DATABASE lh_prod;"
psql -h $DB_HOST -U $DB_USER -c "CREATE DATABASE lh_prod;"
psql -h $DB_HOST -U $DB_USER -d lh_prod < pre_migration_backup.sql
```

---

## TIMELINE

| Day | Morning | Afternoon | Deliverable |
|-----|---------|-----------|-------------|
| **Day 1** | Course/Enrollment migration | Cart/Order migration | Data migrated, validated |
| **Day 2** | Shadow mode (100% compare) | Fix discrepancies | Response diff < 1% |
| **Day 3** | 10% canary | 50% rollout | Monitoring stable |
| **Day 4** | 100% cutover | Disable legacy | Full Django |
| **Day 5** | Cleanup + tests | Monitoring | Production ready |

---

## SUCCESS CRITERIA

| Metric | Target | Measurement |
|--------|--------|-------------|
| Data integrity | 100% | All validation scripts pass |
| API parity | 100% | Contract tests pass |
| Response time | <10% regression | p95 < 1.1x baseline |
| Error rate | < 0.1% | < 0.05% actual |
| User impact | Zero complaints | Support tickets = 0 |

---

## POST-MIGRATION CLEANUP (Week 2)

1. **Remove Node course/cart code**
   - Delete `backend/src/services/CourseService.ts`
   - Delete `backend/src/services/CartService.ts`
   - Remove `backend/src/routes/v1/courses.routes.ts`
   - Remove `backend/src/routes/v1/cart.routes.ts`

2. **Update Frontend**
   - Point all course/cart API calls to Django endpoints
   - Remove Node-specific fallback logic

3. **Update Documentation**
   - Update architecture docs
   - Update API contracts
   - Update deployment runbook

---

## SIGN-OFF CHECKLIST

- [ ] Data migration scripts tested on staging
- [ ] All validation scripts pass
- [ ] Feature flags configured in Redis
- [ ] Monitoring alerts configured
- [ ] Rollback plan tested
- [ ] Team trained on rollback procedure
- [ ] Stakeholder sign-off obtained

---

## MIGRATION LEAD: [Name]  
**DBA:** [Name]  
**Engineering Lead:** [Name]  
**Product Owner:** [Name]  

**Target Start:** 2026-09-16 (Monday)  
**Target Completion:** 2026-09-20 (Friday)
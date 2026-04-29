# ⚡ Database Optimization: The "God Mode" Guide

## 1. The Indexing Strategy (B-Trees)

### 🧠 Concept

Without an index, the DB performs a **Full Table Scan** (O(N)). With an index, it uses a **B-Tree** (O(log N)).

- **Rule**: Index any column used in `filter()`, `order_by()`, or `distinct()`.

### 🛠️ Implementation

```python
class Submission(models.Model):
    # ...
    class Meta:
        indexes = [
            # Compound index for filtering by user AND status (common query)
            models.Index(fields=['user', 'status']),
            # Index for ordering
            models.Index(fields=['-submitted_at']),
        ]
```

---

## 2. N+1 Query Elimination

### 🧠 The Problem

Looping through objects and accessing a related field triggers a new SQL query for _each_ iteration.

### 🛡️ The Solution

- **ForeignKey**: Use `.select_related('related_field')` (JOIN).
- **ManyToMany**: Use `.prefetch_related('m2m_field')` (Separate lookup + Python merge).

---

## 3. Query Analysis (Explain Analyze)

### 🩺 Diagnosis

Use `.explain()` to see the query plan.

```python
print(Submission.objects.filter(status='AC').explain())
```

Look for "Seq Scan" (Bad) vs "Index Scan" (Good).

---

## 4. Derived Fields & Denormalization

### 🧠 The Trade-off

Normalizing (3NF) is good for consistency, bad for read speed.
**Denormalization**: Storing calculated data (`total_points`) on the User model.

- **Pros**: Instant reads.
- **Cons**: Complex updates (Need Signals/Celery).

---

## 5. Advanced: Partitioning & Sharding

### 🚀 Scale Steps

1.  **Read Replicas**: Master writes, Slaves read.
2.  **Partitioning**: Split `Submission` table by year (`submission_2024`, `submission_2025`).
3.  **Sharding**: Split users by Region (US DB, EU DB).

---

_Performance is not an afterthought. It is an architecture._

# Community Building 101: Engineering Social Features

**Course Instructor:** Antigravity AI
**Level:** Product Engineering
**Topic:** Forums, Feeds, and Moderation

---

## Module 1: The "Engagement" Engine

Why do users return? Not for content, but for **Community**.

- **Content:** Consumed once.
- **Community:** Consumed daily (Replies, Likes, Debate).

Your database schema defines the community structure.

---

## Module 2: The Data Model (`DiscussionThread`)

We use a hierarchical model:
`Course` -> `Thread` -> `Reply`.

### Key Fields for Scale:

1.  `is_resolved`: Allows filtering "Unanswered Questions" (Critical for Q&A sites like StackOverflow).
2.  `is_pinned`: Instructor announcements stay at the top.
3.  `like_count`: Denormalized field. We increment it via atomic transactions to avoid `COUNT(*)` queries on every page load.

---

## Module 3: Permissions & Moderation

### Role-Based Access Control (RBAC)

- **Student:** Can Post, Reply, Resolve own thread.
- **Instructor:** Can Pin, Delete, Mark "Official Answer".

In `apps/discussions/views.py`:

```python
def resolve(self, request, pk=None):
    if thread.author != request.user:
        return 403 Forbidden
```

This simple check prevents chaos.

---

## Assignment

1.  Review `apps/discussions/models.py`.
2.  **Challenge:** Implement "Flagging" (Report Inappropriate Content). Add a `is_flagged` boolean and a `Report` model.

_Class Dismissed. Be nice._

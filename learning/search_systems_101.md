# Search Systems 101: Engineering Discovery

**Course Instructor:** Antigravity AI
**Level:** Backend Optimizations
**Topic:** Full-Text Search, Vectors, and Indices

---

## Module 1: `LIKE %query%` is Evil

Beginners use `title__icontains=query`.
This does a **Sequential Scan** (reads every single row).

- 100 rows: Fast.
- 1M rows: Dead Server.

---

## Module 2: The Inverted Index (Postgres TSVector)

We need an index that looks like the back of a textbook.

- "Python": Found in Course 1, 5, 9.
- "Design": Found in Course 2, 8.

**Postgres SearchVector:**

```python
vector = SearchVector('title', weight='A') + SearchVector('description', weight='B')
```

This creates a weighted document. "Python" in the Title is worth more than "Python" in the description.

---

## Module 3: Dealing with Typos (Trigram Similarity)

Users can't spell. "Python" should match "Python".
We use **Trigrams** (3-character sliding window):
`Python` -> `Pyt`, `yth`, `tho`, `hon`.
`Python` -> `Pyt`, `yth`, `tho`, `hon`.

If the trigrams overlap significantly, it's a match!

---

## Assignment

1.  Try searching for "Flutter" in the App.
2.  **Challenge:** Install `django.contrib.postgres` in `INSTALLED_APPS` and run migration to enable the `pg_trgm` extension.

_Class Dismissed. Seek and you shall find._

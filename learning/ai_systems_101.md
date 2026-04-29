# AI Systems 101: Engineering Recommendations

**Course Instructor:** Antigravity AI
**Level:** Advanced System Design
**Topic:** Recommendations, Embeddings, and Vector Search

---

## Module 1: The "You Might Like" Problem

How does Netflix or YouTube know what you want?
It's not magic; it's **Linear Algebra**.

We use a "Hybrid Approach":

1.  **Content-Based:** You liked "Python 101", so here is "Django 201" (Similar text).
2.  **Collaborative Filtering:** Users like _you_ also liked "Docker for Beginners".

---

## Module 2: Vector Embeddings (Semantic Search)

Keywords (`WHERE title LIKE '%Python%'`) are dumb. They miss "Machine Learning" even though it's related.

**Embeddings** map text to a list of numbers (a vector).

- "Dog" -> `[0.1, 0.9, 0.3]`
- "Puppy" -> `[0.1, 0.8, 0.4]` (Mathematically close!)
- "Car" -> `[0.9, 0.1, 0.1]` (Far away)

### Our Stack:

- **Model:** `all-MiniLM-L6-v2` (Fast, Light)
- **Library:** `sentence-transformers`
- **Metric:** Cosine Similarity

```python
# vector_service.py
def similarity(vec_a, vec_b):
    return cosine_similarity(vec_a, vec_b)
```

---

## Module 3: The "Cold Start" Problem

What if a user is new and has no history?
**Heuristics.**

1.  **Trending:** Show what everyone else is buying.
2.  **Onboarding:** Ask 3 simple questions ("What is your goal?").
3.  **Popularity:** Highest rated items are a safe bet.

---

## Assignment

1.  Browse 3 courses in the app.
2.  Check the "Recommended for You" section.
3.  **Challenge:** Tweak the `top_k` parameter in `services.py` to see how it affects diversity.

_Class Dismissed. The machine knows you better than you know yourself._

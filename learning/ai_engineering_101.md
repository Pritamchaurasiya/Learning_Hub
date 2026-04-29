# AI Engineering 101: From keywords to Semantics

**Course Instructor:** Antigravity AI
**Level:** Advanced ML Engineering
**Target System:** Learning Hub AI Engine

---

## Module 1: The Problem with Keywords

Old systems (Heuristic) work like this:

- User likes: "Python"
- Course tag: "Python" -> Match!
- Course tag: "Coding for Data Science" -> No Match. (Missed opportunity)

**Why?** Computers don't understand that "Coding" and "Python" are semantically related.

---

## Module 2: Enter Embeddings (The "Soul" of Text)

An **Embedding** is a list of numbers (Vector) that represents the _meaning_ of text.

- We use a Transformer Model (`all-MiniLM-L6-v2`) to read text and output a 384-dimensional vector.
- `VectorService.encode("King") - VectorService.encode("Man") + VectorService.encode("Woman") ≈ VectorService.encode("Queen")`

### In Learning Hub:

We now store a `[0.1, -0.4, ...]` vector for every Course Description in the database.

---

## Module 3: Semantic Search (Cosine Similarity)

To find similar courses, we don't use SQL `LIKE`. We use **Math**.

1.  **User Profile Vector:** We take the average of vectors of all courses the user has taken.
    - _Math:_ `UserVec = (VecA + VecB + VecC) / 3`
2.  **Similarity Search:** We measure the angle between the User Vector and every Course Vector.
    - `Cosine Similarity = 1.0` (Identical meaning)
    - `Cosine Similarity = 0.0` (Unrelated)

**Result:** If you take a "Python" course, the math will naturally point you to "Django" or "Data Science", even if the tags don't match perfectly.

---

## Module 4: Code Implementation

### The Core Service (`vector_service.py`)

```python
class VectorService:
    def encode(text):
        return model.encode(text)

    def find_most_similar(query_vec, candidates):
        # Calculate Cosine Similarity for all candidates
        # Sort and return top K
```

### The Signal (`signals.py`)

Every time you save a `Course`:

1.  Python intercepts the save (`post_save`).
2.  We generate the embedding immediately.
3.  We update the database using `update()` to avoid infinite loops.

---

## Assignment

1.  Open `apps/ai_engine/vector_service.py` and understand how `sentence-transformers` is loaded lazily (to prevent crashing machines without RAM).
2.  Look at `apps/courses/schemas.py` to see how we added the `embedding` JSONField.

_Class Dismissed. Welcome to the AI Age._

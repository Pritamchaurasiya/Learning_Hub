# AI Engine 2.0: Vector-Based Recommendations

**Status:** Design Phase
**Goal:** Upgrade heuristic recommendations to Semantic Similarity Search using Vector Embeddings.

## 1. The Core Concept

Current "Content-Based" filtering relies on matching categorical tags (`slug__in=interests`).
**Limitation:** If user likes "Python" and a course is tagged "Data Science", they might miss it even though they are related.

**Solution:** **Vector Embeddings**.
We convert Course Descriptions into 384-dimensional vectors using `sentence-transformers/all-MiniLM-L6-v2`.

- "Python for Data Science" -> `[0.1, 0.5, ...]`
- "Machine Learning Basics" -> `[0.2, 0.4, ...]`
- Cosine Similarity: ~0.9 (Match found).

## 2. Architecture Changes

### A. New Dependencies

- `sentence-transformers`: For generating embeddings locally.
- `scikie-learn`: For Cosine Similarity calculation.
- `numpy`: For vector operations.

### B. Database Schema Update

We need to store the pre-computed embeddings.
_Option 1: Vector DB (Pinecone/Weaviate)_ -> Overkill for now.
_Option 2: PostgreSQL `pgvector`_ -> Gold Standard.
_Option 3: JSON Field (MVP)_ -> Store as JSON array in SQLite/Postgres.

**Decision:** Option 3 (MVP) for `learning-hub` initial upgrade.
`Course.embedding`: `JSONField` (stores list of floats).

## 3. Data Flow

1.  **Course Creation/Update**:
    - Trigger `generate_embedding(course)` signal.
    - Model: `all-MiniLM-L6-v2`.
    - Input: `f"{title}: {description} {tags}"`.
    - Output: Vector -> Save to DB.

2.  **User Interest Vector**:
    - User likes "Web Dev", "React".
    - Create a "User Profile Vector" by averaging embeddings of liked courses/tags.

3.  **Recommendation Query**:
    - Fetch all Course Vectors.
    - Calculate Cosine Similarity with User Profile Vector.
    - Return top K matches.

## 4. Implementation Steps

1.  **Task 1**: Install ML libraries (`pip install sentence-transformers`).
2.  **Task 2**: Add `embedding` field to `Course` model.
3.  **Task 3**: Create `VectorService` in `apps.ai_engine`.
    - `encode(text)`: Returns vector.
    - `compute_similarity(vec_a, vec_b)`: Returns score.
4.  **Task 4**: Update `RecommendationService.get_recommendations`.
    - Mix heuristic (Popularity) with Semantic Score.

## 5. Course Content (for `/t`)

Create **"AI Engineering 101"** covering:

- What are Embeddings?
- How Semantic Search works.
- Implementing RAG (Retrieval Augmented Generation) basics.

---

_Authored by Antigravity AI - Research Lab_

## 🧠 Lesson 7: Vector Databases & RAG (Cognitive Evolution)

**Status**: COMPLETED ✅
**Test Verification**: 11/11 Passed (`test_ai_engine.py`, `test_ai_integration.py`)

---

### What is RAG? (Retrieval Augmented Generation)

LLMs (like Gemini) are frozen in time. They don't know about *your* specific course content created today.
**RAG** fixes this:

1. **Retrieval**: Find relevant data from your DB (e.g., "Lesson 3 transcript", "DSA Binary Tree code").
2. **Augmentation**: Paste that data into the prompt with context boundaries.
3. **Generation**: Ask the LLM to answer using *only* that verified context.

---

### 🔢 Embeddings & Vector DBs

An **Embedding** converts text into a high-dimensional mathematical vector (e.g. 768 dimensions for Gemini `text-embedding-004`).
- Similar meanings produce close cosine distances.
- Semantic search: `SELECT * FROM course_embeddings ORDER BY embedding <=> query_vector LIMIT 5`.

---

### 🚀 Advanced: Maximal Marginal Relevance (MMR)

To eliminate repetitive context loops in LLM prompts, `VectorService` implements **Maximal Marginal Relevance (MMR)**:
$$\text{MMR} = \operatorname{argmax}_{d_i \in R \setminus S} \left[ \lambda \cdot \text{Sim}(d_i, q) - (1 - \lambda) \max_{d_j \in S} \text{Sim}(d_i, d_j) \right]$$

This balances **query relevance** with **chunk diversity**, ensuring the AI receives complementary context segments without redundant duplicates.

---

### 🏗️ Architecture & Verification

1. **Ingestion**: When lessons, articles, or problems are created $\rightarrow$ chunked with 200-token overlap $\rightarrow$ embedded via `VectorService.store_content_embedding`.
2. **Indexing**: PostgreSQL `ivfflat` vector indexes (`vector_cosine_ops` & `vector_l2_ops`) for sub-10ms nearest-neighbor lookups.
3. **Retrieval**: `VectorService.search_similar_content(query, use_mmr=True)` feeds `TutorService` prompts.

---

[Go to Lesson 8: Voice Architecture](./l8_voice.md)


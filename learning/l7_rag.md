## 🧠 Lesson 7: Vector Databases & RAG (Cognitive Evolution)

**Status**: IN PROGRESS

### What is RAG? (Retrieval Augmented Generation)

LLMs (like Gemini) are frozen in time. They don't know about _your_ specific course content created today.
**RAG** fixes this:

1.  **Retrieval**: Find relevant data from your DB (e.g., "Lesson 3 transcript").
2.  **Augmentation**: Paste that data into the prompt.
3.  **Generation**: Ask the LLM to answer using _only_ that data.

### 🔢 Embeddings & Vector DBs

Computers don't understand text; they understand numbers.
An **Embedding** turns text into a list of numbers (a vector), e.g., `[0.1, -0.5, 0.8...]`.

- Similar meanings = Close numbers.
- "Queen" is close to "King".

**pgvector**:
We are adding _memory_ to PostgreSQL. Instead of `SELECT * FROM table WHERE text LIKE '%math%'` (keyword search), we do `SELECT * FROM table ORDER BY embedding <-> query_embedding` (semantic search).

### 🏗️ Architecture

1.  **Ingest**: When a Lesson is uploaded -> Generate Embedding -> Save to `ContentEmbedding` table.
2.  **Query**: User asks question -> Generate Query Embedding -> Find nearest `ContentEmbedding` -> Send to Gemini.

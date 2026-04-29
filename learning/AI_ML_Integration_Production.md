# 🤖 AI/ML INTEGRATION: FROM BASICS TO PRODUCTION

## Building Intelligent Applications with Modern AI

---

## 📋 TABLE OF CONTENTS

1. [AI/ML Fundamentals](#-aiml-fundamentals)
2. [LLM Integration](#-llm-integration)
3. [RAG (Retrieval Augmented Generation)](#-rag-retrieval-augmented-generation)
4. [Prompt Engineering](#-prompt-engineering)
5. [AI Agents & Tool Use](#-ai-agents--tool-use)
6. [Vector Databases](#-vector-databases)
7. [Fine-Tuning](#-fine-tuning)
8. [Production Deployment](#-production-deployment)

---

## 🧠 AI/ML FUNDAMENTALS

### ML vs Traditional Programming

```
Traditional Programming:
  Input + Rules → Output

Machine Learning:
  Input + Output → Rules (Model)
```

### Types of Learning

| Type                | Description                     | Example              |
| ------------------- | ------------------------------- | -------------------- |
| **Supervised**      | Learn from labeled data         | Image classification |
| **Unsupervised**    | Find patterns in unlabeled data | Clustering           |
| **Reinforcement**   | Learn from rewards              | Game AI              |
| **Self-Supervised** | Create labels from data itself  | LLMs                 |

### Neural Network Basics

```
Input Layer    Hidden Layers    Output Layer
      ○ ─────────○──────────────○
      ○ ─────────○──────────────○
      ○ ─────────○──────────────○

Each connection has a weight (learned during training)
Each node applies: output = activation(Σ(inputs × weights) + bias)
```

---

## 🗣️ LLM INTEGRATION

### API-Based Integration (Recommended)

```python
# ai_engine/ai_client.py
import google.generativeai as genai
from django.conf import settings

class AIClient:
    def __init__(self):
        genai.configure(api_key=settings.GEMINI_API_KEY)
        self.model = genai.GenerativeModel('gemini-1.5-flash')

    def generate(
        self,
        prompt: str,
        system_instruction: str = None,
        temperature: float = 0.7,
        max_tokens: int = 1024
    ) -> str:
        """Generate response from LLM."""
        config = genai.types.GenerationConfig(
            temperature=temperature,
            max_output_tokens=max_tokens,
        )

        model = genai.GenerativeModel(
            'gemini-1.5-flash',
            system_instruction=system_instruction
        )

        response = model.generate_content(prompt, generation_config=config)
        return response.text

    async def stream_generate(self, prompt: str):
        """Stream response for real-time display."""
        response = await self.model.generate_content_async(
            prompt,
            stream=True
        )
        async for chunk in response:
            yield chunk.text
```

### Error Handling

```python
from google.api_core.exceptions import ResourceExhausted, InvalidArgument

def safe_generate(prompt: str) -> str:
    try:
        return ai_client.generate(prompt)
    except ResourceExhausted:
        # Rate limited - retry with backoff
        raise RateLimitError("API quota exceeded")
    except InvalidArgument as e:
        # Bad prompt
        raise ValidationError(f"Invalid prompt: {e}")
    except Exception as e:
        # Log and return graceful fallback
        logger.error(f"AI generation failed: {e}")
        return "I apologize, but I'm unable to process that request right now."
```

---

## 📚 RAG (RETRIEVAL AUGMENTED GENERATION)

### Architecture

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   User      │───►│   Query     │───►│  Retrieve   │
│   Query     │    │  Embedding  │    │  Similar    │
└─────────────┘    └─────────────┘    │  Documents  │
                                       └──────┬──────┘
                                              │
                                              ▼
┌─────────────┐    ┌─────────────────────────────────┐
│  Response   │◄───│  LLM (Query + Context)         │
└─────────────┘    └─────────────────────────────────┘
```

### Implementation

```python
# ai_engine/rag_service.py
from sentence_transformers import SentenceTransformer
import chromadb

class RAGService:
    def __init__(self):
        self.embedder = SentenceTransformer('all-MiniLM-L6-v2')
        self.client = chromadb.Client()
        self.collection = self.client.get_or_create_collection("course_content")

    def index_documents(self, documents: list[dict]):
        """Add documents to vector store."""
        embeddings = self.embedder.encode([d['content'] for d in documents])

        self.collection.add(
            embeddings=embeddings.tolist(),
            documents=[d['content'] for d in documents],
            metadatas=[{'title': d['title']} for d in documents],
            ids=[d['id'] for d in documents]
        )

    def retrieve(self, query: str, top_k: int = 5) -> list[str]:
        """Retrieve most relevant documents."""
        query_embedding = self.embedder.encode(query).tolist()

        results = self.collection.query(
            query_embeddings=[query_embedding],
            n_results=top_k
        )
        return results['documents'][0]

    def answer(self, question: str) -> str:
        """RAG: Retrieve + Augment + Generate."""
        # 1. Retrieve relevant context
        context = self.retrieve(question)

        # 2. Build augmented prompt
        prompt = f"""Answer the question based on the following context:

Context:
{chr(10).join(context)}

Question: {question}

Answer:"""

        # 3. Generate with LLM
        return ai_client.generate(prompt)
```

---

## 🎯 PROMPT ENGINEERING

### Prompting Patterns

#### 1. Zero-Shot

```
Classify this text as positive, negative, or neutral:
"The course was amazing!"
```

#### 2. Few-Shot

```
Classify these texts:
"Great product!" → positive
"Terrible experience" → negative
"It was okay" → neutral

Classify: "The course was amazing!"
```

#### 3. Chain-of-Thought

```
Solve step by step:
Q: If a course has 25 lessons and each takes 15 minutes,
   how many hours to complete?

A: Let me think step by step:
1. Total minutes = 25 × 15 = 375 minutes
2. Hours = 375 ÷ 60 = 6.25 hours
```

#### 4. Role Prompting

```python
TUTOR_PROMPT = """You are an expert programming tutor.
Your role is to:
- Explain concepts clearly with examples
- Break down complex topics into simple steps
- Encourage the student
- Never give direct answers; guide them to discover

Student question: {question}
"""
```

### Our DSA Code Review Prompt

````python
# ai_engine/prompts.py
CODE_REVIEW_PROMPT = """You are an expert code reviewer for a DSA learning platform.

Review the following code submission:
- Problem: {problem_title}
- Language: {language}
- Code:
```{language}
{code}
````

Provide feedback on:

1. **Correctness**: Does it solve the problem?
2. **Time Complexity**: Analyze Big-O
3. **Space Complexity**: Memory usage
4. **Code Quality**: Style, naming, structure
5. **Suggestions**: Specific improvements

Format your response as JSON:
{{
  "correctness": "pass|fail",
  "time_complexity": "O(...)",
  "space_complexity": "O(...)",
  "quality_score": 1-10,
  "feedback": "detailed feedback",
  "suggestions": ["suggestion1", "suggestion2"]
}}
"""

```

---

## 🔧 AI AGENTS & TOOL USE

### Agent Architecture

```

┌─────────────────────────────────────────────────────┐
│ Agent Loop │
├─────────────────────────────────────────────────────┤
│ │
│ 1. Receive Task │
│ ↓ │
│ 2. Plan (Break into steps) │
│ ↓ │
│ 3. Execute Step │
│ ↓ │
│ 4. Observe Result │
│ ↓ │
│ 5. Reflect & Adjust │
│ ↓ │
│ 6. Repeat until done or stuck │
│ │
└─────────────────────────────────────────────────────┘

````

### Tool Definition

```python
# ai_engine/tools.py
TOOLS = [
    {
        "name": "search_courses",
        "description": "Search for courses by keyword",
        "parameters": {
            "type": "object",
            "properties": {
                "query": {"type": "string", "description": "Search query"},
                "difficulty": {
                    "type": "string",
                    "enum": ["beginner", "intermediate", "advanced"]
                }
            },
            "required": ["query"]
        }
    },
    {
        "name": "get_user_progress",
        "description": "Get current user's learning progress",
        "parameters": {"type": "object", "properties": {}}
    },
    {
        "name": "run_code",
        "description": "Execute code in sandbox",
        "parameters": {
            "type": "object",
            "properties": {
                "code": {"type": "string"},
                "language": {"type": "string", "enum": ["python", "javascript"]}
            },
            "required": ["code", "language"]
        }
    }
]

def execute_tool(name: str, params: dict):
    """Route tool calls to implementations."""
    handlers = {
        "search_courses": search_courses,
        "get_user_progress": get_user_progress,
        "run_code": run_code_sandbox,
    }
    return handlers[name](**params)
````

---

## 🗄️ VECTOR DATABASES

### Comparison

| Database     | Strengths         | Use Case                 |
| ------------ | ----------------- | ------------------------ |
| **ChromaDB** | Simple, embedded  | Prototyping, small scale |
| **Pinecone** | Managed, scale    | Production, serverless   |
| **Weaviate** | Hybrid search     | Text + vectors           |
| **Qdrant**   | Performance       | High throughput          |
| **pgvector** | PostgreSQL native | Existing Postgres        |

### pgvector with Django

```python
# models.py
from pgvector.django import VectorField

class Document(BaseModel):
    title = models.CharField(max_length=200)
    content = models.TextField()
    embedding = VectorField(dimensions=384)  # MiniLM output size

    class Meta:
        indexes = [
            HnswIndex(
                name='document_embedding_idx',
                fields=['embedding'],
                m=16,
                ef_construction=64,
                opclass='vector_cosine_ops',
            )
        ]

# Similarity search
from pgvector.django import CosineDistance

query_embedding = embedder.encode("how to learn Python")
similar = Document.objects.annotate(
    distance=CosineDistance('embedding', query_embedding)
).order_by('distance')[:5]
```

---

## 🔬 FINE-TUNING

### When to Fine-Tune

| Scenario              | Solution           |
| --------------------- | ------------------ |
| Need domain knowledge | RAG first          |
| Need specific format  | Prompt engineering |
| Need consistent style | Few-shot examples  |
| Above don't work      | Fine-tune          |

### Fine-Tuning Process

```python
# 1. Prepare training data (JSONL)
{"messages": [
    {"role": "system", "content": "You are a DSA tutor"},
    {"role": "user", "content": "What is O(n)?"},
    {"role": "assistant", "content": "O(n) means linear time..."}
]}

# 2. Upload to provider
import openai
file = openai.files.create(
    file=open("training.jsonl", "rb"),
    purpose="fine-tune"
)

# 3. Create fine-tuning job
job = openai.fine_tuning.jobs.create(
    training_file=file.id,
    model="gpt-3.5-turbo"
)

# 4. Use fine-tuned model
response = openai.chat.completions.create(
    model="ft:gpt-3.5-turbo:your-org:model-id",
    messages=[...]
)
```

---

## 🚀 PRODUCTION DEPLOYMENT

### Best Practices

#### 1. Rate Limiting

```python
from django.core.cache import cache

def rate_limited_generate(user_id: int, prompt: str):
    key = f"ai_requests:{user_id}"
    count = cache.get(key, 0)

    if count >= 10:  # 10 requests per minute
        raise RateLimitError("Too many AI requests")

    cache.set(key, count + 1, timeout=60)
    return ai_client.generate(prompt)
```

#### 2. Caching Responses

```python
import hashlib

def cached_generate(prompt: str, cache_ttl: int = 3600):
    key = f"ai_response:{hashlib.md5(prompt.encode()).hexdigest()}"

    cached = cache.get(key)
    if cached:
        return cached

    response = ai_client.generate(prompt)
    cache.set(key, response, timeout=cache_ttl)
    return response
```

#### 3. Async Processing

```python
from celery import shared_task

@shared_task
def async_generate(prompt: str, callback_url: str):
    """Generate asynchronously and callback."""
    result = ai_client.generate(prompt)

    # Notify via webhook
    requests.post(callback_url, json={"result": result})
```

#### 4. Monitoring

```python
from prometheus_client import Counter, Histogram

AI_REQUESTS = Counter('ai_requests_total', 'Total AI requests')
AI_LATENCY = Histogram('ai_request_duration_seconds', 'AI request latency')

@AI_LATENCY.time()
def generate_with_metrics(prompt: str):
    AI_REQUESTS.inc()
    return ai_client.generate(prompt)
```

---

## 💎 AI INTEGRATION GOLDEN RULES

1. **Start with prompting** - Don't jump to fine-tuning
2. **Use RAG for knowledge** - Cheaper than fine-tuning
3. **Validate outputs** - LLMs can hallucinate
4. **Rate limit users** - AI APIs are expensive
5. **Cache aggressively** - Identical prompts = identical responses
6. **Log everything** - Debug and improve prompts
7. **Have fallbacks** - AI services can fail

---

**SINGULARITY ENGINE v16.0**  
_"AI is a tool. A powerful one. Use it wisely."_

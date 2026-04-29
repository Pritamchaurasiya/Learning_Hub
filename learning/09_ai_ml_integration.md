# AI/ML Integration Deep Dive - Learning Hub

## Overview

The Learning Hub leverages Google's Gemini AI for personalized learning experiences,
intelligent tutoring, code analysis, and content generation.

---

## 1. AI Architecture

### Core Components

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (Flutter)                       │
└─────────────────────────┬───────────────────────────────────┘
                          │ HTTP/WebSocket
┌─────────────────────────┴───────────────────────────────────┐
│                    AI Engine App                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │  AI Client   │  │ RAG Service  │  │ Analytics    │       │
│  │   (Gemini)   │  │  (Vectors)   │  │  Service     │       │
│  └──────────────┘  └──────────────┘  └──────────────┘       │
└─────────────────────────┬───────────────────────────────────┘
                          │
┌─────────────────────────┴───────────────────────────────────┐
│               Google Gemini API                              │
│  • gemini-2.0-flash (fast responses)                         │
│  • text-embedding-004 (semantic search)                      │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. AIClient Implementation

### Singleton Pattern with Rate Limiting

```python
# apps/ai_engine/ai_client.py
class AIClient:
    _instance = None
    _model = None

    @classmethod
    def get_model(cls):
        if cls._model is None:
            import google.generativeai as genai
            genai.configure(api_key=settings.GEMINI_API_KEY)
            cls._model = genai.GenerativeModel('gemini-2.0-flash')
        return cls._model
```

### Core Methods

#### 1. Chat Response

```python
@classmethod
def generate_response(cls, prompt: str, context: dict = None) -> str:
    """Generate AI response with optional context."""
    model = cls.get_model()

    system_prompt = """
    You are an expert tutor helping students learn programming.
    Be concise, accurate, and encouraging.
    """

    full_prompt = f"{system_prompt}\n\nContext: {context}\n\nUser: {prompt}"

    response = model.generate_content(full_prompt)
    return response.text
```

#### 2. Code Review

````python
@classmethod
def review_code(cls, code: str, language: str) -> dict:
    """AI-powered code quality analysis."""
    prompt = f"""
    Review this {language} code and provide:
    1. Bug detection (critical issues)
    2. Performance suggestions
    3. Security vulnerabilities
    4. Code style improvements
    5. Overall score (1-10)

    Code:
    ```{language}
    {code}
    ```

    Return JSON format.
    """

    response = model.generate_content(prompt)
    return json.loads(response.text)
````

#### 3. Hint Generation (Adaptive)

```python
@classmethod
def generate_hint(cls, problem: str, user_code: str, hint_level: int) -> str:
    """Generate progressively revealing hints."""

    hint_styles = {
        1: "Give a subtle nudge without revealing solution",
        2: "Explain the concept needed to solve this",
        3: "Provide a partial code snippet",
        4: "Show the full solution with explanation"
    }

    prompt = f"""
    Problem: {problem}
    User's attempt: {user_code}

    Style: {hint_styles[hint_level]}

    Generate a helpful hint.
    """

    return model.generate_content(prompt).text
```

---

## 3. RAG (Retrieval-Augmented Generation)

### Why RAG?

- Reduces hallucinations
- Incorporates course content
- Enables semantic search
- Improves answer accuracy

### Vector Storage (pgvector)

```python
# apps/core/vector_service.py
class VectorService:
    @staticmethod
    def store_embedding(model_class, object_id: str, text: str):
        """Store text embedding for semantic search."""
        from sentence_transformers import SentenceTransformer

        encoder = SentenceTransformer('all-MiniLM-L6-v2')
        embedding = encoder.encode(text).tolist()

        Embedding.objects.create(
            content_type=ContentType.objects.get_for_model(model_class),
            object_id=object_id,
            vector=embedding
        )

    @staticmethod
    def semantic_search(model_class, query: str, limit: int = 10):
        """Find similar content using vector similarity."""
        encoder = SentenceTransformer('all-MiniLM-L6-v2')
        query_vector = encoder.encode(query).tolist()

        # PostgreSQL pgvector similarity search
        return Embedding.objects.filter(
            content_type=ContentType.objects.get_for_model(model_class)
        ).order_by(
            CosineDistance(F('vector'), query_vector)
        )[:limit]
```

### RAG Pipeline

```
User Query → Semantic Search → Top-K Documents →
Prompt + Context → Gemini → Grounded Response
```

---

## 4. Personalization Engine

### Learning Style Detection

```python
class LearningStyleService:
    STYLES = ['visual', 'auditory', 'reading', 'kinesthetic']

    @classmethod
    def detect_style(cls, user) -> str:
        """Analyze user behavior to detect learning style."""
        from apps.ai_engine.models import ActivityLog

        activities = ActivityLog.objects.filter(user=user)

        video_views = activities.filter(action='video_view').count()
        text_reads = activities.filter(action='lesson_read').count()
        code_writes = activities.filter(action='code_submit').count()

        # Simple heuristic (ML model in production)
        if video_views > text_reads * 2:
            return 'visual'
        elif code_writes > text_reads:
            return 'kinesthetic'
        else:
            return 'reading'
```

### Adaptive Content

```python
@classmethod
def get_personalized_content(cls, user, topic: str) -> dict:
    """Adapt content based on user's learning style."""
    style = cls.detect_style(user)

    if style == 'visual':
        return {'format': 'video', 'diagrams': True}
    elif style == 'auditory':
        return {'format': 'podcast', 'narration': True}
    elif style == 'kinesthetic':
        return {'format': 'interactive', 'exercises': True}
    else:
        return {'format': 'text', 'examples': True}
```

---

## 5. Remediation Service

### Weak Concept Detection

```python
class RemediationService:
    @classmethod
    def generate_remedial_plan(cls, user, topic: str, weak_concepts: list) -> dict:
        """Create personalized study plan for struggling areas."""

        # Dynamic level detection
        from apps.gamification.models import UserXP
        xp, _ = UserXP.objects.get_or_create(user=user)

        if xp.total_xp < 500:
            level = "Beginner"
        elif xp.total_xp < 2000:
            level = "Intermediate"
        else:
            level = "Advanced"

        prompt = f"""
        Create a remedial study plan for a {level} student
        struggling with {topic}.

        Weak Concepts: {', '.join(weak_concepts)}

        Include:
        1. Root cause analysis
        2. Step-by-step action items
        3. Resource recommendations
        4. Practice exercises
        """

        return AIClient.generate_response(prompt)
```

---

## 6. Content Moderation (AI)

### Toxicity Detection

```python
@classmethod
def moderate_content(cls, content: str) -> dict:
    """AI-powered content moderation."""
    prompt = f"""
    Analyze this content for:
    1. Profanity/hate speech
    2. Spam/advertising
    3. Personal information
    4. Academic dishonesty promotion

    Content: "{content}"

    Return JSON: {{"safe": bool, "issues": [], "confidence": float}}
    """

    result = model.generate_content(prompt)
    return json.loads(result.text)
```

---

## 7. AI Daily Challenges

### Challenge Generation

```python
@api_view(['POST'])
def generate_daily_challenge(request):
    """Generate personalized daily learning challenge."""
    user = request.user

    # Get user's learning history
    from apps.ai_engine.models import LearningInsight
    insight = LearningInsight.objects.filter(user=user).first()

    topics = insight.strong_topics if insight else ['Python', 'Django']
    weak_topics = insight.weak_areas if insight else []

    # Balance between strengthening and practicing
    if random.random() > 0.7 and weak_topics:
        topic = random.choice(weak_topics)  # Focus on weak areas
    else:
        topic = random.choice(topics)  # Reinforce strengths

    challenge = Challenge.objects.create(
        title=f"Daily Quest: Master {topic}",
        challenge_type='daily',
        xp_reward=150,
        ends_at=timezone.now() + timedelta(hours=24)
    )

    return Response({'challenge': challenge.id})
```

---

## 8. Error Handling & Fallbacks

### Graceful Degradation

```python
@classmethod
def generate_response(cls, prompt: str) -> str:
    try:
        response = cls.get_model().generate_content(prompt)
        return response.text
    except RateLimitError:
        # Fallback to cached responses
        return cls._get_cached_response(prompt)
    except APIError:
        # Return generic helpful message
        return "I'm having trouble connecting. Please try again later."
    except Exception as e:
        logger.error(f"AI Error: {e}")
        return cls._get_fallback_response()
```

### Retry Logic

```python
@retry(
    stop=stop_after_attempt(3),
    wait=wait_exponential(multiplier=1, min=2, max=10)
)
def generate_with_retry(prompt: str) -> str:
    return AIClient.generate_response(prompt)
```

---

## 9. Caching Strategy

### Response Caching

```python
from django.core.cache import cache

@classmethod
def get_cached_or_generate(cls, cache_key: str, prompt: str, ttl: int = 3600):
    """Cache AI responses to reduce API calls."""
    cached = cache.get(cache_key)
    if cached:
        return cached

    response = cls.generate_response(prompt)
    cache.set(cache_key, response, ttl)
    return response
```

---

## 10. Metrics & Monitoring

### AI Usage Tracking

```python
class AIMetrics:
    @staticmethod
    def log_request(endpoint: str, tokens: int, latency: float):
        """Track AI API usage for cost optimization."""
        AIUsageLog.objects.create(
            endpoint=endpoint,
            token_count=tokens,
            latency_ms=latency * 1000,
            timestamp=timezone.now()
        )

    @staticmethod
    def get_daily_usage() -> dict:
        """Get daily AI API usage stats."""
        today = timezone.now().date()
        logs = AIUsageLog.objects.filter(timestamp__date=today)
        return {
            'total_requests': logs.count(),
            'total_tokens': logs.aggregate(Sum('token_count'))['token_count__sum'],
            'avg_latency': logs.aggregate(Avg('latency_ms'))['latency_ms__avg']
        }
```

---

## 11. Security Considerations

### API Key Protection

- ✅ Store in environment variables
- ✅ Never log API keys
- ✅ Rotate keys periodically

### Input Sanitization

- ✅ Limit prompt length
- ✅ Filter special characters
- ✅ Block prompt injection attempts

### Rate Limiting

- ✅ User-level limits
- ✅ Endpoint-specific limits
- ✅ Cost-aware throttling

---

## 12. Future Enhancements

### Planned Features

1. **Fine-tuned Models**: Domain-specific models for CS education
2. **Multi-modal**: Image/code screenshot analysis
3. **Voice Integration**: Text-to-speech for accessibility
4. **Real-time Collaboration**: AI-assisted pair programming
5. **Predictive Analytics**: Churn prediction, at-risk students

---

_This documentation covers the AI/ML integration patterns used in Learning Hub._

# Learning Hub - AI/ML Architecture Analysis

## Overview

This document analyzes the AI/ML components of the Learning Hub platform, covering the AI engine architecture, recommendation systems, and potential improvements.

---

## Current AI/ML Stack

### AI Engine Components

| Component              | Purpose                         | Location                          |
| ---------------------- | ------------------------------- | --------------------------------- |
| Recommendation Service | Personalized course suggestions | `apps/ai_engine/services.py`      |
| AI Tutor               | Q&A with LLM integration        | `apps/ai_engine/tutor_service.py` |
| Learning Stats         | User learning analytics         | `apps/ai_engine/views.py`         |
| Quiz Generation        | AI-powered quiz questions       | `apps/ai_engine/models.py`        |

---

## Recommendation System Architecture

### How it Works

```
User Behavior → Feature Extraction → ML Model → Ranked Courses → API Response
     ↓
- Enrollment history
- Completion rates
- Category preferences
- Time spent per module
```

### Current Implementation

```python
# apps/ai_engine/services.py
class RecommendationService:
    @staticmethod
    def get_recommendations(user):
        # 1. Get user's interests and history
        enrolled_categories = get_user_enrolled_categories(user)

        # 2. Find similar courses (content-based filtering)
        similar_courses = Course.objects.filter(
            category__in=enrolled_categories,
            is_published=True
        ).exclude(
            enrollments__user=user  # Don't recommend already enrolled
        )

        # 3. Sort by popularity (collaborative signal)
        return similar_courses.order_by(
            '-enrollment_count', '-avg_rating'
        )[:10]
```

### Improvement Opportunities

1. **Collaborative Filtering** - Users who enrolled in X also enrolled in Y
2. **Content Embeddings** - Use NLP to understand course descriptions
3. **Sequence Models** - Predict next course based on learning path
4. **A/B Testing** - Measure recommendation quality

---

## AI Tutor System

### Architecture

```
User Question → Prompt Engineering → LLM API → Response Parsing → UI
```

### Key Features

1. **Context Awareness** - Knows which module user is studying
2. **Rate Limiting** - 10 requests/minute to prevent abuse
3. **Response Caching** - Common questions cached
4. **Fallback** - Graceful error handling when LLM fails

### Implementation

```python
# apps/ai_engine/tutor_service.py
class TutorService:
    @staticmethod
    def ask(user, question, context=None):
        # Build prompt with context
        prompt = f"""
        You are an expert tutor for {context.module_name}.
        Student question: {question}

        Provide a clear, educational response.
        """

        # Call LLM with retry logic
        response = call_llm_with_retry(prompt)

        # Log for analytics
        log_tutor_interaction(user, question, response)

        return response
```

---

## Data Pipeline

### User Learning Analytics

```
+----------------+     +---------------+     +----------------+
|  User Actions  | --> | Event Stream  | --> |   Analytics    |
| (enrolls,      |     | (Celery tasks)|     | (aggregated    |
|  completes,    |     |               |     |  metrics)      |
|  watches)      |     +-------+-------+     +-------+--------+
+----------------+             |                     |
                               v                     v
                      +--------+--------+   +--------+--------+
                      | PostgreSQL      |   | Redis Cache     |
                      | (persistent)    |   | (real-time)     |
                      +-----------------+   +-----------------+
```

### Metrics Computed

- **Total XP** - Earned from course completion
- **Weekly XP** - Resets every Monday
- **Completion Rate** - % of enrolled courses finished
- **Average Progress** - Mean % across active enrollments
- **Favorite Categories** - Most frequently enrolled

---

## Quiz System (ML-Powered)

### Quiz Generation

```python
# apps/ai_engine/models.py
class ResearchQuiz(models.Model):
    module_slug = models.CharField(max_length=100)
    questions = models.JSONField()  # Array of question objects
    difficulty = models.IntegerField(default=1)

    # JSON structure:
    # [
    #   {
    #     "question": "What is...",
    #     "options": ["A", "B", "C", "D"],
    #     "correct": 0,
    #     "explanation": "..."
    #   }
    # ]
```

### Grading Logic

```python
def submit_quiz(request, module_slug):
    quiz = get_quiz(module_slug)
    answers = request.data['answers']

    # Calculate score
    correct = sum(1 for i, a in enumerate(answers)
                  if a == quiz.questions[i]['correct'])
    score = correct / len(quiz.questions) * 100

    # Award XP based on performance
    if score >= 80:
        award_xp(request.user, xp=50, reason='quiz_mastery')
    elif score >= 60:
        award_xp(request.user, xp=30, reason='quiz_pass')
```

---

## Performance Optimization

### Current Optimizations

1. **Query Optimization** - `select_related` for user data
2. **Redis Caching** - Leaderboard cached for 1 minute
3. **Async Processing** - XP awards via Celery
4. **Rate Limiting** - 5/min for AI endpoints

### Recommended Improvements

| Area                   | Current   | Recommended           |
| ---------------------- | --------- | --------------------- |
| Recommendation Latency | ~500ms    | <200ms (pre-compute)  |
| Tutor Response         | 2-5s      | <3s (stream response) |
| Analytics Freshness    | Real-time | 5min delay (batch)    |

---

## Security Considerations

### Data Privacy

- User learning data is PII
- Aggregate only for recommendations
- No raw data exposure in APIs
- GDPR: Right to deletion supported

### AI Safety

```python
# Input sanitization
def sanitize_question(question: str) -> str:
    # Remove potential prompt injection
    dangerous_patterns = [
        'ignore previous instructions',
        'forget your training',
        'you are now'
    ]
    for pattern in dangerous_patterns:
        if pattern.lower() in question.lower():
            raise ValidationError("Invalid question format")
    return question
```

---

## Future Roadmap

1. **Phase 1** - Implement vector embeddings for course similarity
2. **Phase 2** - Add reinforcement learning for adaptive quizzes
3. **Phase 3** - Deploy local LLM for cost reduction
4. **Phase 4** - Real-time personalization with streaming

---

_Last updated: 2026-01-18_

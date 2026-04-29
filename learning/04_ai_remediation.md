# AI Remediation Architecture

## Overview

The Remediation System uses Generative AI (Gemini 2.0 Flash) to analyze student performance on quizzes and generate personalized study plans.

## Workflow

1.  **Trigger**: Student fails a quiz (< 60% score).
2.  **Context Assembly**:
    - System collects the questions missed.
    - Retrieves metadata about the module and topic.
    - Identifies the "Weak Concepts" based on question tags.
3.  **AI Analysis** (`RemediationService`):
    - Calls `AIClient.generate_remedial_plan`.
    - Prompt includes student level, topic, and specific weak concepts.
    - AI acts as an Expert Tutor to diagnose the _root cause_.
4.  **Plan Generation**:
    - AI returns JSON with:
      - `root_cause`: Diagnostic explanation.
      - `action_items`: Specific steps (e.g., "Review Video 2.1").
      - `resources`: Recommended documentation types.
5.  **Persistence**:
    - Plan is saved to `RemedialPlan` model.
    - Displayed to the user on the Quiz Result screen.

## Technical Implementation

### AI Client (`generate_remedial_plan`)

Uses structured JSON generation with `gemini-2.0-flash`. Handles retries and fallback if AI is unavailable.

### Database Schema

```python
class RemedialPlan(BaseModel):
    user = ForeignKey(User)
    root_cause_analysis = TextField()
    suggested_actions = JSONField() # List of actions
```

## Future Enhancements

- **Content Recommendation**: Link directly to specific video timestamps.
- **Follow-up Quizzes**: Generate a new micro-quiz based on the weak concepts.

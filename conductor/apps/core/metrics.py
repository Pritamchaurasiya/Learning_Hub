
from prometheus_client import Counter, Histogram

# Business Metrics
XP_AWARDED_TOTAL = Counter(
    "learninghub_xp_awarded_total",
    "Total XP awarded to users",
    ["reason"]  # labels: 'quiz_completion', 'daily_streak', etc.
)

COURSE_COMPLETIONS_TOTAL = Counter(
    "learninghub_course_completions_total",
    "Total number of courses completed",
    ["category"]
)

AI_QUESTIONS_TOTAL = Counter(
    "learninghub_ai_questions_total",
    "Total questions asked to AI Tutor",
    ["status"] # 'success', 'error'
)

# Performance Metrics
DSA_EXECUTION_TIME = Histogram(
    "learninghub_dsa_execution_seconds",
    "Time taken to execute user code in sandbox",
    buckets=[0.1, 0.5, 1.0, 2.0, 5.0]
)

"""
Prometheus Metrics & Observability Counters for LearningHub Conductor.
Provides latency histograms, request counters, and performance monitoring.
"""

from prometheus_client import Counter, Histogram

# Business Metrics
XP_AWARDED_TOTAL = Counter(
    "learninghub_xp_awarded_total",
    "Total XP awarded to users",
    ["reason"],  # labels: 'quiz_completion', 'daily_streak', etc.
)

COURSE_COMPLETIONS_TOTAL = Counter(
    "learninghub_course_completions_total",
    "Total number of courses completed",
    ["category"],
)

AI_QUESTIONS_TOTAL = Counter(
    "learninghub_ai_questions_total",
    "Total questions asked to AI Tutor",
    ["status"],  # 'success', 'error'
)

# Performance & Distributed Tracing Latency Histograms
DSA_EXECUTION_TIME = Histogram(
    "learninghub_dsa_execution_seconds",
    "Time taken to execute user code in sandbox",
    buckets=[0.1, 0.5, 1.0, 2.0, 5.0],
)

HTTP_REQUEST_DURATION_SECONDS = Histogram(
    "learninghub_http_request_duration_seconds",
    "HTTP request latency in seconds",
    ["method", "endpoint", "status_code"],
    buckets=[0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.0, 5.0, 10.0],
)

HTTP_REQUESTS_TOTAL = Counter(
    "learninghub_http_requests_total",
    "Total HTTP requests received",
    ["method", "endpoint", "status_code"],
)

DATABASE_QUERY_DURATION_SECONDS = Histogram(
    "learninghub_database_query_duration_seconds",
    "Database query execution latency in seconds",
    ["operation"],
    buckets=[0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5],
)

AI_INFERENCE_DURATION_SECONDS = Histogram(
    "learninghub_ai_inference_duration_seconds",
    "AI model inference latency in seconds",
    ["model", "action", "status"],
    buckets=[0.1, 0.25, 0.5, 1.0, 2.0, 4.0, 8.0, 15.0, 30.0],
)

CACHE_OPERATIONS_TOTAL = Counter(
    "learninghub_cache_operations_total",
    "Cache lookups and mutations",
    ["operation", "result"],  # hit, miss, set, delete
)

from django.urls import path
from .views import (
    AIChatSessionsListView, AIChatSessionDetailView, AITutorQueryView,
    AICodeReviewView, AIRecommendationsView, DueSpacedReviewsView,
    SubmitSpacedReviewView, GenerateStudyPlanView, AITutorStreamView,
    AIEbookSummarizeChapterView, AIEbookExplainParagraphView,
    AIGenerateTestView, AIGenerateWeakAreaTestView, AILearningPathView
)

urlpatterns = [
    # AI Tutor Chat & Sessions
    path('ai/tutor', AITutorQueryView.as_view(), name='ai-tutor-direct'),
    path('ai/tutor/', AITutorQueryView.as_view(), name='ai-tutor-direct-slash'),
    path('ai/tutor/sessions', AIChatSessionsListView.as_view(), name='ai-sessions-list'),
    path('ai/tutor/sessions/', AIChatSessionsListView.as_view(), name='ai-sessions-list-slash'),
    path('ai/tutor/sessions/<str:session_id>', AIChatSessionDetailView.as_view(), name='ai-session-detail'),
    path('ai/tutor/chat', AITutorQueryView.as_view(), name='ai-tutor-chat'),
    path('ai/tutor/message', AITutorQueryView.as_view(), name='ai-tutor-message'),
    path('ai/tutor/query', AITutorQueryView.as_view(), name='ai-tutor-query'),
    path('ai/tutor/hint', AITutorQueryView.as_view(), name='ai-tutor-hint'),
    path('ai/tutor/stream', AITutorStreamView.as_view(), name='ai-tutor-stream'),
    path('ai/tutor/stream/', AITutorStreamView.as_view(), name='ai-tutor-stream-slash'),
    path('ai/explain', AITutorQueryView.as_view(), name='ai-explain'),

    # Ebook AI Integration
    path('ai/ebook/summarize-chapter', AIEbookSummarizeChapterView.as_view(), name='ai-ebook-summarize-chapter'),
    path('ai/ebook/summarize-chapter/', AIEbookSummarizeChapterView.as_view(), name='ai-ebook-summarize-chapter-slash'),
    path('ai/ebook/explain-paragraph', AIEbookExplainParagraphView.as_view(), name='ai-ebook-explain-paragraph'),
    path('ai/ebook/explain-paragraph/', AIEbookExplainParagraphView.as_view(), name='ai-ebook-explain-paragraph-slash'),

    # Test & Practice Generation
    path('ai/generate-test', AIGenerateTestView.as_view(), name='ai-generate-test'),
    path('ai/generate-test/', AIGenerateTestView.as_view(), name='ai-generate-test-slash'),
    path('ai/generate-weak-area-test', AIGenerateWeakAreaTestView.as_view(), name='ai-generate-weak-area-test'),
    path('ai/generate-weak-area-test/', AIGenerateWeakAreaTestView.as_view(), name='ai-generate-weak-area-test-slash'),
    path('ai/learning-path', AILearningPathView.as_view(), name='ai-learning-path'),
    path('ai/learning-path/', AILearningPathView.as_view(), name='ai-learning-path-slash'),

    # AI Code Review & Recommendations
    path('ai/code-review', AICodeReviewView.as_view(), name='ai-code-review'),
    path('ai/recommendations', AIRecommendationsView.as_view(), name='ai-recommendations'),

    # Spaced Repetition & Study Planner
    path('ai/spaced-repetition/due', DueSpacedReviewsView.as_view(), name='ai-spaced-due'),
    path('ai/spaced-repetition/review', SubmitSpacedReviewView.as_view(), name='ai-spaced-review'),
    path('study-planner/generate', GenerateStudyPlanView.as_view(), name='study-planner-generate'),
]



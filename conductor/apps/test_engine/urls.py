"""Test engine URLs."""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    TestViewSet,
    TestAttemptViewSet,
    QuestionViewSet,
    bookmark_question,
    diagnose_misconception,
)

router = DefaultRouter()
router.register(r'questions', QuestionViewSet, basename='question')
router.register(r'attempts', TestAttemptViewSet, basename='test-attempt')
router.register(r'', TestViewSet, basename='test')

urlpatterns = [
    # Aliases and collection routes without trailing slashes
    path('attempts', TestAttemptViewSet.as_view({'get': 'list'}), name='attempts-noslash'),
    path('my-results/', TestAttemptViewSet.as_view({'get': 'list'}), name='my-results'),
    path('my-results', TestAttemptViewSet.as_view({'get': 'list'}), name='my-results-noslash'),
    path('bookmarks/', bookmark_question, name='test-bookmarks'),
    path('bookmarks', bookmark_question, name='test-bookmarks-noslash'),
    path('diagnose-misconception/', diagnose_misconception, name='test-diagnose-misconception'),
    path('diagnose-misconception', diagnose_misconception, name='test-diagnose-misconception-noslash'),

    # Detail action routes without trailing slash to prevent HTTP 301 redirects dropping POST payloads
    path('<str:pk>/start', TestViewSet.as_view({'post': 'start_attempt'}), name='test-start-noslash'),
    path('<str:pk>/autosave', TestViewSet.as_view({'post': 'autosave'}), name='test-autosave-noslash'),
    path('<str:pk>/submit', TestViewSet.as_view({'post': 'submit_attempt'}), name='test-submit-noslash'),
    path('<str:pk>/result', TestViewSet.as_view({'get': 'get_result'}), name='test-result-noslash'),
    path('<str:pk>/offline-bundle', TestViewSet.as_view({'get': 'offline_bundle'}), name='test-offline-bundle-noslash'),
    path('<str:pk>/offline-sync', TestViewSet.as_view({'post': 'offline_sync'}), name='test-offline-sync-noslash'),
    path('<str:pk>/adaptive/step', TestViewSet.as_view({'post': 'adaptive_step'}), name='test-adaptive-step-noslash'),

    path('', include(router.urls)),
]

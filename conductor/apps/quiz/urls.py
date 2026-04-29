"""
Quiz URLs for Learning Hub API.
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import QuizViewSet, QuizAttemptViewSet, QuizResultViewSet

router = DefaultRouter()
router.register(r'', QuizViewSet, basename='quiz')
router.register(r'attempts', QuizAttemptViewSet, basename='quiz-attempt')

urlpatterns = [
    path('', include(router.urls)),
    path('results/stats/', QuizResultViewSet.as_view({'get': 'stats'}), name='quiz-stats'),
]

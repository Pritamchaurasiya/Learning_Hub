"""
API URL Configuration
Main entry point for all API endpoints.
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter

# Import viewsets from apps
from apps.quiz.views import QuizViewSet, QuizAttemptViewSet
from apps.courses.views import CourseViewSet, CategoryViewSet, EnrollmentViewSet

# Create main API router
router = DefaultRouter()

# Register quiz endpoints
router.register(r'quizzes', QuizViewSet, basename='quiz')
router.register(r'quiz-attempts', QuizAttemptViewSet, basename='quiz-attempt')

# Register courses endpoints
router.register(r'courses', CourseViewSet, basename='course')
router.register(r'categories', CategoryViewSet, basename='category')
router.register(r'enrollments', EnrollmentViewSet, basename='enrollment')

# The API URLs are determined automatically by the router
urlpatterns = [
    path('', include(router.urls)),
]

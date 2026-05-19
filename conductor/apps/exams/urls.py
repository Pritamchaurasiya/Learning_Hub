"""Exam taxonomy URLs."""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CountryViewSet, ExamViewSet, SubjectViewSet, TopicViewSet

router = DefaultRouter()
router.register(r'countries', CountryViewSet, basename='country')
router.register(r'exams', ExamViewSet, basename='exam')
router.register(r'subjects', SubjectViewSet, basename='subject')
router.register(r'topics', TopicViewSet, basename='topic')

urlpatterns = [
    path('', include(router.urls)),
]

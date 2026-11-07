"""Exam taxonomy URLs."""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    CountryViewSet,
    ExamViewSet,
    SubjectViewSet,
    TopicViewSet,
    PYQViewSet,
    GeoDetectView,
    PreferenceView,
)

router = DefaultRouter()
router.register(r'countries', CountryViewSet, basename='country')
router.register(r'exams', ExamViewSet, basename='exam')
router.register(r'subjects', SubjectViewSet, basename='subject')
router.register(r'topics', TopicViewSet, basename='topic')
router.register(r'pyqs', PYQViewSet, basename='pyq')

urlpatterns = [
    path('geo/detect/', GeoDetectView.as_view(), name='geo_detect'),
    path('geo/detect', GeoDetectView.as_view()),
    path('preferences/', PreferenceView.as_view(), name='exam_preferences'),
    path('preferences', PreferenceView.as_view()),
    path('', include(router.urls)),
]


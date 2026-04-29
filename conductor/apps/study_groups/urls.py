from rest_framework.routers import DefaultRouter
from django.urls import path, include
from .views import StudyGroupViewSet

router = DefaultRouter()
router.register(r'groups', StudyGroupViewSet, basename='study-group')

urlpatterns = [
    path('', include(router.urls)),
]

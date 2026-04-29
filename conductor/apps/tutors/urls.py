from rest_framework.routers import DefaultRouter
from django.urls import path, include
from .views import TutorViewSet, BookingViewSet

router = DefaultRouter()
router.register(r'list', TutorViewSet, basename='tutors')
router.register(r'bookings', BookingViewSet, basename='bookings')

urlpatterns = [
    path('', include(router.urls)),
]

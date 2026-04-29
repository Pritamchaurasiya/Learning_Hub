"""
Course URLs for Learning Hub API.
"""

from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import CategoryViewSet, CourseViewSet, CertificateViewSet, CareerTrackViewSet, PublicCertificateViewSet

router = DefaultRouter()
router.register("public-certificates", PublicCertificateViewSet, basename="public-certificate")
router.register("certificates", CertificateViewSet, basename="certificate")
router.register("tracks", CareerTrackViewSet, basename="track")
router.register("", CourseViewSet, basename="course")

urlpatterns = [
    path("categories/", CategoryViewSet.as_view({"get": "list"}), name="category-list"),
    path(
        "categories/<slug:slug>/",
        CategoryViewSet.as_view({"get": "retrieve"}),
        name="category-detail",
    ),
    path("", include(router.urls)),
]

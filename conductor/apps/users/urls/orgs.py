
from django.urls import include, path
from rest_framework.routers import DefaultRouter
from apps.users.views_org import OrganizationViewSet

router = DefaultRouter()
router.register("", OrganizationViewSet, basename="organization")

urlpatterns = [
    path("", include(router.urls)),
]

from rest_framework_nested import routers
from .views import DiscussionThreadViewSet, DiscussionReplyViewSet

router = routers.DefaultRouter()
router.register(r'threads', DiscussionThreadViewSet, basename='discussion-thread')

# Nested router for replies
threads_router = routers.NestedDefaultRouter(router, r'threads', lookup='thread')
threads_router.register(r'replies', DiscussionReplyViewSet, basename='thread-replies')

urlpatterns = router.urls + threads_router.urls

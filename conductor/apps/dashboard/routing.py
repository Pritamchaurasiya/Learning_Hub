
from django.urls import re_path
from . import consumers

websocket_urlpatterns = [
    re_path(r"ws/dashboard/instructor/$", consumers.InstructorDashboardConsumer.as_asgi()),
    # Activity Feed
    re_path(r"ws/activity/$", consumers.ActivityFeedConsumer.as_asgi()),
]


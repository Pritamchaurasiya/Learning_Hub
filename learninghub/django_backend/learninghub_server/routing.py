from django.urls import re_path
from apps.core.consumers import (
    LiveCollaborationConsumer,
    WebRTCSignalingConsumer,
    ExamMonitoringConsumer,
    NotificationConsumer
)

websocket_urlpatterns = [
    re_path(r'^ws/collab/(?P<room_id>[\w-]+)/?$', LiveCollaborationConsumer.as_asgi()),
    re_path(r'^ws/webrtc/(?P<room_id>[\w-]+)/?$', WebRTCSignalingConsumer.as_asgi()),
    re_path(r'^ws/exam/(?P<attempt_id>[\w-]+)/?$', ExamMonitoringConsumer.as_asgi()),
    re_path(r'^ws/notifications/?$', NotificationConsumer.as_asgi()),
]

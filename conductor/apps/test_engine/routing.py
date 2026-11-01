"""
WebSocket URL Routing for Test Engine.
Provides real-time endpoints for examinee test stations and proctor control rooms.
"""

from django.urls import re_path
from . import consumers

websocket_urlpatterns = [
    re_path(
        r"ws/test/attempts/(?P<attempt_id>[^/]+)/$",
        consumers.ExamStationConsumer.as_asgi(),
    ),
    re_path(
        r"ws/test/proctor/(?P<test_id>[^/]+)/$", consumers.ExamProctorConsumer.as_asgi()
    ),
]

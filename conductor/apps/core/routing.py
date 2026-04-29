"""
Unified WebSocket Routing for Conductor.

Exposes all real-time consumers from websocket_handlers.py.
"""

from django.urls import re_path
from . import websocket_handlers

websocket_urlpatterns = [
    # Real-time Notifications (Global)
    re_path(r'ws/notifications/$', websocket_handlers.NotificationConsumer.as_asgi()),

    # Chat (Rooms)
    re_path(r'ws/chat/(?P<room_id>\w+)/$', websocket_handlers.ChatConsumer.as_asgi()),

    # Live Sessions (Classrooms)
    re_path(r'ws/live/(?P<session_id>\w+)/$', websocket_handlers.LiveSessionConsumer.as_asgi()),

    # Real-time Collaboration (Docs/Notes)
    re_path(r'ws/collab/(?P<document_id>\w+)/$', websocket_handlers.CollaborationConsumer.as_asgi()),

    # AI Assistance (Personal)
    re_path(r'ws/ai/assist/$', websocket_handlers.AIHintConsumer.as_asgi()),

    # Learning Progress (Quizzes, Streaks)
    re_path(r'ws/progress/$', websocket_handlers.LearningProgressConsumer.as_asgi()),

    # Real-Time Social & Gamification Feeds (Global)
    re_path(r'ws/social/$', websocket_handlers.SocialConsumer.as_asgi()),
]

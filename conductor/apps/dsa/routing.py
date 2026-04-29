from django.urls import re_path
from . import consumers, ai_chat_consumer

websocket_urlpatterns = [
    re_path(r'ws/dsa/submissions/(?P<user_id>\w+)/$', consumers.SubmissionConsumer.as_asgi()),
    re_path(r'ws/dsa/chat/(?P<submission_id>\w+)/$', ai_chat_consumer.AIChatConsumer.as_asgi()),
]

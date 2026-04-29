from django.urls import re_path
from . import consumers

websocket_urlpatterns = [
    re_path(r'ws/metaverse/room/(?P<room_slug>[^/]+)/$', consumers.SpatialConsumer.as_asgi()),
]

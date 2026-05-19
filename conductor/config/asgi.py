import os
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
from apps.core.routing import websocket_urlpatterns as core_ws_urlpatterns
from apps.metaverse.routing import websocket_urlpatterns as metaverse_ws_urlpatterns
from apps.dashboard.routing import websocket_urlpatterns as dashboard_ws_urlpatterns

from apps.core.middleware import JWTAuthMiddleware

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.development")

application = ProtocolTypeRouter({
    "http": get_asgi_application(),
    "websocket": JWTAuthMiddleware(
        URLRouter(
            core_ws_urlpatterns + metaverse_ws_urlpatterns + dashboard_ws_urlpatterns
        )
    ),
})

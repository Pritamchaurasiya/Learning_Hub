import os
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from apps.core.routing import websocket_urlpatterns as core_ws_urlpatterns
from apps.dashboard.routing import websocket_urlpatterns as dashboard_ws_urlpatterns
from apps.core.middleware import JWTAuthMiddleware

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.development")

# Base WebSocket URL patterns
_ws_patterns = list(core_ws_urlpatterns) + list(dashboard_ws_urlpatterns)

# Aggregate modular app WebSocket routers safely
from django.conf import settings

for app_routing in [
    "apps.dsa.routing",
    "apps.notifications.routing",
    "apps.chat.routing",
    "apps.live_sessions.routing",
    "apps.study_groups.routing",
    "apps.metaverse.routing",
]:
    app_name = app_routing.rsplit(".", 1)[0]
    if hasattr(settings, "INSTALLED_APPS") and app_name not in settings.INSTALLED_APPS:
        continue
    try:
        mod = __import__(app_routing, fromlist=["websocket_urlpatterns"])
        patterns = getattr(mod, "websocket_urlpatterns", [])
        if patterns:
            _ws_patterns.extend(patterns)
    except Exception:
        pass

application = ProtocolTypeRouter({
    "http": get_asgi_application(),
    "websocket": JWTAuthMiddleware(
        URLRouter(_ws_patterns)
    ),
})


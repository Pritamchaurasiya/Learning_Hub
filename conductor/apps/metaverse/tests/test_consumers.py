import pytest
from channels.testing import WebsocketCommunicator
from apps.metaverse.consumers import SpatialConsumer
from channels.routing import URLRouter
from django.urls import re_path
from django.contrib.auth import get_user_model
from django.contrib.auth.models import AnonymousUser
import uuid

User = get_user_model()


# Helper to mock scope directly
class MockAuthMiddleware:
    def __init__(self, inner, user=None):
        self.inner = inner
        self.user = user

    async def __call__(self, scope, receive, send):
        scope["user"] = self.user if self.user is not None else AnonymousUser()
        return await self.inner(scope, receive, send)


@pytest.fixture
def test_user(db):
    user = User.objects.create_user(
        email="testuser@example.com", username="testuser", password="password123"
    )
    return user


@pytest.mark.asyncio
async def test_spatial_consumer_unauthenticated():
    room_slug = f"test-room-{uuid.uuid4().hex[:8]}"
    application = MockAuthMiddleware(
        URLRouter(
            [
                re_path(
                    r"ws/metaverse/room/(?P<room_slug>[^/]+)/$",
                    SpatialConsumer.as_asgi(),
                ),
            ]
        ),
        user=AnonymousUser(),
    )

    communicator = WebsocketCommunicator(
        application, f"/ws/metaverse/room/{room_slug}/"
    )

    connected, subprotocol = await communicator.connect()
    assert not connected, "Unauthenticated user should be rejected"
    await communicator.disconnect()


@pytest.mark.django_db(transaction=True)
@pytest.mark.asyncio
async def test_spatial_consumer_authenticated(test_user):
    room_slug = f"test-room-{uuid.uuid4().hex[:8]}"
    application = MockAuthMiddleware(
        URLRouter(
            [
                re_path(
                    r"ws/metaverse/room/(?P<room_slug>[^/]+)/$",
                    SpatialConsumer.as_asgi(),
                ),
            ]
        ),
        user=test_user,
    )

    communicator = WebsocketCommunicator(
        application, f"/ws/metaverse/room/{room_slug}/"
    )

    connected, subprotocol = await communicator.connect()
    assert connected, "Authenticated user should be accepted"
    await communicator.disconnect()

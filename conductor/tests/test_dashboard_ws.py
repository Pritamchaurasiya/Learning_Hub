
import pytest
from channels.testing import WebsocketCommunicator
from channels.layers import get_channel_layer
from django.test import override_settings
from config.asgi import application
from django.contrib.auth import get_user_model

User = get_user_model()


# Use in-memory channel layer for testing
TEST_CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels.layers.InMemoryChannelLayer"
    }
}


@pytest.mark.asyncio
@pytest.mark.django_db
@override_settings(CHANNEL_LAYERS=TEST_CHANNEL_LAYERS)
async def test_instructor_dashboard_connection():
    """Test authenticated instructor can connect and receive initial message."""
    # Create test user
    user = await User.objects.acreate(
        email="instructor_ws@example.com",
        password="TestPassword123!",
        role="instructor"
    )

    # Test authenticated connection
    communicator = WebsocketCommunicator(application, "ws/dashboard/instructor/")
    communicator.scope["user"] = user
    
    connected, subprotocol = await communicator.connect()
    assert connected
    
    # Receive initial message
    response = await communicator.receive_json_from()
    assert response["type"] == "connection_established"
    
    await communicator.disconnect()


@pytest.mark.asyncio
@pytest.mark.django_db
@override_settings(CHANNEL_LAYERS=TEST_CHANNEL_LAYERS)
async def test_instructor_dashboard_demo_mode():
    """Test unauthenticated connection allowed for demo mode."""
    # Consumer allows anonymous connections for demo visualization
    communicator = WebsocketCommunicator(application, "ws/dashboard/instructor/")
    # AnonymousUser is default
    
    connected, subprotocol = await communicator.connect()
    # Consumer allows demo connections for visualization purposes
    assert connected
    
    # Should still receive initial message
    response = await communicator.receive_json_from()
    assert response["type"] == "connection_established"
    
    await communicator.disconnect()

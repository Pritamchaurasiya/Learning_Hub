import pytest
from django.contrib.auth.models import AnonymousUser
from rest_framework_simplejwt.tokens import RefreshToken
import jwt
from django.conf import settings

# Import the asgi components securely (to handle potential env issues during discovery)
try:
    from apps.core.middleware import get_user_from_token, JWTAuthMiddleware
except ImportError:
    pass

@pytest.mark.django_db
@pytest.mark.asyncio
class TestJWTAuthMiddleware:
    """
    Tests the stateless ASGI WebSocket authentication layer.
    """
    
    @pytest.fixture
    def valid_token(self, user):
        refresh = RefreshToken.for_user(user)
        return str(refresh.access_token)

    @pytest.fixture
    def expired_token(self, user):
        # Create a manually expired token for testing
        refresh = RefreshToken.for_user(user)
        token = str(refresh.access_token)
        # In a real test, we would mock timezone.now() or manipulate the token payload
        # For simplicity here, we assume standard token validation logic
        return token
        
    async def test_get_user_from_valid_token(self, valid_token, user):
        """Test that a valid JWT successfully hydrates the correct User."""
        fetched_user = await get_user_from_token(valid_token)
        assert fetched_user.id == user.id
        assert fetched_user.is_authenticated

    async def test_get_user_from_invalid_token(self):
        """Test that tampered/invalid tokens fallback to AnonymousUser."""
        fetched_user = await get_user_from_token("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.signature")
        assert isinstance(fetched_user, AnonymousUser)
        assert not fetched_user.is_authenticated

    async def test_middleware_injection(self, valid_token, user):
        """Test that the middleware correctly parses the query string and injects scope['user']."""
        
        # Mock ASGI app endpoint
        async def mock_app(scope, receive, send):
            return scope.get("user")
            
        middleware = JWTAuthMiddleware(mock_app)
        
        # Scenario 1: Valid token in query string
        scope_with_token = {
            "type": "websocket",
            "query_string": f"token={valid_token}".encode('utf-8')
        }
        
        injected_user = await middleware(scope_with_token, None, None)
        assert injected_user.id == user.id
        
        # Scenario 2: No token provided
        scope_no_token = {
            "type": "websocket",
            "query_string": b""
        }
        
        injected_user_empty = await middleware(scope_no_token, None, None)
        assert isinstance(injected_user_empty, AnonymousUser)

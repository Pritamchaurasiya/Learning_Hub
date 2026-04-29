import jwt
from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.models import AnonymousUser
from channels.db import database_sync_to_async
from channels.middleware import BaseMiddleware

User = get_user_model()

@database_sync_to_async
def get_user_from_jwt(token_key):
    try:
        payload = jwt.decode(
            token_key, 
            settings.SIMPLE_JWT['SIGNING_KEY'], 
            algorithms=[settings.SIMPLE_JWT['ALGORITHM']]
        )
        user_id = payload.get(settings.SIMPLE_JWT['USER_ID_CLAIM'])
        return User.objects.get(id=user_id)
    except (jwt.ExpiredSignatureError, jwt.DecodeError, User.DoesNotExist, Exception):
        return AnonymousUser()

class JWTAuthMiddleware(BaseMiddleware):
    async def __call__(self, scope, receive, send):
        from urllib.parse import parse_qs
        query_string = parse_qs(scope["query_string"].decode())
        token = query_string.get("token")
        
        if token:
            scope["user"] = await get_user_from_jwt(token[0])
        else:
            scope["user"] = AnonymousUser()
            
        return await super().__call__(scope, receive, send)

def JWTAuthMiddlewareStack(inner):
    return JWTAuthMiddleware(inner)

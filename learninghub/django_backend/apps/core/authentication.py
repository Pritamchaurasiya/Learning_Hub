"""
Custom authentication classes for Learning Hub.
"""
from rest_framework_simplejwt.authentication import JWTAuthentication


class JWTCookieAuthentication(JWTAuthentication):
    """
    Extends SimpleJWT's JWTAuthentication to check the standard 'Authorization'
    header first, and fall back to the secure HttpOnly 'access_token' cookie.
    """

    def authenticate(self, request):
        header = self.get_header(request)
        if header is None:
            raw_token = request.COOKIES.get('access_token')
            if raw_token is None:
                return None
        else:
            raw_token = self.get_raw_token(header)

        if raw_token is None:
            return None

        validated_token = self.get_validated_token(raw_token)
        return self.get_user(validated_token), validated_token

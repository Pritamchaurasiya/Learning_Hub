# 🔐 AUTHENTICATION & AUTHORIZATION: COMPLETE GUIDE

## Securing Your Application from Login to Access Control

---

## 📋 TABLE OF CONTENTS

1. [Authentication vs Authorization](#-authentication-vs-authorization)
2. [JWT Authentication](#-jwt-authentication)
3. [OAuth 2.0](#-oauth-20)
4. [Sessions vs Tokens](#-sessions-vs-tokens)
5. [Role-Based Access Control (RBAC)](#-role-based-access-control-rbac)
6. [Multi-Factor Authentication (MFA)](#-multi-factor-authentication-mfa)
7. [Password Security](#-password-security)
8. [Common Vulnerabilities](#-common-vulnerabilities)

---

## 🔑 AUTHENTICATION VS AUTHORIZATION

### Definitions

```
AUTHENTICATION (AuthN): "Who are you?"
  → Verify identity
  → Login process
  → Credentials check

AUTHORIZATION (AuthZ): "What can you do?"
  → Check permissions
  → Access control
  → Resource protection
```

### Flow

```
┌──────────────────────────────────────────────────────────┐
│                 User Request Flow                         │
├──────────────────────────────────────────────────────────┤
│                                                           │
│   User ──► Login ──► Token ──► Request ──► Resource      │
│                                    │                      │
│                         ┌──────────┴──────────┐          │
│                         ▼                     ▼          │
│                  Authentication         Authorization     │
│                  "Valid token?"        "Has permission?" │
│                         │                     │          │
│                         ▼                     ▼          │
│                     ✅ or ❌              ✅ or ❌        │
│                                                           │
└──────────────────────────────────────────────────────────┘
```

---

## 🎫 JWT AUTHENTICATION

### JWT Structure

```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.    ← Header (base64)
eyJ1c2VyX2lkIjoiMTIzIiwiZXhwIjoxNjQwfQ.  ← Payload (base64)
SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQ   ← Signature

Header:
{
  "alg": "HS256",
  "typ": "JWT"
}

Payload:
{
  "user_id": "123",
  "email": "user@example.com",
  "role": "student",
  "exp": 1640000000,   // Expiration
  "iat": 1639990000    // Issued at
}
```

### Django Implementation

```python
# settings.py
from datetime import timedelta

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=15),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'ALGORITHM': 'HS256',
    'SIGNING_KEY': SECRET_KEY,
}

# views.py
from rest_framework_simplejwt.tokens import RefreshToken

class LoginView(APIView):
    def post(self, request):
        email = request.data.get('email')
        password = request.data.get('password')

        user = authenticate(email=email, password=password)
        if not user:
            return Response({
                'status': 'error',
                'message': 'Invalid credentials'
            }, status=401)

        refresh = RefreshToken.for_user(user)

        return Response({
            'status': 'success',
            'data': {
                'access': str(refresh.access_token),
                'refresh': str(refresh),
                'user': UserSerializer(user).data
            }
        })

class RefreshTokenView(APIView):
    def post(self, request):
        refresh_token = request.data.get('refresh')

        try:
            refresh = RefreshToken(refresh_token)
            return Response({
                'status': 'success',
                'data': {
                    'access': str(refresh.access_token),
                    'refresh': str(refresh)  # Rotated token
                }
            })
        except TokenError:
            return Response({
                'status': 'error',
                'message': 'Invalid or expired refresh token'
            }, status=401)
```

### Flutter Implementation

```dart
class AuthService {
  static const _accessKey = 'access_token';
  static const _refreshKey = 'refresh_token';

  final _storage = FlutterSecureStorage();
  final _dio = Dio();

  Future<User> login(String email, String password) async {
    final response = await _dio.post('/auth/login/', data: {
      'email': email,
      'password': password,
    });

    final data = response.data['data'];
    await _storage.write(key: _accessKey, value: data['access']);
    await _storage.write(key: _refreshKey, value: data['refresh']);

    return User.fromJson(data['user']);
  }

  Future<String?> getAccessToken() async {
    final token = await _storage.read(key: _accessKey);

    if (token != null && _isExpired(token)) {
      return await _refreshAccessToken();
    }

    return token;
  }

  Future<String?> _refreshAccessToken() async {
    final refreshToken = await _storage.read(key: _refreshKey);
    if (refreshToken == null) return null;

    try {
      final response = await _dio.post('/auth/token/refresh/', data: {
        'refresh': refreshToken,
      });

      final data = response.data['data'];
      await _storage.write(key: _accessKey, value: data['access']);
      await _storage.write(key: _refreshKey, value: data['refresh']);

      return data['access'];
    } catch (e) {
      await logout();  // Clear tokens on failure
      return null;
    }
  }

  bool _isExpired(String token) {
    final parts = token.split('.');
    if (parts.length != 3) return true;

    final payload = json.decode(
      utf8.decode(base64Decode(base64.normalize(parts[1])))
    );

    final exp = payload['exp'] as int;
    return DateTime.now().millisecondsSinceEpoch > exp * 1000;
  }
}
```

---

## 🌐 OAUTH 2.0

### Flow Types

```
1. Authorization Code (Recommended for web)
   User → App → Auth Server → Code → App → Token

2. PKCE (Recommended for mobile/SPA)
   Same as above + Code Verifier/Challenge

3. Client Credentials (Machine-to-machine)
   App → Auth Server → Token (no user involved)

4. Implicit (Deprecated)
   Don't use this anymore
```

### Google OAuth in Django

```python
# settings.py
INSTALLED_APPS += ['allauth', 'allauth.account', 'allauth.socialaccount', 'allauth.socialaccount.providers.google']

SOCIALACCOUNT_PROVIDERS = {
    'google': {
        'SCOPE': ['profile', 'email'],
        'AUTH_PARAMS': {'access_type': 'online'},
        'APP': {
            'client_id': os.environ['GOOGLE_CLIENT_ID'],
            'secret': os.environ['GOOGLE_CLIENT_SECRET'],
        }
    }
}

# views.py
from allauth.socialaccount.providers.google.views import GoogleOAuth2Adapter
from dj_rest_auth.registration.views import SocialLoginView

class GoogleLoginView(SocialLoginView):
    adapter_class = GoogleOAuth2Adapter
```

### Flutter Google Sign-In

```dart
import 'package:google_sign_in/google_sign_in.dart';

class GoogleAuthService {
  final _googleSignIn = GoogleSignIn(
    scopes: ['email', 'profile'],
  );

  Future<User?> signInWithGoogle() async {
    try {
      final account = await _googleSignIn.signIn();
      if (account == null) return null;

      final auth = await account.authentication;

      // Send token to backend
      final response = await dio.post('/auth/google/', data: {
        'access_token': auth.accessToken,
        'id_token': auth.idToken,
      });

      // Backend returns our JWT
      final tokens = response.data['data'];
      await _storeTokens(tokens);

      return User.fromJson(response.data['data']['user']);
    } catch (e) {
      debugPrint('Google sign-in error: $e');
      return null;
    }
  }
}
```

---

## 🍪 SESSIONS VS TOKENS

### Comparison

| Aspect             | Sessions               | Tokens (JWT)       |
| ------------------ | ---------------------- | ------------------ |
| **Storage**        | Server-side            | Client-side        |
| **Scalability**    | Needs shared storage   | Stateless          |
| **Revocation**     | Easy                   | Requires blacklist |
| **Mobile support** | Poor                   | Excellent          |
| **XSS risk**       | Cookie httpOnly        | In JS memory       |
| **CSRF risk**      | Yes (needs protection) | No                 |

### Hybrid Approach

```python
# Use refresh tokens in httpOnly cookies
# Use access tokens in memory

class LoginView(APIView):
    def post(self, request):
        # ... authenticate user ...

        refresh = RefreshToken.for_user(user)

        response = Response({
            'status': 'success',
            'data': {
                'access': str(refresh.access_token),
                'user': UserSerializer(user).data
            }
        })

        # Set refresh token as httpOnly cookie
        response.set_cookie(
            key='refresh_token',
            value=str(refresh),
            httponly=True,
            secure=True,
            samesite='Lax',
            max_age=7 * 24 * 60 * 60  # 7 days
        )

        return response
```

---

## 👥 ROLE-BASED ACCESS CONTROL (RBAC)

### Model Design

```python
# models.py
class Role(models.Model):
    name = models.CharField(max_length=50, unique=True)
    permissions = models.ManyToManyField('Permission')

class Permission(models.Model):
    name = models.CharField(max_length=100)  # e.g., "course.create"
    description = models.TextField()

class User(AbstractUser):
    roles = models.ManyToManyField(Role)

    def has_permission(self, permission_name):
        return self.roles.filter(
            permissions__name=permission_name
        ).exists()

    @property
    def all_permissions(self):
        return Permission.objects.filter(
            role__users=self
        ).values_list('name', flat=True).distinct()
```

### Permission Decorator

```python
# decorators.py
from functools import wraps
from rest_framework.exceptions import PermissionDenied

def requires_permission(permission_name):
    def decorator(view_func):
        @wraps(view_func)
        def wrapped(self, request, *args, **kwargs):
            if not request.user.has_permission(permission_name):
                raise PermissionDenied(
                    f"Permission '{permission_name}' required"
                )
            return view_func(self, request, *args, **kwargs)
        return wrapped
    return decorator

# Usage
class CourseViewSet(viewsets.ModelViewSet):
    @requires_permission('course.create')
    def create(self, request):
        pass

    @requires_permission('course.delete')
    def destroy(self, request, pk):
        pass
```

### DRF Permissions

```python
# permissions.py
from rest_framework.permissions import BasePermission

class HasCoursePermission(BasePermission):
    def has_permission(self, request, view):
        if request.method in ['GET', 'HEAD', 'OPTIONS']:
            return True
        return request.user.has_permission('course.manage')

    def has_object_permission(self, request, view, obj):
        if request.method in ['GET', 'HEAD', 'OPTIONS']:
            return True
        return obj.instructor == request.user or request.user.has_permission('course.admin')

# viewsets.py
class CourseViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, HasCoursePermission]
```

---

## 🔐 MULTI-FACTOR AUTHENTICATION (MFA)

### TOTP (Time-based One-Time Password)

```python
import pyotp

class MFAService:
    @staticmethod
    def generate_secret():
        return pyotp.random_base32()

    @staticmethod
    def get_provisioning_uri(user, secret):
        return pyotp.totp.TOTP(secret).provisioning_uri(
            name=user.email,
            issuer_name='Learning Hub'
        )

    @staticmethod
    def verify_code(secret, code):
        totp = pyotp.TOTP(secret)
        return totp.verify(code, valid_window=1)

# views.py
class EnableMFAView(APIView):
    def post(self, request):
        secret = MFAService.generate_secret()
        uri = MFAService.get_provisioning_uri(request.user, secret)

        # Store secret temporarily
        request.session['mfa_secret'] = secret

        # Generate QR code
        import qrcode
        import io
        import base64

        qr = qrcode.make(uri)
        buffer = io.BytesIO()
        qr.save(buffer, format='PNG')
        qr_base64 = base64.b64encode(buffer.getvalue()).decode()

        return Response({
            'qr_code': f'data:image/png;base64,{qr_base64}',
            'secret': secret  # For manual entry
        })

class VerifyMFAView(APIView):
    def post(self, request):
        code = request.data.get('code')
        secret = request.session.get('mfa_secret')

        if MFAService.verify_code(secret, code):
            # Save to user profile
            request.user.mfa_secret = secret
            request.user.mfa_enabled = True
            request.user.save()

            return Response({'message': 'MFA enabled'})

        return Response({'error': 'Invalid code'}, status=400)
```

---

## 🔒 PASSWORD SECURITY

### Hashing Best Practices

```python
# settings.py
PASSWORD_HASHERS = [
    'django.contrib.auth.hashers.Argon2PasswordHasher',  # Best
    'django.contrib.auth.hashers.PBKDF2PasswordHasher',
    'django.contrib.auth.hashers.BCryptSHA256PasswordHasher',
]

# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
        'OPTIONS': {'min_length': 12}
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
    {
        'NAME': 'zxcvbn_password.ZXCVBNValidator',  # pip install django-zxcvbn-password
        'OPTIONS': {'min_score': 3}
    },
]
```

### Password Reset Flow

```python
from django.contrib.auth.tokens import PasswordResetTokenGenerator

class CustomTokenGenerator(PasswordResetTokenGenerator):
    def _make_hash_value(self, user, timestamp):
        return f"{user.pk}{timestamp}{user.password}"

token_generator = CustomTokenGenerator()

class RequestPasswordResetView(APIView):
    def post(self, request):
        email = request.data.get('email')
        try:
            user = User.objects.get(email=email)
            token = token_generator.make_token(user)
            uid = urlsafe_base64_encode(force_bytes(user.pk))

            reset_url = f"https://app.example.com/reset-password/{uid}/{token}"
            send_password_reset_email(user.email, reset_url)
        except User.DoesNotExist:
            pass  # Don't reveal if email exists

        return Response({'message': 'If email exists, reset link sent'})

class ConfirmPasswordResetView(APIView):
    def post(self, request, uidb64, token):
        try:
            uid = urlsafe_base64_decode(uidb64).decode()
            user = User.objects.get(pk=uid)

            if token_generator.check_token(user, token):
                user.set_password(request.data.get('password'))
                user.save()
                return Response({'message': 'Password reset successful'})
        except Exception:
            pass

        return Response({'error': 'Invalid or expired link'}, status=400)
```

---

## ⚠️ COMMON VULNERABILITIES

### 1. Brute Force Prevention

```python
from django_ratelimit.decorators import ratelimit

@ratelimit(key='ip', rate='5/m', method='POST', block=True)
@ratelimit(key='post:email', rate='3/m', method='POST', block=True)
def login_view(request):
    pass
```

### 2. Session Fixation

```python
# Django handles this automatically
# After login, session ID is regenerated
request.session.cycle_key()
```

### 3. JWT Best Practices

```python
# ❌ DON'T
# - Store in localStorage (XSS vulnerable)
# - Use long-lived access tokens
# - Include sensitive data in payload

# ✅ DO
# - Store access in memory, refresh in httpOnly cookie
# - Use short access token lifetime (15 min)
# - Blacklist tokens on logout
```

---

## 💎 AUTH GOLDEN RULES

1. **Hash passwords** - Never store plaintext
2. **Use HTTPS** - Always in production
3. **Short access tokens** - 15 minutes max
4. **Secure refresh tokens** - httpOnly cookies
5. **Validate everywhere** - Frontend AND backend
6. **Rate limit auth endpoints** - Prevent brute force
7. **Log auth events** - Audit trail essential

---

**SINGULARITY ENGINE v16.0**  
_"Security is not a feature, it's a foundation."_

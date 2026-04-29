# 🔐 OAuth2 & OpenID Connect COMPLETE GUIDE

## Modern Authentication & Authorization Protocols

---

## 📋 TABLE OF CONTENTS

1. [What is OAuth2](#-what-is-oauth2)
2. [OAuth2 Roles](#-oauth2-roles)
3. [Authorization Flows](#-authorization-flows)
4. [OpenID Connect](#-openid-connect)
5. [Token Types](#-token-types)
6. [Implementation Guide](#-implementation-guide)
7. [Security Best Practices](#-security-best-practices)
8. [Common Attacks & Defenses](#-common-attacks--defenses)

---

## 🎯 WHAT IS OAUTH2

### Definition

**OAuth 2.0** is an **authorization framework** that enables applications to obtain limited access to user accounts on other services.

### Key Insight

> **OAuth2 is about AUTHORIZATION (what you can do), not AUTHENTICATION (who you are).**

### Real-World Analogy

```
Traditional:
  You give your house key to the cleaning service.
  ❌ They have full access to everything!

OAuth2:
  You give them a special key that:
  - Only opens the front door
  - Only works Mon-Fri, 9am-5pm
  - Can be revoked anytime
  ✅ Limited, scoped access!
```

---

## 👥 OAUTH2 ROLES

### The Four Actors

```
┌─────────────────────────────────────────────────────────────────┐
│                       OAuth2 Roles                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────┐           ┌─────────────────┐             │
│  │ Resource Owner  │           │    Client       │             │
│  │    (User)       │           │  (Your App)     │             │
│  │                 │           │                 │             │
│  │ "I own my data" │           │ "I want access" │             │
│  └─────────────────┘           └─────────────────┘             │
│                                                                 │
│  ┌─────────────────┐           ┌─────────────────┐             │
│  │ Authorization   │           │ Resource        │             │
│  │ Server          │           │ Server          │             │
│  │ (Google Auth)   │           │ (Google API)    │             │
│  │                 │           │                 │             │
│  │ "I issue tokens"│           │ "I have data"   │             │
│  └─────────────────┘           └─────────────────┘             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Examples

| Role                 | Example                      |
| -------------------- | ---------------------------- |
| Resource Owner       | A user with a Google account |
| Client               | Your Learning Hub app        |
| Authorization Server | Google OAuth server          |
| Resource Server      | Google Calendar API          |

---

## 🔄 AUTHORIZATION FLOWS

### 1. Authorization Code Flow (Most Secure)

```
┌──────────────────────────────────────────────────────────────┐
│                 Authorization Code Flow                       │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌────────┐     1. Redirect to Auth     ┌───────────────┐   │
│  │  User  │──────────────────────────►│   Auth Server  │   │
│  │        │◄──────────────────────────│    (Google)    │   │
│  └───┬────┘     2. Login + Consent     └───────┬───────┘   │
│      │                                          │           │
│      │ 3. Redirect with code                   │           │
│      ▼                                          │           │
│  ┌────────┐                                     │           │
│  │ Client │     4. Exchange code for token     │           │
│  │  App   │────────────────────────────────────┘           │
│  │        │◄───────────────────────────────────            │
│  └────────┘     5. Access + Refresh tokens                 │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

**Use for**: Web apps with backend

```python
# Step 1: Redirect user
def oauth_start(request):
    auth_url = (
        f"https://accounts.google.com/o/oauth2/v2/auth?"
        f"client_id={CLIENT_ID}&"
        f"redirect_uri={REDIRECT_URI}&"
        f"response_type=code&"
        f"scope=openid email profile&"
        f"state={generate_state()}"  # CSRF protection
    )
    return redirect(auth_url)

# Step 2: Handle callback
def oauth_callback(request):
    code = request.GET.get('code')
    state = request.GET.get('state')

    # Verify state (CSRF protection)
    if state != session.get('oauth_state'):
        raise SecurityError("Invalid state")

    # Exchange code for tokens
    response = requests.post(
        'https://oauth2.googleapis.com/token',
        data={
            'client_id': CLIENT_ID,
            'client_secret': CLIENT_SECRET,
            'code': code,
            'grant_type': 'authorization_code',
            'redirect_uri': REDIRECT_URI
        }
    )

    tokens = response.json()
    # tokens = {
    #     'access_token': '...',
    #     'refresh_token': '...',
    #     'id_token': '...',  # OIDC
    #     'expires_in': 3600
    # }
```

### 2. Authorization Code + PKCE (Mobile/SPA)

```
PKCE = Proof Key for Code Exchange

1. Generate code_verifier (random string)
2. Calculate code_challenge = SHA256(code_verifier)
3. Send code_challenge in auth request
4. Send code_verifier in token exchange
5. Server verifies: SHA256(code_verifier) == stored code_challenge
```

**Implementation**:

```python
import secrets
import hashlib
import base64

def generate_pkce_pair():
    # Generate verifier
    code_verifier = secrets.token_urlsafe(32)

    # Generate challenge
    digest = hashlib.sha256(code_verifier.encode()).digest()
    code_challenge = base64.urlsafe_b64encode(digest).decode().rstrip('=')

    return code_verifier, code_challenge

# In auth request
auth_url = (
    f"https://auth.example.com/authorize?"
    f"client_id={CLIENT_ID}&"
    f"response_type=code&"
    f"code_challenge={code_challenge}&"
    f"code_challenge_method=S256"
)

# In token exchange
response = requests.post(
    'https://auth.example.com/token',
    data={
        'client_id': CLIENT_ID,
        'code': authorization_code,
        'code_verifier': code_verifier,  # Prove you started the flow
        'grant_type': 'authorization_code'
    }
)
```

### 3. Client Credentials (Server-to-Server)

```
┌────────────────────────────────────────────────────────────┐
│              Client Credentials Flow                        │
│                                                             │
│  ┌────────┐     client_id + secret     ┌───────────────┐  │
│  │ Server │───────────────────────────►│  Auth Server  │  │
│  │  App   │◄───────────────────────────│               │  │
│  └────────┘       access_token         └───────────────┘  │
│                                                             │
└────────────────────────────────────────────────────────────┘
```

**Use for**: Service accounts, cron jobs, APIs calling APIs

```python
def get_service_token():
    response = requests.post(
        'https://auth.example.com/token',
        data={
            'client_id': CLIENT_ID,
            'client_secret': CLIENT_SECRET,
            'grant_type': 'client_credentials',
            'scope': 'api:read api:write'
        }
    )
    return response.json()['access_token']
```

### 4. Refresh Token Flow

```python
def refresh_access_token(refresh_token):
    response = requests.post(
        'https://auth.example.com/token',
        data={
            'client_id': CLIENT_ID,
            'grant_type': 'refresh_token',
            'refresh_token': refresh_token
        }
    )
    return response.json()
```

---

## 🎫 OPENID CONNECT

### What is OIDC?

**OpenID Connect** is an identity layer on top of OAuth2. It adds:

- **Authentication** (who is the user?)
- **ID Token** (user info in JWT)
- **UserInfo endpoint**

### ID Token Structure

```json
{
  "header": {
    "alg": "RS256",
    "typ": "JWT",
    "kid": "key-id-123"
  },
  "payload": {
    "iss": "https://accounts.google.com",
    "sub": "user-unique-id",
    "aud": "your-client-id",
    "exp": 1704614400,
    "iat": 1704610800,
    "email": "user@example.com",
    "email_verified": true,
    "name": "John Doe",
    "picture": "https://..."
  },
  "signature": "..."
}
```

### Validating ID Token

```python
import jwt
from jwt import PyJWKClient

def validate_id_token(id_token, client_id, issuer):
    # Fetch public keys
    jwks_client = PyJWKClient(f"{issuer}/.well-known/jwks.json")
    signing_key = jwks_client.get_signing_key_from_jwt(id_token)

    # Verify and decode
    claims = jwt.decode(
        id_token,
        signing_key.key,
        algorithms=["RS256"],
        audience=client_id,
        issuer=issuer
    )

    return claims
```

### Standard Scopes

| Scope     | Data Returned         |
| --------- | --------------------- |
| `openid`  | Required for OIDC     |
| `profile` | name, picture, etc.   |
| `email`   | email, email_verified |
| `address` | Address claims        |
| `phone`   | phone_number          |

---

## 🔑 TOKEN TYPES

### Comparison

| Type              | Purpose               | Lifetime           | Storage        |
| ----------------- | --------------------- | ------------------ | -------------- |
| **Access Token**  | API authorization     | Short (15min-1hr)  | Memory         |
| **Refresh Token** | Get new access tokens | Long (days-months) | Secure storage |
| **ID Token**      | User identity (OIDC)  | Short              | Don't store    |

### JWT Access Token

```python
import jwt
from datetime import datetime, timedelta

def create_access_token(user_id, scopes):
    payload = {
        'sub': str(user_id),
        'iat': datetime.utcnow(),
        'exp': datetime.utcnow() + timedelta(minutes=15),
        'scope': ' '.join(scopes),
        'type': 'access'
    }
    return jwt.encode(payload, SECRET_KEY, algorithm='HS256')

def verify_access_token(token):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=['HS256'])
        if payload['type'] != 'access':
            raise jwt.InvalidTokenError("Invalid token type")
        return payload
    except jwt.ExpiredSignatureError:
        raise AuthError("Token expired")
    except jwt.InvalidTokenError:
        raise AuthError("Invalid token")
```

---

## 🛠️ IMPLEMENTATION GUIDE

### Django Integration

```python
# settings.py
INSTALLED_APPS = [
    'django.contrib.auth',
    'social_django',  # python-social-auth
]

AUTHENTICATION_BACKENDS = [
    'social_core.backends.google.GoogleOAuth2',
    'django.contrib.auth.backends.ModelBackend',
]

SOCIAL_AUTH_GOOGLE_OAUTH2_KEY = 'your-client-id'
SOCIAL_AUTH_GOOGLE_OAUTH2_SECRET = 'your-client-secret'
SOCIAL_AUTH_GOOGLE_OAUTH2_SCOPE = [
    'openid',
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/userinfo.profile',
]

# urls.py
urlpatterns = [
    path('auth/', include('social_django.urls', namespace='social')),
]
```

### Flutter Client

```dart
import 'package:flutter_appauth/flutter_appauth.dart';

class AuthService {
  final FlutterAppAuth _appAuth = FlutterAppAuth();

  Future<AuthorizationTokenResponse?> login() async {
    return await _appAuth.authorizeAndExchangeCode(
      AuthorizationTokenRequest(
        'your-client-id',
        'com.yourapp://callback',
        issuer: 'https://accounts.google.com',
        scopes: ['openid', 'email', 'profile'],
        promptValues: ['login'],
      ),
    );
  }

  Future<TokenResponse?> refreshToken(String refreshToken) async {
    return await _appAuth.token(
      TokenRequest(
        'your-client-id',
        'com.yourapp://callback',
        refreshToken: refreshToken,
        issuer: 'https://accounts.google.com',
      ),
    );
  }
}
```

---

## 🛡️ SECURITY BEST PRACTICES

### Token Security

| Practice                     | Implementation              |
| ---------------------------- | --------------------------- |
| Short access token lifetime  | 15 minutes max              |
| Secure refresh token storage | HttpOnly cookie or Keychain |
| Rotate refresh tokens        | Issue new on each use       |
| Validate all claims          | iss, aud, exp, etc.         |

### PKCE for All Public Clients

```python
# ALWAYS use PKCE for:
# - Mobile apps
# - Single Page Applications
# - Desktop apps
# - Any client without a secret
```

### State Parameter (CSRF Protection)

```python
import secrets

def generate_state():
    state = secrets.token_urlsafe(32)
    session['oauth_state'] = state
    return state

def validate_state(received_state):
    expected = session.pop('oauth_state', None)
    if not secrets.compare_digest(received_state, expected or ''):
        raise SecurityError("CSRF detected")
```

---

## ⚔️ COMMON ATTACKS & DEFENSES

### 1. Authorization Code Interception

**Attack**: Attacker intercepts authorization code  
**Defense**: PKCE + secure redirect URIs

### 2. Token Theft

**Attack**: XSS steals tokens from localStorage  
**Defense**: HttpOnly cookies for refresh tokens

### 3. CSRF on Callback

**Attack**: Attacker creates malicious auth link  
**Defense**: State parameter validation

### 4. Open Redirect

**Attack**: Redirect to attacker's site  
**Defense**: Whitelist redirect URIs, validate strictly

```python
ALLOWED_REDIRECT_URIS = [
    'https://yourapp.com/callback',
    'https://staging.yourapp.com/callback',
]

def validate_redirect_uri(uri):
    if uri not in ALLOWED_REDIRECT_URIS:
        raise SecurityError(f"Invalid redirect URI: {uri}")
```

---

**SINGULARITY ENGINE v17.0**  
_"Authorize wisely, authenticate correctly."_

# 🛡️ Module 8: Security Engineering Deep Dive

## 8.1 Password Hashing: Why Argon2?

### The Problem

- **MD5/SHA**: Too fast! Hackers can brute-force billions of hashes/second.
- **bcrypt**: Good, but vulnerable to GPU attacks.
- **Argon2**: Winner of Password Hashing Competition (2015). Memory-hard = GPU-resistant.

### Django Configuration

```python
# settings/base.py
PASSWORD_HASHERS = [
    'django.contrib.auth.hashers.Argon2PasswordHasher',  # Primary
    'django.contrib.auth.hashers.PBKDF2PasswordHasher',   # Fallback
]
```

---

## 8.2 CORS: Cross-Origin Resource Sharing

### The Attack: Cross-Site Request Forgery (CSRF)

- Malicious site tricks browser into making authenticated requests to your API.

### The Defense

```python
# Development: Allow all (testing only!)
CORS_ALLOW_ALL_ORIGINS = True  # ⚠️ NEVER in production

# Production: Whitelist specific origins
CORS_ALLOWED_ORIGINS = [
    'https://learninghub.com',
    'https://app.learninghub.com',
]
CORS_ALLOW_CREDENTIALS = True  # For cookies
```

---

## 8.3 SQL Injection Prevention

### The Attack

```python
# ❌ VULNERABLE: String concatenation
User.objects.raw(f"SELECT * FROM users WHERE email = '{email}'")
# Attacker input: ' OR '1'='1' --

# ✅ SAFE: Django ORM (parameterized)
User.objects.filter(email=email)
```

### Why ORM is Safe

Django's ORM **always** uses parameterized queries under the hood, separating SQL logic from user data.

---

## 8.4 Secret Management

### The Golden Rule

> **NEVER commit secrets to Git. EVER.**

### The Pattern

```bash
# .env (NOT in Git)
SECRET_KEY=your-super-secret-key-here
DATABASE_URL=postgres://user:pass@localhost/db

# .gitignore
.env
*.pem
secrets/
```

### Production

Use cloud secret managers: AWS Secrets Manager, GCP Secret Manager, HashiCorp Vault.

---

_Updated: 2026-01-06 (God Mode v7.0)_

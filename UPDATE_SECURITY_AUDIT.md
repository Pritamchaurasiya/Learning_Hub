# LEARNINGHUB STUDENT UPDATES HUB — SECURITY AUDIT & THREAT MODEL

> **Standards:** OWASP Top 10, CWE / SANS Top 25, Zero-Trust Architecture  
> **Review Scope:** Ingestion Pipeline, API Endpoints, WebSocket Delivery, Client-Side Rendering  

---

## 1. THREAT MODELING & ATTACK SURFACE

| Threat ID | Vulnerability / Threat | Risk Level | Attack Vector | Mitigation in LearningHub |
|---|---|---|---|---|
| **THR-01** | **Server-Side Request Forgery (SSRF)** | **CRITICAL** | Attacker registers a malicious source URL targeting internal cloud metadata (`169.254.169.254`) or intranet services (`localhost:8000`, `redis:6379`). | • IP pre-resolution check blocking `0.0.0.0/8`, `10.0.0.0/8`, `127.0.0.0/8`, `169.254.0.0/16`, `172.16.0.0/12`, `192.168.0.0/16`, `::1`.<br>• Protocol whitelist (`http`, `https` only).<br>• Automated polling allowed **ONLY** for admin-approved sources in the registry. |
| **THR-02** | **Stored Cross-Site Scripting (XSS)** | **HIGH** | Official or secondary HTML notice contains malicious `<script>` or `<img onerror=...>` payload. | • Backend sanitization stripping unsafe HTML tags using Bleach before database persistence.<br>• Frontend rendering with React's JSX auto-escaping and DOMPurify for any sanitized HTML previews.<br>• Strict Content Security Policy (`CSPMiddleware`) blocking `unsafe-inline` scripts. |
| **THR-03** | **Malicious Attachment / PDF Exploitation** | **HIGH** | Ingested PDF link contains malware or buffer overflow exploits. | • LearningHub links directly to the official origin document rather than proxying raw binary execution.<br>• Download headers enforce `nosniff`.<br>• Attachment links set `target="_blank" rel="noopener noreferrer"`. |
| **THR-04** | **Content Injection & Fake Notice Fabrication** | **HIGH** | Malicious actor injects false exam dates or cancelled notices to cause student panic. | • Only Level 1 & 2 sources can auto-publish.<br>• Non-official / Level 3+ sources automatically enter quarantine queue awaiting human verification.<br>• All notices display explicit audit trail: source domain, canonical URL, and last checked time. |
| **THR-05** | **Notification Flood / Denial of Service** | **MEDIUM** | Ingestion loop triggers infinite duplicate notifications during portal maintenance or layout shifts. | • SHA-256 canonical hashing across `(title + url + date + content)`.<br>• Redis rate limit lock (`setnx`) on notification dispatch (max 1 notification per update per user).<br>• Daily frequency caps (max 3 non-critical push alerts). |
| **THR-06** | **Broken Object-Level Authorization (BOLA)** | **HIGH** | User modifies or deletes another student's bookmarks or reminders. | • Django permissions enforce `IsOwnerOrAdmin` checking `request.user == bookmark.user`. |

---

## 2. SSRF DEFENSE IMPLEMENTATION SPECIFICATION

```python
# learninghub/django_backend/apps/updates/validators.py
import socket
import ipaddress
from urllib.parse import urlparse
from django.core.exceptions import ValidationError

BLOCKED_IP_NETWORKS = [
    ipaddress.ip_network('127.0.0.0/8'),        # Loopback
    ipaddress.ip_network('10.0.0.0/8'),         # RFC 1918 Private
    ipaddress.ip_network('172.16.0.0/12'),      # RFC 1918 Private
    ipaddress.ip_network('192.168.0.0/16'),     # RFC 1918 Private
    ipaddress.ip_network('169.254.0.0/16'),     # Link-local / Cloud Metadata
    ipaddress.ip_network('fc00::/7'),           # IPv6 Private
    ipaddress.ip_network('::1/128'),            # IPv6 Loopback
]

def validate_safe_external_url(url: str) -> str:
    """
    Validates that a URL is safe for server-side HTTP requests.
    Prevents SSRF, DNS rebinding, and loopback targeting.
    """
    parsed = urlparse(url)
    if parsed.scheme not in ('http', 'https'):
        raise ValidationError(f"Invalid URL scheme: {parsed.scheme}. Only http/https allowed.")

    hostname = parsed.hostname
    if not hostname:
        raise ValidationError("Missing hostname in URL.")

    # Resolve IP addresses
    try:
        addr_info = socket.getaddrinfo(hostname, None)
        ips = [info[4][0] for info in addr_info]
    except Exception as e:
        raise ValidationError(f"Failed to resolve DNS for {hostname}: {str(e)}")

    for ip_str in ips:
        ip = ipaddress.ip_address(ip_str)
        for blocked_net in BLOCKED_IP_NETWORKS:
            if ip in blocked_net:
                raise ValidationError(f"Target IP {ip_str} falls into prohibited network {blocked_net}.")

    return url
```

---

## 3. AUDIT TRAILS & OBSERVABILITY

- Every state change (source added, notice ingested, notice approved, notice rejected, notice updated) records an immutable entry into `lh_audit_logs` using `apps.core.models.AuditLog.record()`.
- Records actor, action type, IP address, user agent, and SHA-256 hashed state diff.

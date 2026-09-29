"""
Security and Domain Validators for Student Updates Hub.
"""
import socket
import ipaddress
from urllib.parse import urlparse
from django.core.exceptions import ValidationError

BLOCKED_IP_NETWORKS = [
    ipaddress.ip_network('0.0.0.0/8'),
    ipaddress.ip_network('127.0.0.0/8'),        # Loopback
    ipaddress.ip_network('10.0.0.0/8'),         # RFC 1918 Private Class A
    ipaddress.ip_network('172.16.0.0/12'),      # RFC 1918 Private Class B
    ipaddress.ip_network('192.168.0.0/16'),     # RFC 1918 Private Class C
    ipaddress.ip_network('169.254.0.0/16'),     # Link-Local / Cloud Instance Metadata
    ipaddress.ip_network('fc00::/7'),           # IPv6 Private Unique Local
    ipaddress.ip_network('::1/128'),            # IPv6 Loopback
]


def validate_safe_external_url(url: str) -> str:
    """
    Validates that a URL is safe for server-side HTTP ingestion.
    Prevents SSRF, DNS rebinding, internal network scanning, and loopback targeting.
    """
    if not url or not isinstance(url, str):
        raise ValidationError("URL must be a non-empty string.")

    url = url.strip()
    parsed = urlparse(url)

    if parsed.scheme.lower() not in ('http', 'https'):
        raise ValidationError(f"Invalid URL scheme '{parsed.scheme}'. Only http and https protocols are permitted.")

    hostname = parsed.hostname
    if not hostname:
        raise ValidationError("URL must include a valid hostname.")

    # Block localhost string literals directly
    if hostname.lower() in ('localhost', 'localhost.localdomain', '127.0.0.1', '::1'):
        raise ValidationError(f"Host '{hostname}' points to local system and is prohibited.")

    # Resolve IP addresses to prevent DNS rebinding or private IP redirection
    try:
        addr_info = socket.getaddrinfo(hostname, None)
        resolved_ips = [info[4][0] for info in addr_info]
    except Exception as exc:
        raise ValidationError(f"DNS resolution failed for hostname '{hostname}': {str(exc)}")

    for ip_str in resolved_ips:
        try:
            ip = ipaddress.ip_address(ip_str)
            for blocked_net in BLOCKED_IP_NETWORKS:
                if ip in blocked_net:
                    raise ValidationError(
                        f"Target IP {ip_str} for host '{hostname}' resides in a restricted network ({blocked_net})."
                    )
        except ValueError:
            raise ValidationError(f"Invalid resolved IP format: {ip_str}")

    return url

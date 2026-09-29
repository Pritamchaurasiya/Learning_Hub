"""
Unit tests for SSRF prevention and URL validators.
"""
import pytest
from django.core.exceptions import ValidationError
from apps.updates.validators import validate_safe_external_url


def test_valid_public_url():
    url = "https://mgkvp.ac.in/Home/NoticeList"
    assert validate_safe_external_url(url) == url


def test_reject_invalid_scheme():
    with pytest.raises(ValidationError) as exc:
        validate_safe_external_url("ftp://mgkvp.ac.in/notice.pdf")
    assert "Invalid URL scheme" in str(exc.value)

    with pytest.raises(ValidationError) as exc2:
        validate_safe_external_url("file:///etc/passwd")
    assert "Invalid URL scheme" in str(exc2.value)


def test_reject_localhost():
    with pytest.raises(ValidationError) as exc:
        validate_safe_external_url("http://localhost:8000/api")
    assert "prohibited" in str(exc.value)


def test_reject_loopback_ip():
    with pytest.raises(ValidationError) as exc:
        validate_safe_external_url("http://127.0.0.1:8000/internal")
    assert "prohibited" in str(exc.value) or "restricted network" in str(exc.value)


def test_reject_cloud_metadata_ip():
    with pytest.raises(ValidationError) as exc:
        validate_safe_external_url("http://169.254.169.254/latest/meta-data/")
    assert "restricted network" in str(exc.value)

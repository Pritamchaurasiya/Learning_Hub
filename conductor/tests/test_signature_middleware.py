import hashlib
import hmac
import json
import time

import pytest
from django.http import HttpResponse
from django.test import RequestFactory, override_settings

from apps.core.middleware import SignatureVerificationMiddleware

SECRET = "test-api-secret"
PATH = "/api/v1/payments/"


def _sign(path, timestamp, body=""):
    message = f"{path}{timestamp}{body}"
    return hmac.new(SECRET.encode(), message.encode(), hashlib.sha256).hexdigest()


@pytest.fixture
def middleware():
    with override_settings(API_SECRET_KEY=SECRET):
        yield SignatureVerificationMiddleware(lambda request: HttpResponse("ok"))


@pytest.fixture
def rf():
    return RequestFactory()


def _post(rf, body="{}", **headers):
    return rf.post(PATH, data=body, content_type="application/json", **headers)


def test_missing_signature_is_rejected(middleware, rf):
    response = middleware(_post(rf))
    assert response.status_code == 401
    assert json.loads(response.content) == {"error": "Missing API signature"}


def test_signature_without_timestamp_is_rejected(middleware, rf):
    response = middleware(_post(rf, HTTP_X_API_SIGNATURE=_sign(PATH, "", "{}")))
    assert response.status_code == 401


def test_invalid_signature_is_rejected(middleware, rf):
    ts = str(int(time.time()))
    response = middleware(
        _post(rf, HTTP_X_API_SIGNATURE="bad", HTTP_X_API_TIMESTAMP=ts)
    )
    assert response.status_code == 401
    assert json.loads(response.content) == {"error": "Invalid API signature"}


def test_expired_timestamp_is_rejected(middleware, rf):
    ts = str(int(time.time()) - 600)
    response = middleware(
        _post(rf, HTTP_X_API_SIGNATURE=_sign(PATH, ts, "{}"), HTTP_X_API_TIMESTAMP=ts)
    )
    assert response.status_code == 401


def test_valid_signature_passes(middleware, rf):
    ts = str(int(time.time()))
    response = middleware(
        _post(rf, HTTP_X_API_SIGNATURE=_sign(PATH, ts, "{}"), HTTP_X_API_TIMESTAMP=ts)
    )
    assert response.status_code == 200


def test_safe_methods_skip_verification(middleware, rf):
    assert middleware(rf.get(PATH)).status_code == 200


def test_no_secret_configured_skips_verification(rf):
    with override_settings(API_SECRET_KEY=None):
        mw = SignatureVerificationMiddleware(lambda request: HttpResponse("ok"))
    assert mw(_post(rf)).status_code == 200

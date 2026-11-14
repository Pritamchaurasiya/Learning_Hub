from unittest.mock import patch

import pytest
from django.db.utils import OperationalError
from rest_framework.test import APIClient


@pytest.mark.django_db
def test_readiness_returns_503_when_database_is_unavailable():
    client = APIClient()

    with (
        patch("django.db.connection.cursor", side_effect=OperationalError("database unavailable")),
        patch("apps.core.views.settings.REDIS_URL", ""),
    ):
        response = client.get("/api/v1/health/ready")

    assert response.status_code == 503
    assert response.data["data"]["ready"] is False
    assert response.data["data"]["checks"]["database"] is False


@pytest.mark.django_db
def test_readiness_returns_200_when_database_is_available_without_redis():
    client = APIClient()

    with patch("apps.core.views.settings.REDIS_URL", ""):
        response = client.get("/api/v1/health/ready")

    assert response.status_code == 200
    assert response.data["data"]["ready"] is True
    assert response.data["data"]["checks"]["database"] is True

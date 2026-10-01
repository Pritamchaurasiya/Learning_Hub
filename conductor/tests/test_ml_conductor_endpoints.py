"""
Tests for ConductorClient ML endpoints:
- DKT Recommendations
- Anti-Cheat Anomaly Detection
"""

import pytest
from rest_framework import status
from apps.courses.models import Course, Category


@pytest.mark.django_db
class TestMLConductorEndpoints:
    @pytest.fixture
    def user(self, django_user_model):
        return django_user_model.objects.create_user(
            username="ml_learner",
            email="ml_learner@example.com",
            password="testpassword123",
        )

    @pytest.fixture
    def category(self):
        return Category.objects.create(name="AI Systems", slug="ai-systems")

    @pytest.fixture
    def course(self, user, category):
        return Course.objects.create(
            title="Deep Knowledge Tracing 101",
            slug="dkt-101",
            instructor=user,
            category=category,
            is_published=True,
        )

    def test_dkt_recommendations_with_user_id(self, api_client, user, course):
        response = api_client.get(f"/api/v1/ai/dkt/recommendations/{user.id}/")
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["status"] == "success"
        assert "recommendations" in data
        assert isinstance(data["recommendations"], list)
        assert len(data["recommendations"]) > 0
        first_rec = data["recommendations"][0]
        assert "topic_name" in first_rec
        assert "priority" in first_rec
        assert "expected_accuracy" in first_rec

    def test_dkt_recommendations_default(self, api_client, course):
        response = api_client.get("/api/v1/ai/dkt/recommendations/")
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["status"] == "success"
        assert len(data["recommendations"]) > 0

    def test_anomaly_detect_normal_metrics(self, api_client):
        payload = {
            "attempt_id": "attempt_101",
            "metrics": [
                {"questionId": "q1", "timeSpentSeconds": 45.2, "difficulty": 1.0},
                {"questionId": "q2", "timeSpentSeconds": 62.1, "difficulty": 2.0},
                {"questionId": "q3", "timeSpentSeconds": 38.4, "difficulty": 1.5},
            ]
        }
        response = api_client.post("/api/v1/ai/anomaly/detect/", payload, format="json")
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "isSuspicious" in data
        assert data["isSuspicious"] is False
        assert "confidence" in data

    def test_anomaly_detect_rapid_guessing(self, api_client):
        payload = {
            "attempt_id": "attempt_cheat_99",
            "metrics": [
                {"questionId": "q1", "timeSpentSeconds": 1.2, "difficulty": 2.5},
                {"questionId": "q2", "timeSpentSeconds": 1.1, "difficulty": 3.0},
                {"questionId": "q3", "timeSpentSeconds": 1.3, "difficulty": 2.0},
                {"questionId": "q4", "timeSpentSeconds": 50.0, "difficulty": 1.0},
            ]
        }
        response = api_client.post("/api/v1/ai/anomaly/detect/", payload, format="json")
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["isSuspicious"] is True
        assert data["confidence"] > 0.5
        assert "rapid answering detected" in str(data["details"]["reasons"])

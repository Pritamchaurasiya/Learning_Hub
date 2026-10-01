import pytest
from rest_framework.test import APIClient

@pytest.mark.django_db
def test_irt_calibration_endpoint():
    client = APIClient()
    payload = {
        "current_theta": 0.0,
        "responses": [
            {"question_id": "q1", "is_correct": True},
            {"question_id": "q2", "is_correct": True},
        ],
        "available_pool": [
            {"id": "q1", "difficulty": -1.0, "discrimination": 1.0, "guessing": 0.2},
            {"id": "q2", "difficulty": 0.0, "discrimination": 1.2, "guessing": 0.2},
            {"id": "q3", "difficulty": 1.0, "discrimination": 1.5, "guessing": 0.2},
            {"id": "q4", "difficulty": 2.0, "discrimination": 1.8, "guessing": 0.2},
        ]
    }
    response = client.post('/api/v1/ai/irt-calibrate/', payload, format='json')
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert "estimated_theta" in data["data"]
    # Since q1 and q2 were correct, ability theta should increase > 0
    assert data["data"]["estimated_theta"] > 0.0
    # Next question should be chosen from remaining (q3 or q4)
    assert data["data"]["next_question_id"] in ["q3", "q4"]
    assert data["data"]["remaining_pool_count"] == 2

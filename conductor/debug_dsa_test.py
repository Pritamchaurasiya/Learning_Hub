import os
import django
import pytest
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model
from apps.dsa.models import Problem

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.test')
django.setup()

@pytest.mark.django_db
def test_debug_submission():
    client = APIClient()
    User = get_user_model()
    user = User.objects.create_user(email="debug@test.com", username="debuguser", password="Pass123!")
    problem = Problem.objects.create(title="Debug Problem", slug="debug-problem", description="test")
    
    client.force_authenticate(user=user)
    data = {
        "problem": problem.id,
        "code": "print(1)",
        "language": "python"
    }
    response = client.post("/api/v1/dsa/submissions/", data)
    print(f"STATUS: {response.status_code}")
    print(f"DATA: {response.data}")

if __name__ == "__main__":
    # Manually trigger the test logic
    from django.db import connection
    test_debug_submission()

import pytest
from rest_framework.test import APIClient
from django.urls import reverse
from apps.dsa.models import Problem, Tag
from apps.users.models import User

@pytest.fixture
def api_client():
    return APIClient()

@pytest.fixture
def user(db):
    return User.objects.create_user(username='testuser', email='test@example.com', password='password')

@pytest.fixture
def dsa_setup(db):
    # Create tags
    tag_array = Tag.objects.create(name="Array", slug="array")
    tag_dp = Tag.objects.create(name="DP", slug="dp")

    # Create problems
    p1 = Problem.objects.create(
        title="Two Sum",
        slug="two-sum",
        difficulty="EASY",
        description="Find two numbers that add up to target.",
        points=10,
        input_format="List[int]",
        output_format="List[int]",
        constraints="N < 1000",
        examples=[]
    )
    p1.tags.add(tag_array)

    p2 = Problem.objects.create(
        title="Knapsack",
        slug="knapsack",
        difficulty="MEDIUM",
        description="Maximize value within weight limit.",
        points=20,
        input_format="Weights, Values",
        output_format="Max Value",
        constraints="N < 100",
        examples=[]
    )
    p2.tags.add(tag_dp)

    return [p1, p2]

@pytest.mark.django_db
class TestProblemAPI:
    def test_list_problems(self, api_client, user, dsa_setup):
        api_client.force_authenticate(user=user)
        url = '/api/v1/dsa/problems/'
        response = api_client.get(url)
        assert response.status_code == 200
        assert len(response.data['results']) == 2

    def test_search_problems(self, api_client, user, dsa_setup):
        api_client.force_authenticate(user=user)
        url = '/api/v1/dsa/problems/?search=Knapsack'
        response = api_client.get(url)
        assert response.status_code == 200
        assert len(response.data['results']) == 1
        assert response.data['results'][0]['title'] == "Knapsack"

    def test_filter_by_difficulty(self, api_client, user, dsa_setup):
        api_client.force_authenticate(user=user)
        url = '/api/v1/dsa/problems/?difficulty=EASY'
        response = api_client.get(url)
        assert response.status_code == 200
        assert len(response.data['results']) == 1
        assert response.data['results'][0]['title'] == "Two Sum"

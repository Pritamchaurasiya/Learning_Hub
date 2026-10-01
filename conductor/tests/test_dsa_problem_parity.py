"""
Tests for DSA & Problem Solving API Contract Parity.
Validates exact contract alignment between Django backend and frontend problemService.ts / types/dsa.ts.
"""

import pytest
from rest_framework import status
from django.contrib.auth import get_user_model
from apps.dsa.models import Problem, TestCase, Submission, Tag

User = get_user_model()


@pytest.fixture
def dsa_tag(db):
    return Tag.objects.create(name="Array", slug="array")


@pytest.fixture
def dsa_problem(db, dsa_tag):
    problem = Problem.objects.create(
        title="Two Sum",
        slug="two-sum",
        description="Given an array of integers nums and an integer target, return indices.",
        difficulty=Problem.Difficulty.EASY,
        points=100,
        constraints="2 <= nums.length <= 10^4",
        input_format="nums = [2,7,11,15], target = 9",
        output_format="[0,1]",
        is_active=True,
    )
    problem.tags.add(dsa_tag)
    TestCase.objects.create(
        problem=problem,
        input_data="[2,7,11,15]\n9",
        expected_output="[0,1]",
        is_hidden=False,
        explanation="2 + 7 = 9",
    )
    TestCase.objects.create(
        problem=problem,
        input_data="[3,2,4]\n6",
        expected_output="[1,2]",
        is_hidden=True,
    )
    return problem


@pytest.fixture
def medium_problem(db, dsa_tag):
    problem = Problem.objects.create(
        title="Coin Change",
        slug="coin-change",
        description="Fewest coins needed to make up amount.",
        difficulty=Problem.Difficulty.MEDIUM,
        points=200,
        is_active=True,
    )
    problem.tags.add(dsa_tag)
    return problem


@pytest.mark.django_db
class TestProblemListParity:
    """Test problem listing matching problemService.getProblems."""

    def test_list_problems_envelope(self, api_client, dsa_problem):
        """Verify response envelope has status='success' and data with results."""
        response = api_client.get("/api/v1/problems/")
        assert response.status_code == status.HTTP_200_OK

        # DRF compatibility
        assert "results" in response.data
        assert response.data["count"] >= 1

        # Frontend problemService.ts compatibility
        assert response.data.get("status") == "success"
        assert "data" in response.data
        assert "results" in response.data["data"]
        assert response.data["data"]["total"] >= 1
        assert response.data["data"]["page"] == 1

        # First item attributes
        first = response.data["data"]["results"][0]
        assert "acceptance_rate" in first
        assert "total_submissions" in first
        assert "user_status" in first
        assert first["user_status"] == "UNATTEMPTED"
        assert "tags" in first

    def test_filter_by_difficulty(self, api_client, dsa_problem, medium_problem):
        """Test difficulty query param (EASY vs MEDIUM vs ALL)."""
        resp_easy = api_client.get("/api/v1/problems/?difficulty=EASY")
        assert resp_easy.status_code == status.HTTP_200_OK
        results_easy = resp_easy.data["data"]["results"]
        assert all(p["difficulty"] == "EASY" for p in results_easy)

        resp_all = api_client.get("/api/v1/problems/?difficulty=ALL")
        assert resp_all.status_code == status.HTTP_200_OK
        assert resp_all.data["data"]["total"] >= 2

    def test_search_filter(self, api_client, dsa_problem, medium_problem):
        """Test search query param across titles."""
        resp = api_client.get("/api/v1/problems/?search=Coin")
        assert resp.status_code == status.HTTP_200_OK
        results = resp.data["data"]["results"]
        assert len(results) == 1
        assert results[0]["title"] == "Coin Change"

    def test_user_status_reflection(self, api_client, user, dsa_problem):
        """Verify user_status changes from UNATTEMPTED to ATTEMPTED / SOLVED."""
        api_client.force_authenticate(user=user)

        # Check initial state
        resp1 = api_client.get("/api/v1/problems/")
        first = [p for p in resp1.data["data"]["results"] if p["slug"] == dsa_problem.slug][0]
        assert first["user_status"] == "UNATTEMPTED"

        # Create submission
        Submission.objects.create(
            user=user,
            problem=dsa_problem,
            code="print('hi')",
            language="python",
            status="AC",
            runtime_ms=15,
            memory_kb=1024,
        )

        resp2 = api_client.get("/api/v1/problems/")
        first2 = [p for p in resp2.data["data"]["results"] if p["slug"] == dsa_problem.slug][0]
        assert first2["user_status"] == "SOLVED"

        # Status filter test
        resp_solved = api_client.get("/api/v1/problems/?status=SOLVED")
        assert any(p["slug"] == dsa_problem.slug for p in resp_solved.data["data"]["results"])


@pytest.mark.django_db
class TestProblemDetailParity:
    """Test retrieving problem detail by slug and polymorphic integer ID."""

    def test_get_by_slug(self, api_client, dsa_problem):
        response = api_client.get(f"/api/v1/problems/{dsa_problem.slug}/")
        assert response.status_code == status.HTTP_200_OK
        assert response.data["title"] == "Two Sum"
        assert response.data["status"] == "success"
        assert response.data["data"]["slug"] == "two-sum"
        assert "acceptance_rate" in response.data["data"]

    def test_get_by_id_polymorphic(self, api_client, dsa_problem):
        response = api_client.get(f"/api/v1/problems/{dsa_problem.id}/")
        assert response.status_code == status.HTTP_200_OK
        assert response.data["slug"] == "two-sum"
        assert response.data["title"] == "Two Sum"

    def test_get_explain(self, api_client, user, dsa_problem):
        api_client.force_authenticate(user=user)
        response = api_client.get(f"/api/v1/problems/{dsa_problem.slug}/explain/")
        assert response.status_code == status.HTTP_200_OK
        assert response.data["status"] == "success"
        assert "intuition" in response.data["data"]
        assert "approaches" in response.data["data"]


@pytest.mark.django_db
class TestCodeExecutionAndSubmission:
    """Test run and submit actions matching problemService.runCode and submitSolution."""

    def test_run_code(self, api_client, dsa_problem):
        payload = {
            "language": "python",
            "code": "print('hello')",
        }
        # Test with trailing slash and without trailing slash
        response = api_client.post(f"/api/v1/problems/{dsa_problem.slug}/run/", payload, format="json")
        assert response.status_code == status.HTTP_200_OK
        assert response.data["status"] == "success"
        data = response.data["data"]
        assert "passed_tests" in data
        assert "total_tests" in data
        assert "execution_time_ms" in data
        assert "status" in data

    def test_run_code_no_trailing_slash(self, api_client, dsa_problem):
        payload = {"language": "python", "code": "x = 10"}
        response = api_client.post(f"/api/v1/problems/{dsa_problem.slug}/run", payload, format="json")
        assert response.status_code == status.HTTP_200_OK
        assert response.data["status"] == "success"

    def test_submit_solution(self, api_client, user, dsa_problem):
        api_client.force_authenticate(user=user)
        payload = {
            "language": "python",
            "code": "def two_sum(nums, target): return [0, 1]",
        }
        response = api_client.post(f"/api/v1/problems/{dsa_problem.slug}/submit/", payload, format="json")
        assert response.status_code == status.HTTP_200_OK
        assert response.data["status"] == "success"
        sub_data = response.data["data"]
        assert "id" in sub_data
        assert "status" in sub_data
        assert "passed_tests" in sub_data
        assert "feedback" in sub_data

        # Verify persisted in database
        sub = Submission.objects.filter(problem=dsa_problem, user=user).first()
        assert sub is not None

    def test_get_submissions_history(self, api_client, user, dsa_problem):
        api_client.force_authenticate(user=user)
        # Create 2 submissions
        Submission.objects.create(
            user=user,
            problem=dsa_problem,
            code="print(1)",
            language="python",
            status="WA",
        )
        Submission.objects.create(
            user=user,
            problem=dsa_problem,
            code="print(2)",
            language="python",
            status="AC",
        )

        response = api_client.get(f"/api/v1/problems/{dsa_problem.slug}/submissions/")
        assert response.status_code == status.HTTP_200_OK
        assert response.data["status"] == "success"
        assert len(response.data["data"]) == 2
        assert "execution_time_ms" in response.data["data"][0]
        assert "feedback" in response.data["data"][0]


@pytest.mark.django_db
class TestDSAStatsParity:
    """Test GET /api/v1/gamification/dsa-stats/ matching problemService.getDsaStats."""

    def test_get_dsa_stats(self, api_client, user, dsa_problem, medium_problem):
        api_client.force_authenticate(user=user)
        # Create an accepted submission for dsa_problem (EASY)
        Submission.objects.create(
            user=user,
            problem=dsa_problem,
            code="print('ac')",
            language="python",
            status="AC",
        )

        response = api_client.get("/api/v1/gamification/dsa-stats/")
        assert response.status_code == status.HTTP_200_OK
        assert response.data["status"] == "success"

        stats = response.data["data"]
        assert "total_problems" in stats
        assert "solved_problems" in stats
        assert "attempted_problems" in stats
        assert "submissions_count" in stats
        assert "acceptance_rate" in stats
        assert "current_streak" in stats
        assert "longest_streak" in stats
        assert "rank" in stats
        assert "easy_solved" in stats
        assert "medium_solved" in stats
        assert "hard_solved" in stats
        assert "total_easy" in stats
        assert "total_medium" in stats
        assert "total_hard" in stats

        assert stats["solved_problems"] == 1
        assert stats["easy_solved"] == 1
        assert stats["total_easy"] >= 1

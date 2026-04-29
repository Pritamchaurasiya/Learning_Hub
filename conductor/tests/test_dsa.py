"""
DSA (Data Structures & Algorithms) API tests.
Comprehensive unit and integration tests for DSA module.
"""

import pytest
from rest_framework import status

from apps.dsa.models import Problem, TestCase, Submission, Tag
from apps.dsa.services import SandboxService



# ==============================================================================
# TESTS
# ==============================================================================





# ==============================================================================
# MODEL TESTS
# ==============================================================================


@pytest.mark.django_db
class TestTagModel:
    """Tests for Tag model."""

    def test_tag_creation(self, tag):
        """Test tag is created correctly."""
        assert tag.name == "Arrays"
        assert tag.slug == "arrays"

    def test_tag_str(self, tag):
        """Test string representation."""
        assert str(tag) == "Arrays"


@pytest.mark.django_db
class TestProblemModel:
    """Tests for Problem model."""

    def test_problem_creation(self, problem):
        """Test problem is created correctly."""
        assert problem.title == "Two Sum"
        assert problem.difficulty == Problem.Difficulty.EASY
        assert problem.points == 10

    def test_problem_str(self, problem):
        """Test string representation."""
        assert str(problem) == "Two Sum"

    def test_problem_tags(self, problem, tag):
        """Test problem has tags."""
        assert tag in problem.tags.all()

    def test_difficulty_choices(self):
        """Test difficulty enum values."""
        assert Problem.Difficulty.EASY == "EASY"
        assert Problem.Difficulty.MEDIUM == "MEDIUM"
        assert Problem.Difficulty.HARD == "HARD"


@pytest.mark.django_db
class TestTestCaseModel:
    """Tests for TestCase model."""

    def test_testcase_creation(self, test_case, problem):
        """Test testcase is created correctly."""
        assert test_case.problem == problem
        assert test_case.is_hidden is False

    def test_hidden_testcase(self, hidden_test_case):
        """Test hidden testcase flag."""
        assert hidden_test_case.is_hidden is True

    def test_testcase_str(self, test_case):
        """Test string representation."""
        assert "Two Sum" in str(test_case)


@pytest.mark.django_db
class TestSubmissionModel:
    """Tests for Submission model."""

    def test_submission_creation(self, submission, user, problem):
        """Test submission is created correctly."""
        assert submission.user == user
        assert submission.problem == problem
        assert submission.status == Submission.Status.PENDING

    def test_submission_str(self, submission):
        """Test string representation."""
        assert "testuser" in str(submission)
        assert "Two Sum" in str(submission)

    def test_status_choices(self):
        """Test status enum values."""
        assert Submission.Status.ACCEPTED == "AC"
        assert Submission.Status.WRONG_ANSWER == "WA"
        assert Submission.Status.TIME_LIMIT_EXCEEDED == "TLE"


# ==============================================================================
# API TESTS
# ==============================================================================


@pytest.mark.django_db
class TestProblemListAPI:
    """Tests for problem list endpoint."""

    def test_list_problems_unauthenticated(self, api_client, problem):
        """Anyone can view problems list."""
        response = api_client.get("/api/v1/dsa/problems/")
        
        assert response.status_code == status.HTTP_200_OK

    def test_list_problems_authenticated(self, authenticated_client, problem):
        """Authenticated users can view problems."""
        response = authenticated_client.get("/api/v1/dsa/problems/")
        
        assert response.status_code == status.HTTP_200_OK

    def test_filter_by_difficulty(self, api_client, problem, problem_medium):
        """Test filtering problems by difficulty."""
        response = api_client.get("/api/v1/dsa/problems/?difficulty=easy")
        
        assert response.status_code == status.HTTP_200_OK

    def test_filter_by_tag(self, api_client, problem, tag):
        """Test filtering problems by tag."""
        response = api_client.get(f"/api/v1/dsa/problems/?tag={tag.slug}")
        
        assert response.status_code == status.HTTP_200_OK


@pytest.mark.django_db
class TestProblemDetailAPI:
    """Tests for problem detail endpoint."""

    def test_get_problem_detail(self, api_client, problem, test_case):
        """Test retrieving problem by slug."""
        response = api_client.get(f"/api/v1/dsa/problems/{problem.slug}/")
        
        assert response.status_code == status.HTTP_200_OK
        assert response.data["title"] == "Two Sum"
        assert response.data["difficulty"] == "EASY"

    def test_problem_not_found(self, api_client):
        """Test 404 for non-existent problem slug."""
        response = api_client.get("/api/v1/dsa/problems/nonexistent/")
        
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_example_cases_included(self, api_client, problem, test_case):
        """Test example cases are included in detail view."""
        response = api_client.get(f"/api/v1/dsa/problems/{problem.slug}/")
        
        assert response.status_code == status.HTTP_200_OK
        # Either examples or example_cases should be present
        assert "examples" in response.data or "example_cases" in response.data


@pytest.mark.django_db
class TestSubmissionAPI:
    """Tests for submission endpoints."""

    def test_create_submission_authenticated(self, authenticated_client, problem):
        """Authenticated users can create submissions."""
        data = {
            "problem": problem.id,
            "code": "def solution():\\n    pass",
            "language": "python",
        }
        response = authenticated_client.post("/api/v1/dsa/submissions/", data)
        
        assert response.status_code == status.HTTP_201_CREATED

    def test_create_submission_unauthenticated(self, api_client, problem):
        """Anonymous users cannot create submissions."""
        data = {
            "problem": problem.id,
            "code": "def solution():\\n    pass",
            "language": "python",
        }
        response = api_client.post("/api/v1/dsa/submissions/", data)
        
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_list_own_submissions(self, authenticated_client, submission):
        """Users see only their own submissions."""
        response = authenticated_client.get("/api/v1/dsa/submissions/")
        
        assert response.status_code == status.HTTP_200_OK

    def test_submission_includes_status(self, authenticated_client, submission):
        """Test submission response includes status."""
        response = authenticated_client.get(f"/api/v1/dsa/submissions/{submission.id}/")
        
        assert response.status_code == status.HTTP_200_OK
        assert "status" in response.data


@pytest.mark.django_db
class TestTagAPI:
    """Tests for tag endpoints."""

    def test_list_tags(self, api_client, tag, tag_dp):
        """Test listing all tags."""
        response = api_client.get("/api/v1/dsa/tags/")
        
        assert response.status_code == status.HTTP_200_OK


# ==============================================================================
# SERVICE TESTS
# ==============================================================================


@pytest.mark.django_db
class TestSandboxService:
    """Tests for code execution sandbox."""

    def test_sanitize_clean_code(self):
        """Test clean code passes sanitization."""
        clean_code = "def solution(nums):\n    return sum(nums)"
        # Should not raise
        result = SandboxService.sanitize_code(clean_code)
        assert result == clean_code

    def test_sanitize_blocks_os_import(self):
        """Test os import is blocked."""
        malicious_code = "import os\nos.system('rm -rf /')"
        
        with pytest.raises(ValueError, match="Security Violation|Dangerous"):
            SandboxService.sanitize_code(malicious_code)

    def test_sanitize_blocks_subprocess(self):
        """Test subprocess import is blocked."""
        malicious_code = "import subprocess\nsubprocess.run(['ls'])"
        
        with pytest.raises(ValueError, match="Security Violation|Dangerous"):
            SandboxService.sanitize_code(malicious_code)

    def test_sanitize_blocks_eval(self):
        """Test eval is blocked."""
        malicious_code = "eval('__import__(\"os\").system(\"pwd\")')"
        
        with pytest.raises(ValueError, match="Security Violation|Dangerous|eval"):
            SandboxService.sanitize_code(malicious_code)

    def test_sanitize_blocks_exec(self):
        """Test exec is blocked."""
        malicious_code = "exec('print(1)')"
        
        with pytest.raises(ValueError, match="Security Violation|Dangerous|exec"):
            SandboxService.sanitize_code(malicious_code)

    def test_sanitize_blocks_open(self):
        """Test open is blocked."""
        malicious_code = "with open('/etc/passwd') as f:\n    print(f.read())"
        
        with pytest.raises(ValueError, match="Security Violation|Dangerous|open"):
            SandboxService.sanitize_code(malicious_code)


# ==============================================================================
# EDGE CASES & SECURITY
# ==============================================================================


@pytest.mark.django_db
class TestSecurityEdgeCases:
    """Security-focused edge case tests."""

    def test_inactive_problems_not_visible(self, api_client, problem):
        """Test inactive problems are not returned."""
        problem.is_active = False
        problem.save()
        
        response = api_client.get("/api/v1/dsa/problems/")
        
        assert response.status_code == status.HTTP_200_OK
        # Problem should not be in results
        for p in response.data.get("results", response.data):
            if isinstance(p, dict):
                assert p.get("slug") != "two-sum"

    def test_cannot_access_others_submissions(self, authenticated_client, submission, create_user):
        """Users cannot access other users' submissions."""
        # Create another user's submission
        other_user = create_user(email="other@example.com", username="otheruser")
        other_submission = Submission.objects.create(
            user=other_user,
            problem=submission.problem,
            code="print(1)",
            language="python",
        )
        
        # Try to access other user's submission
        response = authenticated_client.get(f"/api/v1/dsa/submissions/{other_submission.id}/")
        
        # Should be 404 (filtered out) or 403 (forbidden)
        assert response.status_code in [status.HTTP_404_NOT_FOUND, status.HTTP_403_FORBIDDEN]

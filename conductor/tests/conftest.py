"""
Pytest fixtures for tests/ directory.
Provides DSA and domain-specific fixtures.
"""

import pytest


# ==============================================================================
# DSA FIXTURES
# ==============================================================================


@pytest.fixture
def tag(db):
    """Create a DSA tag."""
    from apps.dsa.models import Tag
    return Tag.objects.create(name="Arrays", slug="arrays")


@pytest.fixture
def tag_dp(db):
    """Create a DP tag."""
    from apps.dsa.models import Tag
    return Tag.objects.create(name="Dynamic Programming", slug="dynamic-programming")


@pytest.fixture
def problem(db, tag):
    """Create a DSA problem."""
    from apps.dsa.models import Problem
    p = Problem.objects.create(
        title="Two Sum",
        slug="two-sum",
        description="Given an array of integers, return indices of two numbers.",
        difficulty=Problem.Difficulty.EASY,
        points=10,
        constraints="1 <= nums.length <= 10^4",
        input_format="Array of integers",
        output_format="Array of two indices",
        examples=[{"input": "[2,7,11,15]", "output": "[0,1]"}],
    )
    p.tags.add(tag)
    return p


@pytest.fixture
def problem_medium(db, tag_dp):
    """Create a medium difficulty problem."""
    from apps.dsa.models import Problem
    p = Problem.objects.create(
        title="Longest Palindrome",
        slug="longest-palindrome",
        description="Find the longest palindromic substring.",
        difficulty=Problem.Difficulty.MEDIUM,
        points=20,
        constraints="1 <= s.length <= 1000",
        input_format="String",
        output_format="String",
        examples=[{"input": "babad", "output": "bab"}],
    )
    p.tags.add(tag_dp)
    return p


@pytest.fixture
def test_case(db, problem):
    """Create a visible test case."""
    from apps.dsa.models import TestCase
    return TestCase.objects.create(
        problem=problem,
        input_data="[2,7,11,15], target=9",
        expected_output="[0,1]",
        is_hidden=False,
        explanation="nums[0] + nums[1] = 2 + 7 = 9",
    )


@pytest.fixture
def hidden_test_case(db, problem):
    """Create a hidden test case."""
    from apps.dsa.models import TestCase
    return TestCase.objects.create(
        problem=problem,
        input_data="[3,2,4], target=6",
        expected_output="[1,2]",
        is_hidden=True,
    )


@pytest.fixture
def submission(db, user, problem):
    """Create a submission."""
    from apps.dsa.models import Submission
    return Submission.objects.create(
        user=user,
        problem=problem,
        code="def twoSum(nums, target):\n    pass",
        language="python",
    )

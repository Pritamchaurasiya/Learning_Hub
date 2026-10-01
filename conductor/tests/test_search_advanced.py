"""
Tests for Advanced Search Endpoint (/api/v1/search/advanced/).
Verifies that searching with has_certificate, price_min, price_max, and sorting works without FieldError.
"""

import pytest
from decimal import Decimal
from apps.courses.models import Course, Category, Certificate, Enrollment


@pytest.fixture
def search_test_data(db, create_user):
    instructor = create_user(email="search_instructor@test.com", username="search_inst")
    student = create_user(email="search_student@test.com", username="search_stud")
    category = Category.objects.create(name="AI & ML", slug="ai-ml-search")
    
    course_cert = Course.objects.create(
        title="Deep Learning with PyTorch",
        slug="deep-learning-pytorch",
        description="Master deep neural networks",
        instructor=instructor,
        category=category,
        price=Decimal("199.00"),
        difficulty=Course.Difficulty.INTERMEDIATE,
        avg_rating=Decimal("4.8"),
        is_published=True,
    )
    
    course_no_cert = Course.objects.create(
        title="Introduction to Python",
        slug="intro-python",
        description="Learn python from scratch",
        instructor=instructor,
        category=category,
        price=Decimal("0.00"),
        is_free=True,
        difficulty=Course.Difficulty.BEGINNER,
        avg_rating=Decimal("4.5"),
        is_published=True,
    )
    
    from django.utils import timezone
    enrollment = Enrollment.objects.create(
        user=student,
        course=course_cert,
        completed_at=timezone.now(),
        progress_percentage=100,
    )
    
    Certificate.objects.create(
        user=student,
        course=course_cert,
        enrollment=enrollment,
    )
    
    return {
        "course_cert": course_cert,
        "course_no_cert": course_no_cert,
        "category": category,
    }


@pytest.mark.django_db
def test_advanced_search_has_certificate_true(api_client, search_test_data):
    """Test advanced search with has_certificate=true returns only courses with certificates."""
    url = "/api/v1/search/advanced/?has_certificate=true"
    response = api_client.get(url)
    assert response.status_code == 200
    data = response.json()
    slugs = [c["slug"] for c in data["results"]]
    assert search_test_data["course_cert"].slug in slugs
    assert search_test_data["course_no_cert"].slug not in slugs


@pytest.mark.django_db
def test_advanced_search_has_certificate_false(api_client, search_test_data):
    """Test advanced search with has_certificate=false returns courses without certificates."""
    url = "/api/v1/search/advanced/?has_certificate=false"
    response = api_client.get(url)
    assert response.status_code == 200
    data = response.json()
    slugs = [c["slug"] for c in data["results"]]
    assert search_test_data["course_no_cert"].slug in slugs
    assert search_test_data["course_cert"].slug not in slugs


@pytest.mark.django_db
def test_advanced_search_price_and_level_filters(api_client, search_test_data):
    """Test price range and difficulty filtering."""
    url = "/api/v1/search/advanced/?price_min=50&price_max=300&level=intermediate"
    response = api_client.get(url)
    assert response.status_code == 200
    data = response.json()
    slugs = [c["slug"] for c in data["results"]]
    assert search_test_data["course_cert"].slug in slugs
    assert search_test_data["course_no_cert"].slug not in slugs

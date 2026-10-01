import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from apps.ebooks.models import Ebook, EbookChapter
from apps.ebooks.services import EbookService
from apps.ebooks.selectors import list_published_ebooks, get_ebook_by_id_or_slug

User = get_user_model()


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def test_user(db):
    return User.objects.create_user(
        username="reader1",
        email="reader1@example.com",
        password="TestPassword123!",
    )


@pytest.fixture
def sample_ebook(db):
    ebook = Ebook.objects.create(
        title="DSA Mastery Handbook",
        slug="dsa-mastery-handbook",
        author="Prof. Turing",
        description="Comprehensive algorithms handbook",
        category="Computer Science",
        difficulty="Intermediate",
        total_chapters=2,
    )
    EbookChapter.objects.create(
        ebook=ebook,
        title="Chapter 1: Asymptotic Bounds",
        order=1,
        estimated_read_time_mins=20,
        content_markdown="# Big O Notation",
    )
    EbookChapter.objects.create(
        ebook=ebook,
        title="Chapter 2: Master Theorem",
        order=2,
        estimated_read_time_mins=25,
        content_markdown="# Recurrences",
    )
    return ebook


@pytest.mark.django_db
def test_list_published_ebooks(sample_ebook):
    ebooks = list_published_ebooks()
    assert ebooks.count() == 1
    assert ebooks.first().slug == "dsa-mastery-handbook"


@pytest.mark.django_db
def test_get_ebook_by_slug(sample_ebook):
    ebook = get_ebook_by_id_or_slug("dsa-mastery-handbook")
    assert ebook is not None
    assert ebook.title == "DSA Mastery Handbook"
    assert ebook.chapters.count() == 2


@pytest.mark.django_db
def test_save_reading_progress_and_completion(test_user, sample_ebook):
    chapter1 = sample_ebook.chapters.get(order=1)
    # Read 50%
    prog = EbookService.save_reading_progress(
        user=test_user,
        ebook=sample_ebook,
        chapter=chapter1,
        progress_percentage=50.0,
        time_spent_seconds=600,
    )
    assert prog.progress_percentage == 50.0
    assert not prog.is_completed

    # Complete 100%
    prog_completed = EbookService.save_reading_progress(
        user=test_user,
        ebook=sample_ebook,
        chapter=chapter1,
        progress_percentage=100.0,
        time_spent_seconds=600,
    )
    assert prog_completed.is_completed


@pytest.mark.django_db
def test_create_and_delete_highlight(test_user, sample_ebook):
    chapter1 = sample_ebook.chapters.get(order=1)
    highlight = EbookService.create_highlight(
        user=test_user,
        ebook=sample_ebook,
        chapter=chapter1,
        text="Big-O is an upper bound",
        color="#ffeb3b",
        note="Important exam concept",
    )
    assert highlight.id.startswith("hl-")
    assert highlight.text == "Big-O is an upper bound"

    # Delete
    deleted = EbookService.delete_highlight(test_user, highlight.id)
    assert deleted is True


@pytest.mark.django_db
def test_ebook_api_endpoints(api_client, test_user, sample_ebook):
    # Public catalog endpoint
    res = api_client.get("/api/v1/ebooks/")
    assert res.status_code == 200
    assert len(res.data.get("data", [])) >= 1

    # Detail endpoint
    res_detail = api_client.get(f"/api/v1/ebooks/{sample_ebook.slug}/")
    assert res_detail.status_code == 200
    assert res_detail.data.get("data", {}).get("slug") == "dsa-mastery-handbook"

    # Authenticated progress
    api_client.force_authenticate(user=test_user)
    res_prog = api_client.post(
        f"/api/v1/ebooks/{sample_ebook.id}/progress/",
        data={"progress_percentage": 75.0, "time_spent_seconds": 300},
        format="json",
    )
    assert res_prog.status_code == 200
    assert res_prog.data.get("data", {}).get("progress_percentage") == 75.0

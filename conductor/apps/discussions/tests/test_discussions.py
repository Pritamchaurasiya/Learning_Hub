"""
Tests for Discussion Forum models and API.
"""
import pytest
from django.utils import timezone
from apps.discussions.models import DiscussionThread, DiscussionReply, ThreadTag


@pytest.fixture
def discussion_thread(create_user, create_course):
    """Create a discussion thread for testing."""
    user = create_user(username="thread_author", email="author@test.com")
    course = create_course()
    return DiscussionThread.objects.create(
        course=course,
        author=user,
        title="How to implement binary search?",
        content="I'm having trouble understanding the base case..."
    )


@pytest.fixture
def discussion_reply(discussion_thread, create_user):
    """Create a reply for testing."""
    replier = create_user(email="replier@test.com", username="replier")
    return DiscussionReply.objects.create(
        thread=discussion_thread,
        author=replier,
        content="The base case should check if left > right..."
    )


class TestDiscussionThreadModel:
    """Tests for DiscussionThread model."""
    
    @pytest.mark.django_db
    def test_thread_creation(self, discussion_thread):
        """Test thread is created with correct defaults."""
        assert discussion_thread.is_pinned is False
        assert discussion_thread.is_resolved is False
        assert discussion_thread.like_count == 0
        assert discussion_thread.reply_count == 0
    
    @pytest.mark.django_db
    def test_thread_str(self, discussion_thread):
        """Test thread string representation."""
        assert discussion_thread.title in str(discussion_thread)
    
    @pytest.mark.django_db
    def test_reply_count_property(self, discussion_thread, discussion_reply):
        """Test reply_count property updates correctly."""
        assert discussion_thread.reply_count == 1


class TestDiscussionReplyModel:
    """Tests for DiscussionReply model."""
    
    @pytest.mark.django_db
    def test_reply_creation(self, discussion_reply):
        """Test reply is created with correct defaults."""
        assert discussion_reply.is_accepted_answer is False
        assert discussion_reply.like_count == 0
    
    @pytest.mark.django_db
    def test_is_instructor_reply_false(self, discussion_reply):
        """Test non-instructor reply is detected."""
        assert discussion_reply.is_instructor_reply is False


class TestThreadTagModel:
    """Tests for ThreadTag model."""
    
    @pytest.mark.django_db
    def test_tag_creation(self):
        """Test tag is created correctly."""
        tag = ThreadTag.objects.create(name="algorithms")
        assert str(tag) == "algorithms"


class TestDiscussionAPI:
    """Tests for Discussion API endpoints."""
    
    @pytest.mark.django_db
    def test_list_threads_unauthenticated(self, api_client, discussion_thread):
        """Test unauthenticated users can list threads."""
        response = api_client.get("/api/v1/discussions/threads/")
        assert response.status_code == 200
    
    @pytest.mark.django_db
    def test_create_thread_authenticated(self, authenticated_client, create_course):
        """Test authenticated users can create threads."""
        course = create_course()
        response = authenticated_client.post(
            "/api/v1/discussions/threads/",
            {
                "course": course.id,
                "title": "New Question",
                "content": "Help with this...",
            },
            format="json"
        )
        assert response.status_code == 201
        assert response.data["title"] == "New Question"
    
    @pytest.mark.django_db
    def test_like_thread(self, authenticated_client, discussion_thread):
        """Test liking a thread increments like_count."""
        response = authenticated_client.post(
            f"/api/v1/discussions/threads/{discussion_thread.id}/vote/",
            {"value": 1},
            format="json"
        )
        assert response.status_code == 200
        assert response.data["like_count"] == 1
    
    @pytest.mark.django_db
    def test_resolve_thread_author_only(self, authenticated_client, discussion_thread):
        """Test only author can resolve thread."""
        # Different user tries to resolve
        response = authenticated_client.post(
            f"/api/v1/discussions/threads/{discussion_thread.id}/resolve/"
        )
        assert response.status_code == 403
    
    @pytest.mark.django_db
    def test_post_reply(self, authenticated_client, discussion_thread):
        """Test posting a reply to a thread."""
        response = authenticated_client.post(
            f"/api/v1/discussions/threads/{discussion_thread.id}/replies/",
            {"content": "This is my answer"},
            format="json"
        )
        assert response.status_code == 201

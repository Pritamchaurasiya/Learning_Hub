"""
Comprehensive Unit and Integration Tests for Student Updates Hub.
"""
import pytest
from django.utils import timezone
from datetime import timedelta
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError

from apps.updates.models import (
    UpdateSource,
    StudentUpdate,
    UpdateVersion,
    UpdateAttachment,
    UpdateCrossLink,
    UpdateSubscription,
    UpdateBookmark,
    UpdateReminder,
)
from apps.updates.validators import validate_safe_external_url
from apps.updates.parsers.mgkvp_parser import MGKVPNoticeParser
from apps.updates.normalizers.canonical import parse_flexible_date, normalize_notice_payload
from apps.updates.services import StudentUpdateService
from apps.updates.selectors import (
    list_student_updates,
    get_personalized_feed,
    get_upcoming_deadlines,
    get_update_detail,
    get_updates_statistics,
)

User = get_user_model()


@pytest.mark.django_db
class TestStudentUpdatesHub:

    @pytest.fixture(autouse=True)
    def setup_fixtures(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            email="student@learninghub.com",
            password="StrongPassword123!",
            first_name="Rahul",
            last_name="Sharma"
        )
        self.client.force_authenticate(user=self.user)

    def test_safe_url_validator(self):
        # Valid external URLs
        assert validate_safe_external_url("https://mgkvp.ac.in/Home/NoticeList") == "https://mgkvp.ac.in/Home/NoticeList"
        assert validate_safe_external_url("https://aktu.ac.in") == "https://aktu.ac.in"

        # Block localhost / 127.0.0.1
        with pytest.raises(ValidationError):
            validate_safe_external_url("http://127.0.0.1:8000/secret")

        with pytest.raises(ValidationError):
            validate_safe_external_url("http://localhost/admin")

        with pytest.raises(ValidationError):
            validate_safe_external_url("ftp://mgkvp.ac.in")

    def test_flexible_date_parser(self):
        dt1 = parse_flexible_date("28-09-2026")
        assert dt1 is not None
        assert dt1.day == 28 and dt1.month == 9 and dt1.year == 2026

        dt2 = parse_flexible_date("15/10/2026")
        assert dt2 is not None
        assert dt2.day == 15 and dt2.month == 10

        assert parse_flexible_date("") is None
        assert parse_flexible_date(None) is None

    def test_mgkvp_html_parser(self):
        html_content = """
        <table class="table table-striped">
            <tbody>
                <tr>
                    <td>25-09-2026</td>
                    <td><a href="/Uploads/BCA_Exam_2026.pdf">BCA 4th Semester Examination Form extended up to 30-09-2026</a></td>
                </tr>
                <tr>
                    <td>20-09-2026</td>
                    <td><a href="/Uploads/TimeTable.pdf">Annual Examination Time Table 2026</a></td>
                </tr>
            </tbody>
        </table>
        """
        parser = MGKVPNoticeParser()
        results = parser.parse(html_content, base_url="https://mgkvp.ac.in")
        assert len(results) == 2

        first = results[0]
        assert "BCA" in first['title']
        assert first['category'] == "EXAMINATION"
        assert first['sub_category'] == "EXAM_FORM"
        assert first['importance'] == "IMPORTANT"
        assert first['course'] == "BCA"
        assert len(first['attachments']) == 1

    def test_service_seed_sources(self):
        sources = StudentUpdateService.seed_default_sources()
        assert len(sources) >= 3
        mgkvp = UpdateSource.objects.filter(source_id="src-mgkvp-official").first()
        assert mgkvp is not None
        assert mgkvp.authority_level == 1
        assert mgkvp.endpoints.count() >= 3

    def test_service_ingest_and_change_detection(self):
        StudentUpdateService.seed_default_sources()
        now = timezone.now()

        payload = {
            "title": "MGKVP BCA Exam Form Deadline Extended",
            "url": "https://mgkvp.ac.in/notice-101.pdf",
            "date_str": "28-09-2026",
            "deadline_str": "05-10-2026",
            "summary": "Original summary text for BCA exam forms.",
            "category": "EXAMINATION",
            "sub_category": "EXAM_FORM",
            "importance": "IMPORTANT",
            "course": "BCA",
            "attachments": [{"title": "Notice.pdf", "url": "https://mgkvp.ac.in/notice-101.pdf"}]
        }

        # 1. Initial Ingestion
        update = StudentUpdateService.ingest_notice_from_source("src-mgkvp-official", payload)
        assert update is not None
        assert update.version == 1
        assert update.versions.count() == 0
        assert update.attachments.count() == 1
        assert update.cross_links.count() >= 1  # Auto ecosystem link for BCA

        # 2. Re-ingest with identical content -> idempotent, no version bump
        update2 = StudentUpdateService.ingest_notice_from_source("src-mgkvp-official", payload)
        assert update2.id == update.id
        assert update2.version == 1

        # 3. Ingest with modified content -> triggers version increment and diff log
        modified_payload = payload.copy()
        modified_payload["summary"] = "Updated notice: Late fee waived for BCA students."
        update3 = StudentUpdateService.ingest_notice_from_source("src-mgkvp-official", modified_payload)
        assert update3.id == update.id
        assert update3.version == 2
        assert update3.versions.count() == 1

    def test_bookmarks_and_reminders(self):
        StudentUpdateService.seed_default_sources()
        now = timezone.now()

        update = StudentUpdate.objects.create(
            title="AKTU Final Timetable",
            summary="Schedule published",
            source_url="https://aktu.ac.in/sched",
            category="EXAMINATION",
            institution="AKTU Lucknow",
            published_at=now,
            deadline=now + timedelta(days=5),
            content_hash="test-hash-123"
        )

        # Bookmark
        bmk = StudentUpdateService.create_bookmark(self.user, update.id, notes="Important for my sem", tag="Exam")
        assert bmk.notes == "Important for my sem"
        assert UpdateBookmark.objects.filter(user=self.user, update=update).exists()

        # Delete Bookmark
        res = StudentUpdateService.delete_bookmark(self.user, update.id)
        assert res is True
        assert not UpdateBookmark.objects.filter(user=self.user, update=update).exists()

        # Reminder
        rem = StudentUpdateService.create_deadline_reminder(self.user, update.id, "1_DAY_BEFORE")
        assert rem.reminder_type == "1_DAY_BEFORE"
        assert rem.is_dispatched is False

        # Cancel Reminder
        cancelled = StudentUpdateService.cancel_reminder(self.user, rem.id)
        assert cancelled is True

    def test_subscriptions_and_personalized_feed(self):
        StudentUpdateService.seed_default_sources()
        now = timezone.now()

        upd_mgkvp = StudentUpdate.objects.create(
            title="MGKVP BCA Exam",
            summary="BCA Notice",
            source_url="https://mgkvp.ac.in/bca",
            institution="Mahatma Gandhi Kashi Vidyapith (MGKVP)",
            course="BCA",
            published_at=now,
            content_hash="hash-1"
        )
        upd_aktu = StudentUpdate.objects.create(
            title="AKTU B.Tech Circular",
            summary="AKTU Notice",
            source_url="https://aktu.ac.in/circ",
            institution="AKTU Lucknow",
            course="B.Tech",
            published_at=now,
            content_hash="hash-2"
        )

        # User subscribes to MGKVP
        StudentUpdateService.follow_target(self.user, "INSTITUTION", "MGKVP")

        feed = get_personalized_feed(self.user)
        feed_ids = [u.id for u in feed]
        assert upd_mgkvp.id in feed_ids

    def test_api_endpoints(self):
        StudentUpdateService.seed_default_sources()
        now = timezone.now()

        update = StudentUpdate.objects.create(
            title="API Test Notice",
            summary="Testing API endpoints",
            source_url="https://mgkvp.ac.in/api-test",
            institution="MGKVP",
            category="EXAMINATION",
            published_at=now,
            deadline=now + timedelta(days=2),
            content_hash="api-hash"
        )

        # 1. Feed
        res = self.client.get("/api/v1/updates/feed/")
        assert res.status_code == 200
        assert res.data["status"] == "success"
        assert len(res.data["data"]) >= 1

        # 2. Detail
        res = self.client.get(f"/api/v1/updates/{update.id}/")
        assert res.status_code == 200
        assert res.data["data"]["title"] == "API Test Notice"

        # 3. Deadlines
        res = self.client.get("/api/v1/updates/deadlines/")
        assert res.status_code == 200
        assert res.data["status"] == "success"

        # 4. Bookmark via API
        res = self.client.post("/api/v1/updates/bookmarks/", {
            "update_id": update.id,
            "notes": "Testing bookmark",
            "tag": "Urgent"
        }, format="json")
        assert res.status_code == 201
        assert res.data["status"] == "success"

        # 5. List Bookmarks
        res = self.client.get("/api/v1/updates/bookmarks/")
        assert res.status_code == 200
        assert len(res.data["data"]) == 1

        # 6. Delete Bookmark
        res = self.client.delete(f"/api/v1/updates/bookmarks/{update.id}/")
        assert res.status_code == 200
        assert res.data["status"] == "success"

        # 7. Stats
        res = self.client.get("/api/v1/updates/stats/")
        assert res.status_code == 200
        assert "total_updates" in res.data["data"]

        # 8. Sources
        res = self.client.get("/api/v1/updates/sources/")
        assert res.status_code == 200
        assert len(res.data["data"]) >= 3

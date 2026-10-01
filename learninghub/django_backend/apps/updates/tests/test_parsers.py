"""
Unit Tests for University & National Testing Parsers, and Polling Tasks.
"""
import pytest
from unittest.mock import patch, MagicMock
from django.utils import timezone
from datetime import timedelta
from django.contrib.auth import get_user_model

from apps.updates.parsers.lucknow_univ_parser import LucknowUnivNoticeParser
from apps.updates.parsers.bhu_parser import BHUNoticeParser
from apps.updates.parsers.ddu_parser import DDUNoticeParser
from apps.updates.parsers.nta_parser import NTANoticeParser
from apps.updates.parsers.aktu_parser import AKTUNoticeParser
from apps.updates.parsers.alld_univ_parser import AllahabadUnivNoticeParser
from apps.updates.parsers.ssc_parser import SSCNoticeParser
from apps.updates.parsers.upsc_parser import UPSCNoticeParser
from apps.updates.crawler import SourceCrawler
from apps.updates.models import (
    UpdateSource,
    UpdateSourceEndpoint,
    StudentUpdate,
    UpdateVersion,
    UpdateSubscription,
    UpdateReminder,
    UpdateFetchLog,
)
from apps.updates.tasks import poll_all_active_sources, dispatch_deadline_reminders
from rest_framework.test import APIClient

User = get_user_model()


class TestDedicatedParsers:

    def test_lucknow_univ_parser(self):
        html_fixture = """
        <table class="table">
            <tr>
                <td>28-09-2026</td>
                <td><a href="/Upload/BTech_Odd_Sem_Schedule_2026.pdf">Schedule for B.Tech 3rd Semester Even/Odd Exams 2026</a></td>
            </tr>
            <tr>
                <td>26-09-2026</td>
                <td><a href="/Upload/BCA_ExamForm.pdf">BCA Annual Exam Form Submission last date 05-10-2026</a></td>
            </tr>
        </table>
        """
        parser = LucknowUnivNoticeParser()
        notices = parser.parse(html_fixture, base_url="https://lkouniv.ac.in")

        assert len(notices) == 2

        # Notice 1: B.Tech 3rd Sem
        n1 = notices[0]
        assert "B.Tech" in n1["title"]
        assert n1["url"] == "https://lkouniv.ac.in/Upload/BTech_Odd_Sem_Schedule_2026.pdf"
        assert n1["course"] == "B.Tech"
        assert n1["semester"] == "3rd Semester"
        assert n1["category"] == "EXAMINATION"
        assert n1["sub_category"] == "TIMETABLE"
        assert len(n1["attachments"]) == 1
        assert n1["attachments"][0]["url"] == "https://lkouniv.ac.in/Upload/BTech_Odd_Sem_Schedule_2026.pdf"

        # Notice 2: BCA Exam form with deadline
        n2 = notices[1]
        assert "BCA" in n2["title"]
        assert n2["course"] == "BCA"
        assert n2["sub_category"] == "EXAM_FORM"
        assert n2["deadline_str"] == "05-10-2026"

    def test_bhu_parser(self):
        html_fixture = """
        <ul class="bullet_list">
            <li>
                <span class="date">27-09-2026</span>
                <a href="/admissions/cuet_counselling_round1.pdf">CUET UG 2026 Counseling Round 1 Allotment & Document Verification</a>
            </li>
            <li>
                <span class="date">24-09-2026</span>
                <a href="/exams/mba_admit_card.pdf">Admit Card for MBA 1st Semester Mid-Term Examination 2026</a>
            </li>
        </ul>
        """
        parser = BHUNoticeParser()
        notices = parser.parse(html_fixture, base_url="https://bhu.ac.in")

        assert len(notices) == 2

        n1 = notices[0]
        assert "CUET" in n1["title"]
        assert n1["category"] == "ADMISSION"
        assert n1["sub_category"] == "COUNSELLING"

        n2 = notices[1]
        assert "MBA" in n2["title"]
        assert n2["course"] == "MBA"
        assert n2["category"] == "EXAMINATION"
        assert n2["sub_category"] == "ADMIT_CARD"

    def test_ddu_parser(self):
        html_fixture = """
        <table id="tblNotices">
            <tr>
                <td>26-09-2026</td>
                <td><a href="Notices/BackPaper_Form_2026.pdf">UG Back Paper / Improvement Examination Form 2026 extended up to 04-10-2026</a></td>
            </tr>
            <tr>
                <td>22-09-2026</td>
                <td><a href="Notices/ExamCenterList2026.pdf">List of Nodal Examination Centers for B.Sc / B.Com Exams</a></td>
            </tr>
        </table>
        """
        parser = DDUNoticeParser()
        notices = parser.parse(html_fixture, base_url="https://ddugu.ac.in")

        assert len(notices) == 2

        n1 = notices[0]
        assert "Back Paper" in n1["title"]
        assert n1["category"] == "EXAMINATION"
        assert n1["sub_category"] == "BACK_PAPER"
        assert n1["deadline_str"] == "04-10-2026"

        n2 = notices[1]
        assert "Examination Centers" in n2["title"]
        assert n2["sub_category"] == "EXAM_CENTER"

    def test_nta_parser(self):
        html_fixture = """
        <div class="news_section">
            <div class="notice-item">
                <span class="date">28-09-2026</span>
                <a href="/public-notices/CUET_UG_City_Slip.pdf">Advance Intimation of Examination City for Candidates of CUET UG 2026</a>
            </div>
            <div class="notice-item">
                <span class="date">25-09-2026</span>
                <a href="/public-notices/JEE_Main_Admit_Card.pdf">Release of Admit Cards for JEE Main Session 1 Candidates</a>
            </div>
        </div>
        """
        parser = NTANoticeParser()
        notices = parser.parse(html_fixture, base_url="https://nta.ac.in")

        assert len(notices) == 2

        n1 = notices[0]
        assert "CUET" in n1["title"]
        assert n1["target_exam"] == "CUET"
        assert n1["sub_category"] == "EXAM_CENTER"
        assert n1["importance"] == "IMPORTANT"

        n2 = notices[1]
        assert "JEE Main" in n2["title"]
        assert n2["target_exam"] == "JEE Main"
        assert n2["sub_category"] == "ADMIT_CARD"
        assert n2["importance"] == "URGENT"

    def test_aktu_parser(self):
        html_fixture = """
        <table class="circular-table">
            <tr>
                <td>29-09-2026</td>
                <td><a href="/circulars/BTech_OddSem_Exam_Form_2026.pdf">Submission of Examination Form for B.Tech Odd Semester 2026-27 last date 15-10-2026</a></td>
            </tr>
            <tr>
                <td>28-09-2026</td>
                <td><a href="/circulars/MCA_COP_Schedule.pdf">Carry Over Paper (COP) Examination Datesheet for MCA 3rd Semester</a></td>
            </tr>
        </table>
        """
        parser = AKTUNoticeParser()
        notices = parser.parse(html_fixture, base_url="https://aktu.ac.in")

        assert len(notices) == 2

        # Notice 1: B.Tech Exam Form
        n1 = notices[0]
        assert "B.Tech" in n1["title"]
        assert n1["course"] == "B.TECH"
        assert n1["category"] == "EXAMINATION"
        assert n1["sub_category"] == "EXAM_FORM"
        assert n1["deadline_str"] == "15-10-2026"
        assert len(n1["attachments"]) == 1
        assert n1["attachments"][0]["url"] == "https://aktu.ac.in/circulars/BTech_OddSem_Exam_Form_2026.pdf"

        # Notice 2: MCA Carry Over Exam
        n2 = notices[1]
        assert "MCA" in n2["title"]
        assert n2["course"] == "MCA"
        assert n2["sub_category"] == "CARRY_OVER_EXAM"
        assert n2["importance"] == "IMPORTANT"

    def test_allahabad_univ_parser(self):
        html_fixture = """
        <ul class="notice-list">
            <li>
                <span class="date">28-09-2026</span>
                <a href="/news/CRET_2026_AdmitCard.pdf">CRET 2026 Combined Research Entrance Test Admit Cards Released</a>
            </li>
            <li>
                <span class="date">27-09-2026</span>
                <a href="/admissions/BA_Cutoff_Round1.pdf">BA 1st Year Admission Cutoff Marks and Counselling Schedule extended up to 10-10-2026</a>
            </li>
        </ul>
        """
        parser = AllahabadUnivNoticeParser()
        notices = parser.parse(html_fixture, base_url="https://allduniv.ac.in")

        assert len(notices) == 2

        # Notice 1: CRET Research Entrance
        n1 = notices[0]
        assert "CRET" in n1["title"]
        assert n1["course"] == "CRET"
        assert n1["category"] == "EXAMINATION"
        assert n1["sub_category"] == "ADMIT_CARD"

        # Notice 2: BA Cutoff & Counselling
        n2 = notices[1]
        assert "BA" in n2["title"]
        assert n2["course"] == "BA"
        assert n2["category"] == "ADMISSION"
        assert n2["sub_category"] == "CUTOFF_LIST"
        assert n2["deadline_str"] == "10-10-2026"

    def test_ssc_notice_parser(self):
        html_fixture = """
        <div class="card-body">
            <div class="notice-row">
                <span class="date">01-10-2026</span>
                <a href="/portal/cgl_2026_notification.pdf">Notice for Combined Graduate Level Examination (CGL) 2026 closing date 28-10-2026</a>
            </div>
            <div class="notice-row">
                <span class="date">29-09-2026</span>
                <a href="/portal/chsl_tier2_result.pdf">Combined Higher Secondary (10+2) Level Examination (CHSL) Tier-II Results Declared</a>
            </div>
        </div>
        """
        parser = SSCNoticeParser()
        notices = parser.parse(html_fixture, base_url="https://ssc.gov.in")
        assert len(notices) == 2

        n1 = notices[0]
        assert "CGL" in n1["title"]
        assert n1["exam"] == "SSC CGL"
        assert n1["deadline_str"] == "28-10-2026"
        assert len(n1["attachments"]) == 1
        assert n1["attachments"][0]["file_url"] == "https://ssc.gov.in/portal/cgl_2026_notification.pdf"

        n2 = notices[1]
        assert "CHSL" in n2["title"]
        assert n2["exam"] == "SSC CHSL"
        assert n2["sub_category"] == "RESULT"

    def test_upsc_notice_parser(self):
        html_fixture = """
        <table class="views-table">
            <tr>
                <td>01-10-2026</td>
                <td><a href="/exams/civil_services_prelims_2026.pdf">Civil Services (Preliminary) Examination 2026 last date 25-10-2026</a></td>
            </tr>
            <tr>
                <td>28-09-2026</td>
                <td><a href="/exams/nda_ii_2026_admit_card.pdf">National Defence Academy (NDA) & NA Examination (II) 2026 Admit Card</a></td>
            </tr>
        </table>
        """
        parser = UPSCNoticeParser()
        notices = parser.parse(html_fixture, base_url="https://upsc.gov.in")
        assert len(notices) == 2

        n1 = notices[0]
        assert "Civil Services" in n1["title"]
        assert n1["exam"] == "Civil Services (CSE)"
        assert n1["deadline_str"] == "25-10-2026"
        assert n1["institution"] == "Union Public Service Commission (UPSC)"

        n2 = notices[1]
        assert "NDA" in n2["title"]
        assert n2["exam"] == "NDA & NA"
        assert n2["sub_category"] == "ADMIT_CARD"



@pytest.mark.django_db
class TestPollerTasks:

    def test_poll_all_active_sources_task(self):
        # Create an active source
        source, _ = UpdateSource.objects.get_or_create(
            source_id="test-parser-src",
            defaults={
                "name": "Test University Portal",
                "domain": "testuniv.edu.in",
                "authority_level": 1,
                "category": "ACADEMIC",
                "fetch_method": "STRUCTURED_PAGE",
                "is_enabled": True,
            }
        )

        result = poll_all_active_sources()
        assert isinstance(result, list)
        assert len(result) >= 1
        assert result[0]["status"] == "SUCCESS"

        # Check telemetry fetch log was saved
        logs = UpdateFetchLog.objects.filter(source=source)
        assert logs.exists()
        assert logs.first().status_code == 200

    @patch("apps.updates.tasks.get_channel_layer")
    def test_dispatch_deadline_reminders(self, mock_get_channel_layer):
        mock_channel_layer = MagicMock()
        mock_get_channel_layer.return_value = mock_channel_layer

        user = User.objects.create_user(
            email="remindme@learninghub.com",
            password="StrongPassword123!",
            first_name="Pooja",
            last_name="Singh"
        )

        source, _ = UpdateSource.objects.get_or_create(
            source_id="test-deadline-source",
            defaults={
                "name": "Exam Authority",
                "domain": "exam.gov.in",
                "authority_level": 1,
                "category": "EXAMINATION",
                "fetch_method": "STRUCTURED_PAGE",
                "is_enabled": True,
            }
        )

        # Notice with deadline within next 12 hours
        deadline_time = timezone.now() + timedelta(hours=10)
        update = StudentUpdate.objects.create(
            id="upd-urgent-deadline-test",
            source=source,
            title="Urgent: Exam Form Deadline Expiring Tonight",
            summary="Submit before midnight",
            source_url="https://exam.gov.in/form",
            category="EXAMINATION",
            sub_category="EXAM_FORM",
            status="PUBLISHED",
            importance="URGENT",
            deadline=deadline_time,
            content_hash="hash-deadline-12345",
        )

        # Create active reminder
        reminder = UpdateReminder.objects.create(
            user=user,
            update=update,
            reminder_type="1_DAY_BEFORE",
            trigger_at=timezone.now() - timedelta(minutes=5),
            is_dispatched=False
        )

        result = dispatch_deadline_reminders()
        assert isinstance(result, list)
        assert len(result) >= 1
        assert reminder.id in result

        reminder.refresh_from_db()
        assert reminder.is_dispatched is True
        assert reminder.dispatched_at is not None


@pytest.mark.django_db
class TestCrawlerAndChangeDetection:

    def test_crawler_endpoint_ingestion_and_diff(self):
        source, _ = UpdateSource.objects.get_or_create(
            source_id="src-crawler-test-aktu",
            defaults={
                "name": "AKTU Test Source",
                "domain": "aktu.ac.in",
                "authority_level": 1,
                "category": "ACADEMIC",
                "fetch_method": "HTML_TABLE",
                "base_url": "https://aktu.ac.in",
                "is_enabled": True,
            }
        )

        ep, _ = UpdateSourceEndpoint.objects.get_or_create(
            id="ep-test-aktu-circ",
            defaults={
                "source": source,
                "name": "Circulars Board",
                "endpoint_url": "https://aktu.ac.in/circulars.html",
                "is_active": True,
            }
        )

        initial_html = """
        <table class="circular-table">
            <tr>
                <td>29-09-2026</td>
                <td><a href="/circulars/BTech_Odd_Exams.pdf">B.Tech 5th Semester Examination Form Submission last date 10-10-2026</a></td>
            </tr>
        </table>
        """

        crawler = SourceCrawler()
        res1 = crawler.crawl_endpoint(ep, content_override=initial_html)

        assert res1["created"] == 1
        assert res1["modified"] == 0
        assert res1["error"] == ""

        update = StudentUpdate.objects.filter(source=source).first()
        assert update is not None
        assert "B.Tech" in update.title
        assert update.version == 1

        # Second crawl with revised deadline (change detection trigger)
        revised_html = """
        <table class="circular-table">
            <tr>
                <td>29-09-2026</td>
                <td><a href="/circulars/BTech_Odd_Exams.pdf">B.Tech 5th Semester Examination Form Submission EXTENDED last date 20-10-2026</a></td>
            </tr>
        </table>
        """
        res2 = crawler.crawl_endpoint(ep, content_override=revised_html)

        assert res2["created"] == 0
        assert res2["modified"] == 1

        update.refresh_from_db()
        assert update.version == 2
        assert "EXTENDED" in update.title

        # Check version history recorded
        versions = UpdateVersion.objects.filter(update=update)
        assert versions.count() == 1
        assert versions.first().version_number == 1


@pytest.mark.django_db
class TestAdminModerationWorkflow:

    def test_moderation_view_approve_and_reject(self):
        staff_user = User.objects.create_user(
            email="moderator@learninghub.com",
            password="StrongPassword123!",
            is_staff=True,
            first_name="Admin",
            last_name="Moderator"
        )

        source, _ = UpdateSource.objects.get_or_create(
            source_id="src-mod-test",
            defaults={"name": "Mod Source", "domain": "mod.edu", "is_enabled": True}
        )

        update = StudentUpdate.objects.create(
            id="upd-pending-mod-1",
            source=source,
            title="Pending Review College Circular",
            summary="Needs staff verification",
            source_url="https://mod.edu/notice1",
            status="DRAFT",
            verification_status="PENDING_REVIEW",
            importance="NORMAL",
            content_hash="hash-mod-001"
        )

        client = APIClient()
        client.force_authenticate(user=staff_user)

        # 1. Action: APPROVE
        url = f"/api/v1/updates/{update.id}/moderate/"
        resp = client.post(url, {"action": "APPROVE"}, format="json")
        assert resp.status_code == 200

        update.refresh_from_db()
        assert update.status == "PUBLISHED"
        assert update.verification_status == "VERIFIED"

        # 2. Action: MARK_URGENT
        resp = client.post(url, {"action": "MARK_URGENT"}, format="json")
        assert resp.status_code == 200
        update.refresh_from_db()
        assert update.importance == "URGENT"

        # 3. Action: REJECT
        resp = client.post(url, {"action": "REJECT"}, format="json")
        assert resp.status_code == 200
        update.refresh_from_db()
        assert update.status == "REJECTED"
        assert update.verification_status == "FLAGGED"

    def test_moderation_requires_staff(self):
        regular_user = User.objects.create_user(
            email="student@learninghub.com",
            password="StrongPassword123!",
            is_staff=False,
            first_name="Student",
            last_name="User"
        )

        update = StudentUpdate.objects.create(
            id="upd-pending-mod-2",
            title="Protected Notice",
            summary="Cannot be modified by non-staff",
            source_url="https://mod.edu/notice2",
            content_hash="hash-mod-002"
        )

        client = APIClient()
        client.force_authenticate(user=regular_user)

        url = f"/api/v1/updates/{update.id}/moderate/"
        resp = client.post(url, {"action": "APPROVE"}, format="json")
        assert resp.status_code == 403


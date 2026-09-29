"""
Management command to seed official sources and initial verified student notices.
"""
from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta

from apps.updates.models import (
    UpdateSource,
    UpdateSourceEndpoint,
    StudentUpdate,
    UpdateAttachment,
    UpdateCrossLink,
)
from apps.updates.sources.registry import SEED_SOURCES


class Command(BaseCommand):
    help = "Seeds official education sources and realistic notices for Student Updates Hub"

    def handle(self, *args, **options):
        self.stdout.write("Seeding official sources...")

        for s_data in SEED_SOURCES:
            source, created = UpdateSource.objects.update_or_create(
                source_id=s_data["source_id"],
                defaults={
                    "name": s_data["name"],
                    "domain": s_data["domain"],
                    "source_type": s_data["source_type"],
                    "authority_level": s_data["authority_level"],
                    "category": s_data["category"],
                    "country": s_data["country"],
                    "state": s_data["state"],
                    "institution": s_data["institution"],
                    "base_url": s_data["base_url"],
                    "fetch_method": s_data["fetch_method"],
                    "polling_interval_minutes": s_data["polling_interval_minutes"],
                    "is_enabled": s_data["is_enabled"],
                    "last_checked_at": timezone.now(),
                    "last_success_at": timezone.now(),
                },
            )
            for ep_data in s_data.get("endpoints", []):
                UpdateSourceEndpoint.objects.update_or_create(
                    id=ep_data["id"],
                    defaults={
                        "source": source,
                        "name": ep_data["name"],
                        "sub_category": ep_data["sub_category"],
                        "endpoint_url": ep_data["endpoint_url"],
                        "css_selector": ep_data.get("css_selector", ""),
                        "is_active": True,
                    },
                )
            self.stdout.write(f"  Loaded source: {source.name}")

        now = timezone.now()
        mgkvp = UpdateSource.objects.get(pk="src-mgkvp-official")
        ssc = UpdateSource.objects.get(pk="src-ssc-gov")

        # 1. Urgent Exam Form Notice with deadline
        upd1, _ = StudentUpdate.objects.update_or_create(
            id="upd-mgkvp-bca-examform",
            defaults={
                "source": mgkvp,
                "title": "MGKVP BCA 2nd & 4th Semester Examination Form Submission Extended",
                "summary": "Mahatma Gandhi Kashi Vidyapith has extended online examination form filling for BCA even semesters up to October 15, 2026 without late fee. Hard copy submission to college counter required by October 17, 2026.",
                "ai_summary": "Official notice confirms extension of BCA semester exam forms to 15-Oct-2026 without late fee. Hard copies must be deposited at campus counter by 17-Oct-2026.",
                "is_ai_summarized": True,
                "source_url": "https://mgkvp.ac.in/Home/ExamNotices/492-bca-form",
                "category": "EXAMINATION",
                "sub_category": "EXAM_FORM",
                "institution": "Mahatma Gandhi Kashi Vidyapith (MGKVP)",
                "exam": "Semester Examination 2026",
                "course": "BCA",
                "semester": "2nd & 4th",
                "session": "2025-2026",
                "published_at": now - timedelta(days=2),
                "deadline": now + timedelta(days=5),
                "importance": "URGENT",
                "verification_status": "VERIFIED",
                "status": "PUBLISHED",
                "content_hash": StudentUpdate.calculate_hash("MGKVP BCA Exam Form", "https://mgkvp.ac.in/Home/ExamNotices/492-bca-form"),
                "version": 1,
            },
        )
        UpdateAttachment.objects.update_or_create(
            id="att-mgkvp-492",
            defaults={
                "update": upd1,
                "title": "Circular_No_492_BCA_Exam_Form_Extension.pdf",
                "file_url": "https://mgkvp.ac.in/Uploads/Notice/492_BCA_Exam.pdf",
                "file_size_bytes": 384100,
                "mime_type": "application/pdf",
            },
        )
        # Link to Test A+ and Ebook
        UpdateCrossLink.objects.update_or_create(
            id="lnk-upd1-test",
            defaults={
                "update": upd1,
                "content_type": "TEST",
                "target_id": "test-bca-dbms",
                "title": "BCA DBMS Semester Mock Exam (Test A+)",
                "action_cta": "Take Practice Test",
                "action_url": "/tests-a",
            },
        )

        # 2. Result Declaration
        upd2, _ = StudentUpdate.objects.update_or_create(
            id="upd-mgkvp-bca-result",
            defaults={
                "source": mgkvp,
                "title": "MGKVP BCA 3rd Semester Main Examination 2026 Result Declared",
                "summary": "Evaluation work for BCA Semester 3 is completed. Students can check marks by entering roll number on the official MGKVP student portal.",
                "ai_summary": "MGKVP has officially published BCA Semester 3 results. Official portal roll number login required.",
                "is_ai_summarized": True,
                "source_url": "https://mgkvp.ac.in/Home/Results/bca-sem3-2026",
                "category": "EXAMINATION",
                "sub_category": "RESULT",
                "institution": "Mahatma Gandhi Kashi Vidyapith (MGKVP)",
                "course": "BCA",
                "semester": "3rd",
                "published_at": now - timedelta(hours=14),
                "importance": "IMPORTANT",
                "verification_status": "VERIFIED",
                "status": "PUBLISHED",
                "content_hash": StudentUpdate.calculate_hash("MGKVP BCA 3rd Sem Result", "https://mgkvp.ac.in/Home/Results/bca-sem3-2026"),
                "version": 1,
            },
        )

        # 3. SSC CGL Notification
        upd3, _ = StudentUpdate.objects.update_or_create(
            id="upd-ssc-cgl-cityslip",
            defaults={
                "source": ssc,
                "title": "SSC CGL 2026 Tier 1 Examination City Intimation Slip Released",
                "summary": "Staff Selection Commission has activated the link for examination city intimation for Combined Graduate Level Examination Tier-1. Candidates can download slips from regional portals.",
                "source_url": "https://ssc.gov.in/notices/cgl-2026-city-slip",
                "category": "COMPETITIVE_EXAMS",
                "sub_category": "ADMIT_CARD",
                "institution": "Staff Selection Commission",
                "exam": "SSC CGL 2026",
                "published_at": now - timedelta(days=1),
                "event_date": now + timedelta(days=12),
                "importance": "IMPORTANT",
                "verification_status": "VERIFIED",
                "status": "PUBLISHED",
                "content_hash": StudentUpdate.calculate_hash("SSC CGL City Slip", "https://ssc.gov.in/notices/cgl-2026-city-slip"),
                "version": 1,
            },
        )
        UpdateCrossLink.objects.update_or_create(
            id="lnk-upd3-test",
            defaults={
                "update": upd3,
                "content_type": "TEST",
                "target_id": "test-ssc-cgl-mock",
                "title": "SSC CGL Tier-1 Full Length Mock Test",
                "action_cta": "Attempt Mock Test",
                "action_url": "/tests-a",
            },
        )

        # 4. Scholarship Window
        StudentUpdate.objects.update_or_create(
            id="upd-scholarship-up-2026",
            defaults={
                "source": mgkvp,
                "title": "UP Post-Matric Scholarship 2026-27 Document Verification Notice",
                "summary": "All undergraduate and postgraduate students enrolled in university campus and affiliated colleges must submit verified income certificates and fee receipts at their respective departmental offices.",
                "source_url": "https://mgkvp.ac.in/Home/NoticeList/scholarship-2026-doc-verification",
                "category": "SCHOLARSHIP",
                "sub_category": "DOCUMENT_VERIFICATION",
                "institution": "Mahatma Gandhi Kashi Vidyapith (MGKVP)",
                "published_at": now - timedelta(days=3),
                "deadline": now + timedelta(days=10),
                "importance": "NORMAL",
                "verification_status": "VERIFIED",
                "status": "PUBLISHED",
                "content_hash": StudentUpdate.calculate_hash("UP Scholarship Notice", "https://mgkvp.ac.in/Home/NoticeList/scholarship-2026-doc-verification"),
                "version": 1,
            },
        )

        # 5. University of Lucknow Notice
        lu = UpdateSource.objects.filter(pk="src-lu-official").first()
        if lu:
            upd_lu, _ = StudentUpdate.objects.update_or_create(
                id="upd-lu-exam-schedule-2026",
                defaults={
                    "source": lu,
                    "title": "University of Lucknow B.Tech & MBA Even Semester Final Examination Schedule 2026",
                    "summary": "The Controller of Examinations, University of Lucknow has announced the comprehensive date sheet for B.Tech and MBA even semester theory and practical examinations commencing from next month.",
                    "ai_summary": "Official B.Tech and MBA examination datesheet released by Lucknow University. Shift timings and center allocations published on the official portal.",
                    "is_ai_summarized": True,
                    "source_url": "https://lkouniv.ac.in/en/page/examination-notices/btech-mba-schedule-2026",
                    "category": "EXAMINATION",
                    "sub_category": "TIMETABLE",
                    "institution": "University of Lucknow",
                    "course": "B.Tech",
                    "published_at": now - timedelta(days=1),
                    "deadline": now + timedelta(days=9),
                    "importance": "IMPORTANT",
                    "verification_status": "VERIFIED",
                    "status": "PUBLISHED",
                    "content_hash": StudentUpdate.calculate_hash("LU BTech MBA Schedule", "https://lkouniv.ac.in/en/page/examination-notices/btech-mba-schedule-2026"),
                    "version": 1,
                }
            )
            UpdateAttachment.objects.update_or_create(
                id="att-lu-schedule",
                defaults={
                    "update": upd_lu,
                    "title": "LU_BTech_MBA_Datesheet_2026.pdf",
                    "file_url": "https://lkouniv.ac.in/site/writereaddata/Upload/Datesheet_BTech_MBA_2026.pdf",
                    "file_size_bytes": 512000,
                    "mime_type": "application/pdf",
                }
            )
            UpdateCrossLink.objects.update_or_create(
                id="lnk-lu-dsa",
                defaults={
                    "update": upd_lu,
                    "content_type": "TEST",
                    "target_id": "test-btech-dsa",
                    "title": "Take B.Tech Engineering Assessment (Test A+)",
                    "action_cta": "Start Practice Test",
                    "action_url": "/tests-a",
                }
            )

        # 6. Banaras Hindu University Notice
        bhu = UpdateSource.objects.filter(pk="src-bhu-official").first()
        if bhu:
            upd_bhu, _ = StudentUpdate.objects.update_or_create(
                id="upd-bhu-cuet-counselling-2026",
                defaults={
                    "source": bhu,
                    "title": "Banaras Hindu University (BHU) CUET UG Spot Round Counseling Schedule",
                    "summary": "Office of the Controller of Examinations invites eligible candidates for vacant seats in B.Sc (Hons) Bio and Maths groups. Online preference entry portal open for 72 hours.",
                    "ai_summary": "Spot round counseling for vacant B.Sc Hons seats opened by BHU. Candidates must submit locked preferences before the strict deadline.",
                    "is_ai_summarized": True,
                    "source_url": "https://bhuonline.in/counselling/cuet-ug-spot-round-2026",
                    "category": "ADMISSION",
                    "sub_category": "COUNSELLING",
                    "institution": "Banaras Hindu University (BHU)",
                    "course": "B.Sc",
                    "published_at": now - timedelta(hours=14),
                    "deadline": now + timedelta(days=3),
                    "importance": "URGENT",
                    "verification_status": "VERIFIED",
                    "status": "PUBLISHED",
                    "content_hash": StudentUpdate.calculate_hash("BHU Spot Round", "https://bhuonline.in/counselling/cuet-ug-spot-round-2026"),
                    "version": 1,
                }
            )
            UpdateAttachment.objects.update_or_create(
                id="att-bhu-spot",
                defaults={
                    "update": upd_bhu,
                    "title": "BHU_Spot_Round_Vacant_Seats_Matrix.pdf",
                    "file_url": "https://bhuonline.in/docs/Spot_Round_Matrix_2026.pdf",
                    "file_size_bytes": 624000,
                    "mime_type": "application/pdf",
                }
            )

        # 7. DDU Gorakhpur Notice
        ddu = UpdateSource.objects.filter(pk="src-ddu-official").first()
        if ddu:
            upd_ddu, _ = StudentUpdate.objects.update_or_create(
                id="upd-ddu-backpaper-form-2026",
                defaults={
                    "source": ddu,
                    "title": "DDU Gorakhpur University BCA & B.Sc Back Paper Examination Form Window",
                    "summary": "Students with back paper or improvement requirement in undergraduate semester examinations must complete online form and payment to appear in the special session.",
                    "source_url": "https://ddugu.ac.in/ExamNotices/backpaper-bca-bsc-2026.aspx",
                    "category": "EXAMINATION",
                    "sub_category": "BACK_PAPER",
                    "institution": "DDU Gorakhpur University",
                    "course": "BCA",
                    "published_at": now - timedelta(days=2),
                    "deadline": now + timedelta(days=6),
                    "importance": "IMPORTANT",
                    "verification_status": "VERIFIED",
                    "status": "PUBLISHED",
                    "content_hash": StudentUpdate.calculate_hash("DDU Back Paper", "https://ddugu.ac.in/ExamNotices/backpaper-bca-bsc-2026.aspx"),
                    "version": 1,
                }
            )

        # 8. National Testing Agency Notice
        nta = UpdateSource.objects.filter(pk="src-nta-official").first()
        if nta:
            upd_nta, _ = StudentUpdate.objects.update_or_create(
                id="upd-nta-cuet-ug-city-intimation-2026",
                defaults={
                    "source": nta,
                    "title": "NTA CUET (UG) 2026 Advance Intimation of Examination City Allotment Slip",
                    "summary": "National Testing Agency has released the Advance Intimation Slip informing candidates of the city of their examination center for CUET (UG) 2026 Computer Based Test.",
                    "ai_summary": "NTA CUET (UG) exam city intimation slips are now live. This is not the admit card; admit cards will be released 3 days prior to exam commencement.",
                    "is_ai_summarized": True,
                    "source_url": "https://exams.nta.ac.in/CUET-UG/public-notice-city-intimation.pdf",
                    "category": "COMPETITIVE_EXAMS",
                    "sub_category": "EXAM_CENTER",
                    "institution": "National Testing Agency (NTA)",
                    "exam": "CUET",
                    "published_at": now - timedelta(hours=6),
                    "deadline": now + timedelta(days=14),
                    "importance": "URGENT",
                    "verification_status": "VERIFIED",
                    "status": "PUBLISHED",
                    "content_hash": StudentUpdate.calculate_hash("NTA CUET City Intimation", "https://exams.nta.ac.in/CUET-UG/public-notice-city-intimation.pdf"),
                    "version": 1,
                }
            )
            UpdateAttachment.objects.update_or_create(
                id="att-nta-slip",
                defaults={
                    "update": upd_nta,
                    "title": "Public_Notice_CUET_UG_City_Intimation_2026.pdf",
                    "file_url": "https://exams.nta.ac.in/CUET-UG/Notice_City_Slip_2026.pdf",
                    "file_size_bytes": 450000,
                    "mime_type": "application/pdf",
                }
            )
            UpdateCrossLink.objects.update_or_create(
                id="lnk-nta-cuet-mock",
                defaults={
                    "update": upd_nta,
                    "content_type": "TEST",
                    "target_id": "test-cuet-ug-domain",
                    "title": "Practice CUET UG General Test & Domain Papers",
                    "action_cta": "Start Mock Test",
                    "action_url": "/tests-a",
                }
            )

        self.stdout.write(self.style.SUCCESS("Successfully seeded Student Updates Hub with official sources and sample notices!"))

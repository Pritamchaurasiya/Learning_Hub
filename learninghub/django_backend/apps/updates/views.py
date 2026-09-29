"""
API Views for LearningHub Student Updates Hub.
"""
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework import status
from django.core.exceptions import ValidationError

from apps.core.responses import success_response, error_response
from .models import (
    StudentUpdate,
    UpdateBookmark,
    UpdateReminder,
    UpdateSubscription,
    UpdateNotificationPreference,
    QueuedUpdateNotification,
    UpdateNotificationAudit,
    ResultWatcher,
)
from .serializers import (
    StudentUpdateListSerializer,
    StudentUpdateDetailSerializer,
    UpdateBookmarkSerializer,
    UpdateReminderSerializer,
    UpdateSubscriptionSerializer,
    UpdateSourceSerializer,
    CreateBookmarkInputSerializer,
    CreateReminderInputSerializer,
    FollowTargetInputSerializer,
    UpdateNotificationPreferenceSerializer,
    QueuedUpdateNotificationSerializer,
    ResultWatcherSerializer,
    CreateResultWatcherInputSerializer,
)
from .selectors import (
    list_student_updates,
    get_personalized_feed,
    get_upcoming_deadlines,
    get_update_detail,
    list_user_bookmarks,
    list_user_reminders,
    list_user_subscriptions,
    list_sources,
    get_updates_statistics,
    list_user_result_watchers,
    get_result_watcher_detail,
)
from .services import StudentUpdateService


class StudentUpdateListView(APIView):
    """
    Lists student updates with search, category filtering, and sorting.
    """
    permission_classes = [AllowAny]

    def get(self, request):
        category = request.query_params.get("category")
        search = request.query_params.get("search") or request.query_params.get("q")
        institution = request.query_params.get("institution")
        importance = request.query_params.get("importance")
        course = request.query_params.get("course")
        only_deadlines = request.query_params.get("only_deadlines", "").lower() in ("true", "1")
        limit = min(int(request.query_params.get("limit", 50)), 100)
        offset = int(request.query_params.get("offset", 0))

        updates = list_student_updates(
            category=category,
            search=search,
            institution=institution,
            importance=importance,
            course=course,
            only_deadlines=only_deadlines,
            limit=limit,
            offset=offset,
        )
        serializer = StudentUpdateListSerializer(updates, many=True, context={"request": request})
        return success_response(data=serializer.data, meta={"count": len(serializer.data), "offset": offset, "limit": limit})


class StudentUpdatePersonalizedFeedView(APIView):
    """
    Returns personalized updates feed based on user subscriptions.
    """
    permission_classes = [AllowAny]

    def get(self, request):
        limit = min(int(request.query_params.get("limit", 50)), 100)
        offset = int(request.query_params.get("offset", 0))

        updates = get_personalized_feed(user=request.user, limit=limit, offset=offset)
        serializer = StudentUpdateListSerializer(updates, many=True, context={"request": request})
        return success_response(data=serializer.data, meta={"count": len(serializer.data)})


class StudentUpdateUpcomingDeadlinesView(APIView):
    """
    Returns upcoming chronological deadlines for forms, fees, and tests.
    """
    permission_classes = [AllowAny]

    def get(self, request):
        limit = min(int(request.query_params.get("limit", 15)), 50)
        deadlines = get_upcoming_deadlines(limit=limit)
        serializer = StudentUpdateListSerializer(deadlines, many=True, context={"request": request})
        return success_response(data=serializer.data, meta={"count": len(serializer.data)})


class StudentUpdateDetailView(APIView):
    """
    Detailed notice representation including attachments, versions, and cross-feature links.
    """
    permission_classes = [AllowAny]

    def get(self, request, update_id: str):
        update = get_update_detail(update_id)
        if not update:
            return error_response("Student update not found", status_code=status.HTTP_404_NOT_FOUND)

        serializer = StudentUpdateDetailSerializer(update, context={"request": request})
        return success_response(data=serializer.data)


class StudentUpdateBookmarkListView(APIView):
    """
    Lists user saved notices or adds an update to bookmarks.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        bookmarks = list_user_bookmarks(request.user)
        serializer = UpdateBookmarkSerializer(bookmarks, many=True, context={"request": request})
        return success_response(data=serializer.data, meta={"count": len(serializer.data)})

    def post(self, request):
        serializer = CreateBookmarkInputSerializer(data=request.data)
        if not serializer.is_valid():
            return error_response("Invalid input payload", errors=serializer.errors, status_code=status.HTTP_400_BAD_REQUEST)

        try:
            bookmark = StudentUpdateService.create_bookmark(
                user=request.user,
                update_id=serializer.validated_data["update_id"],
                notes=serializer.validated_data.get("notes", ""),
                tag=serializer.validated_data.get("tag", "General"),
            )
            return success_response(
                data=UpdateBookmarkSerializer(bookmark, context={"request": request}).data,
                message="Update saved to bookmarks",
                status_code=status.HTTP_201_CREATED
            )
        except ValidationError as e:
            return error_response(str(e.message if hasattr(e, 'message') else e), status_code=status.HTTP_400_BAD_REQUEST)


class StudentUpdateBookmarkDetailView(APIView):
    """
    Creates or removes an update bookmark by update_id shortcut or explicit endpoint.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, update_id: str):
        notes = request.data.get("notes", "") if request.data else ""
        tag = request.data.get("tag", "General") if request.data else "General"
        try:
            bookmark = StudentUpdateService.create_bookmark(
                user=request.user,
                update_id=update_id,
                notes=notes,
                tag=tag,
            )
            return success_response(
                data={
                    "is_bookmarked": True,
                    "bookmark_id": bookmark.id,
                    "update_id": update_id,
                },
                message="Update bookmarked",
                status_code=status.HTTP_200_OK,
            )
        except ValidationError as e:
            return error_response(str(e.message if hasattr(e, 'message') else e), status_code=status.HTTP_400_BAD_REQUEST)

    def delete(self, request, update_id: str):
        deleted = StudentUpdateService.delete_bookmark(request.user, update_id)
        return success_response(
            data={"is_bookmarked": False, "deleted": bool(deleted), "update_id": update_id},
            message="Bookmark removed",
            status_code=status.HTTP_200_OK,
        )


class StudentUpdateReminderListView(APIView):
    """
    Lists or schedules deadline reminders.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        reminders = list_user_reminders(request.user)
        serializer = UpdateReminderSerializer(reminders, many=True, context={"request": request})
        return success_response(data=serializer.data, meta={"count": len(serializer.data)})

    def post(self, request):
        serializer = CreateReminderInputSerializer(data=request.data)
        if not serializer.is_valid():
            return error_response("Invalid input payload", errors=serializer.errors, status_code=status.HTTP_400_BAD_REQUEST)

        try:
            reminder = StudentUpdateService.create_deadline_reminder(
                user=request.user,
                update_id=serializer.validated_data["update_id"],
                reminder_type=serializer.validated_data["reminder_type"],
            )
            return success_response(
                data=UpdateReminderSerializer(reminder, context={"request": request}).data,
                message="Reminder scheduled successfully",
                status_code=status.HTTP_201_CREATED
            )
        except ValidationError as e:
            return error_response(str(e.message if hasattr(e, 'message') else e), status_code=status.HTTP_400_BAD_REQUEST)


class StudentUpdateReminderDetailView(APIView):
    """
    Cancels a scheduled deadline reminder.
    """
    permission_classes = [IsAuthenticated]

    def delete(self, request, reminder_id: str):
        cancelled = StudentUpdateService.cancel_reminder(request.user, reminder_id)
        if not cancelled:
            return error_response("Reminder not found", status_code=status.HTTP_404_NOT_FOUND)
        return success_response(data={"cancelled": True}, message="Reminder cancelled")


class StudentUpdateSubscriptionListView(APIView):
    """
    Lists or creates follow targets (University, Course, Exam, Category).
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        subscriptions = list_user_subscriptions(request.user)
        serializer = UpdateSubscriptionSerializer(subscriptions, many=True)
        return success_response(data=serializer.data, meta={"count": len(serializer.data)})

    def post(self, request):
        serializer = FollowTargetInputSerializer(data=request.data)
        if not serializer.is_valid():
            return error_response("Invalid input payload", errors=serializer.errors, status_code=status.HTTP_400_BAD_REQUEST)

        subscription = StudentUpdateService.follow_target(
            user=request.user,
            target_type=serializer.validated_data["target_type"],
            target_value=serializer.validated_data["target_value"],
        )
        return success_response(
            data=UpdateSubscriptionSerializer(subscription).data,
            message="Subscribed to updates successfully",
            status_code=status.HTTP_201_CREATED
        )


class StudentUpdateSubscriptionDetailView(APIView):
    """
    Unsubscribes from a target by ID or type/value.
    """
    permission_classes = [IsAuthenticated]

    def delete(self, request, subscription_id: str):
        deleted_count, _ = UpdateSubscription.objects.filter(user=request.user, id=subscription_id).delete()
        if not deleted_count:
            return error_response("Subscription not found", status_code=status.HTTP_404_NOT_FOUND)
        return success_response(data={"deleted": True}, message="Unsubscribed successfully")


class UpdateSourceListView(APIView):
    """
    Lists all registered official sources with authority levels and endpoints.
    """
    permission_classes = [AllowAny]

    def get(self, request):
        sources = list_sources()
        if not sources.exists():
            StudentUpdateService.seed_default_sources()
            sources = list_sources()
        serializer = UpdateSourceSerializer(sources, many=True)
        return success_response(data=serializer.data, meta={"count": len(serializer.data)})


class UpdatesStatisticsView(APIView):
    """
    Returns metrics overview (counts of updates, urgent items, active deadlines, sources).
    """
    permission_classes = [AllowAny]

    def get(self, request):
        stats = get_updates_statistics()
        return success_response(data=stats)


class SeedSourcesAndUpdatesView(APIView):
    """
    Seeds official sources and initial real-world circulars for MGKVP, AKTU, and SSC.
    """
    permission_classes = [AllowAny]

    def post(self, request):
        # 1. Seed sources
        StudentUpdateService.seed_default_sources()

        # 2. Ingest realistic initial updates
        from datetime import timedelta
        from django.utils import timezone
        now = timezone.now()

        demo_notices = [
            {
                "source_id": "src-mgkvp-official",
                "payload": {
                    "title": "MGKVP BCA / B.Sc / B.Com Even Semester Examination Form Submission Extended",
                    "url": "https://mgkvp.ac.in/Home/ExamNoticeBCA2026.pdf",
                    "date_str": (now - timedelta(days=1)).strftime("%d-%m-%Y"),
                    "deadline_str": (now + timedelta(days=6)).strftime("%d-%m-%Y"),
                    "summary": "The last date for submitting online examination forms for BCA, B.Sc, and B.Com 2nd, 4th, and 6th semester has been officially extended up to " + (now + timedelta(days=6)).strftime("%d %B %Y") + " with standard late fee. Affiliated college principals must verify student roll numbers before final submission.",
                    "category": "EXAMINATION",
                    "sub_category": "EXAM_FORM",
                    "importance": "URGENT",
                    "course": "BCA",
                    "semester": "4th Semester",
                    "attachments": [
                        {"title": "MGKVP_Notice_Exam_Form_Ext_2026.pdf", "url": "https://mgkvp.ac.in/Uploads/Notice_BCA_2026.pdf"}
                    ]
                }
            },
            {
                "source_id": "src-mgkvp-official",
                "payload": {
                    "title": "MGKVP Main Campus & Affiliated Colleges Final Examination Time Table 2026 Announced",
                    "url": "https://mgkvp.ac.in/Home/TimeTable2026.pdf",
                    "date_str": (now - timedelta(days=2)).strftime("%d-%m-%Y"),
                    "deadline_str": (now + timedelta(days=14)).strftime("%d-%m-%Y"),
                    "summary": "Mahatma Gandhi Kashi Vidyapith has released the comprehensive examination schedule for all undergraduate and postgraduate semester examinations commencing from next month. Download the official subject-wise schedule below.",
                    "category": "EXAMINATION",
                    "sub_category": "TIMETABLE",
                    "importance": "IMPORTANT",
                    "attachments": [
                        {"title": "MGKVP_UG_PG_TimeTable_May2026.pdf", "url": "https://mgkvp.ac.in/Uploads/TimeTable2026.pdf"}
                    ]
                }
            },
            {
                "source_id": "src-mgkvp-official",
                "payload": {
                    "title": "MGKVP Odd Semester Scrutiny and Challenge Evaluation Results Declared",
                    "url": "https://mgkvp.ac.in/Home/ResultsScrutiny2026.html",
                    "date_str": now.strftime("%d-%m-%Y"),
                    "summary": "Results for scrutiny and challenge re-evaluation of answer booklets for odd semester examinations held earlier this year have been published on the student evaluation portal.",
                    "category": "EXAMINATION",
                    "sub_category": "RESULT",
                    "importance": "IMPORTANT",
                    "attachments": []
                }
            },
            {
                "source_id": "src-aktu-official",
                "payload": {
                    "title": "Dr. APJ Abdul Kalam Technical University Odd Semester Carry Over Exam Registration Window",
                    "url": "https://aktu.ac.in/circulars/cop_exam_reg_2026.pdf",
                    "date_str": (now - timedelta(days=3)).strftime("%d-%m-%Y"),
                    "deadline_str": (now + timedelta(days=4)).strftime("%d-%m-%Y"),
                    "summary": "All B.Tech, MCA, and MBA students appearing for carry over papers (COP) must complete subject choices and online fee deposit before the strict deadline. Late submissions will not be entertained.",
                    "category": "EXAMINATION",
                    "sub_category": "EXAM_FORM",
                    "importance": "URGENT",
                    "course": "B.Tech",
                    "attachments": [
                        {"title": "AKTU_COP_Circular_2026.pdf", "url": "https://aktu.ac.in/circulars/cop_exam_reg_2026.pdf"}
                    ]
                }
            },
            {
                "source_id": "src-ssc-gov",
                "payload": {
                    "title": "Staff Selection Commission Combined Graduate Level (SSC CGL) Notification Released",
                    "url": "https://ssc.gov.in/notice/cgl2026",
                    "date_str": (now - timedelta(days=4)).strftime("%d-%m-%Y"),
                    "deadline_str": (now + timedelta(days=25)).strftime("%d-%m-%Y"),
                    "summary": "SSC invites online applications for recruitment to Group B and Group C posts in various Ministries/Departments of the Government of India. Tier-1 Computer Based Examination is scheduled for July-August.",
                    "category": "COMPETITIVE_EXAMS",
                    "sub_category": "ADMISSION_OPEN",
                    "importance": "URGENT",
                    "attachments": [
                        {"title": "SSC_CGL_Official_Notification_2026.pdf", "url": "https://ssc.gov.in/Uploads/CGL_Notification_2026.pdf"}
                    ]
                }
            },
            {
                "source_id": "src-mgkvp-official",
                "payload": {
                    "title": "Uttar Pradesh State Post-Matric Scholarship Biometric Attendance & Aadhaar Seeding Mandatory Notice",
                    "url": "https://mgkvp.ac.in/Home/ScholarshipAadhaar2026.pdf",
                    "date_str": (now - timedelta(days=5)).strftime("%d-%m-%Y"),
                    "deadline_str": (now + timedelta(days=10)).strftime("%d-%m-%Y"),
                    "summary": "All students availing UP Social Welfare Department scholarship must ensure 75% biometric attendance and link Aadhaar with bank accounts before the university verification freeze date.",
                    "category": "SCHOLARSHIP",
                    "sub_category": "SCHOLARSHIP_OPEN",
                    "importance": "NORMAL",
                    "attachments": [
                        {"title": "UP_Scholarship_Advisory_2026.pdf", "url": "https://scholarship.up.gov.in/advisory2026.pdf"}
                    ]
                }
            }
        ]

        ingested = []
        for item in demo_notices:
            res = StudentUpdateService.ingest_notice_from_source(
                source_id=item["source_id"],
                raw_payload=item["payload"],
            )
            if res:
                ingested.append(res.id)

        return success_response(
            data={"ingested_count": len(ingested), "update_ids": ingested},
            message=f"Seeded default sources and {len(ingested)} initial official student updates."
        )


class StudentUpdateModerationView(APIView):
    """
    Moderation endpoint allowing staff and administrators to approve, reject,
    or mark notices as urgent alerts.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, update_id):
        if not (request.user.is_staff or request.user.is_superuser):
            return error_response(
                message="Administrative privileges required to moderate notices.",
                status_code=status.HTTP_403_FORBIDDEN
            )

        update = StudentUpdate.objects.filter(id=update_id).first()
        if not update:
            return error_response(
                message=f"Student update with ID '{update_id}' not found.",
                status_code=status.HTTP_404_NOT_FOUND
            )

        action = (request.data.get("action") or "").upper()
        if action == "APPROVE":
            update.status = "PUBLISHED"
            update.verification_status = "VERIFIED"
        elif action == "REJECT":
            update.status = "REJECTED"
            update.verification_status = "FLAGGED"
        elif action == "MARK_URGENT":
            update.importance = "URGENT"
        elif action == "FLAG":
            update.verification_status = "FLAGGED"
        else:
            return error_response(
                message="Invalid action. Allowed actions: APPROVE, REJECT, MARK_URGENT, FLAG.",
                status_code=status.HTTP_400_BAD_REQUEST
            )

        update.save()
        serializer = StudentUpdateDetailSerializer(update)
        return success_response(
            data=serializer.data,
            message=f"Notice successfully updated with moderation action: {action}"
        )


class TriggerSourceCrawlView(APIView):
    """
    Admin-only endpoint to trigger an immediate crawl and change detection cycle
    across registered educational sources.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        if not (request.user.is_staff or request.user.is_superuser):
            return error_response(
                message="Administrative privileges required to trigger crawlers.",
                status_code=status.HTTP_403_FORBIDDEN
            )

        from .crawler import SourceCrawler
        from .models import UpdateSource

        source_id = request.data.get("source_id")
        crawler = SourceCrawler()

        if source_id:
            source = UpdateSource.objects.filter(source_id=source_id).first()
            if not source:
                return error_response(
                    message=f"Source with ID '{source_id}' not found.",
                    status_code=status.HTTP_404_NOT_FOUND
                )
            crawl_res = crawler.crawl_source(source)
            return success_response(
                data=crawl_res,
                message=f"Crawl completed for source '{source.name}'."
            )
        else:
            sources = UpdateSource.objects.filter(is_enabled=True)
            results = []
            for src in sources:
                results.append(crawler.crawl_source(src))
            return success_response(
                data={"sources_crawled": len(results), "details": results},
                message=f"Crawl completed across {len(results)} active sources."
            )


class UpdateNotificationPreferencesView(APIView):
    """
    Manages user notification preferences, quiet hours, daily push caps, and topic mutes.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        pref = StudentUpdateService.get_or_create_user_preferences(request.user)
        serializer = UpdateNotificationPreferenceSerializer(pref)
        return success_response(data=serializer.data)

    def put(self, request):
        return self.patch(request)

    def patch(self, request):
        pref = StudentUpdateService.get_or_create_user_preferences(request.user)
        serializer = UpdateNotificationPreferenceSerializer(pref, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return success_response(
                data=serializer.data,
                message="Notification preferences updated successfully."
            )
        return error_response(
            message="Invalid preferences data.",
            errors=serializer.errors,
            status_code=status.HTTP_400_BAD_REQUEST
        )


class QueuedNotificationsListView(APIView):
    """
    Returns pending notifications deferred during quiet hours or digest bundling.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        queued = QueuedUpdateNotification.objects.filter(
            user=request.user,
            is_dispatched=False
        ).select_related('update').order_by('scheduled_for')
        serializer = QueuedUpdateNotificationSerializer(queued, many=True)
        return success_response(data=serializer.data, meta={"count": len(serializer.data)})


class UpdateNotificationAuditsView(APIView):
    """
    Returns observability audit logs of notification delivery decisions for the current student.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        audits = UpdateNotificationAudit.objects.filter(
            user=request.user
        ).select_related('update').order_by('-delivered_at')[:50]
        data = [
            {
                "id": a.id,
                "update_id": a.update_id,
                "update_title": a.update.title,
                "channel": a.channel,
                "decision": a.decision,
                "reason": a.reason,
                "delivered_at": a.delivered_at,
            }
            for a in audits
        ]
        return success_response(data=data, meta={"count": len(data)})


class BroadcastNoticeView(APIView):
    """
    Staff-only endpoint to trigger real-time multi-channel notification broadcast
    with anti-noise filtering for an official update.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, update_id: str):
        if not (request.user.is_staff or request.user.is_superuser):
            return error_response(
                message="Administrative privileges required to broadcast notifications.",
                status_code=status.HTTP_403_FORBIDDEN
            )

        update = StudentUpdate.objects.filter(id=update_id).first()
        if not update:
            return error_response(
                message=f"Student update with ID '{update_id}' not found.",
                status_code=status.HTTP_404_NOT_FOUND
            )

        force_immediate = bool(request.data.get('force_immediate', False))
        res = StudentUpdateService.dispatch_update_notification(update, force_immediate=force_immediate)
        return success_response(
            data=res,
            message="Broadcast completed with anti-noise evaluation."
        )


class AutoScheduleDeadlineRemindersView(APIView):
    """
    One-click setup that automatically registers 4-stage deadline reminders
    (7d, 3d, 1d, 0d) for a specific update.
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, update_id: str):
        update = StudentUpdate.objects.filter(id=update_id).first()
        if not update:
            return error_response(
                message=f"Student update with ID '{update_id}' not found.",
                status_code=status.HTTP_404_NOT_FOUND
            )

        if not update.deadline:
            return error_response(
                message="This update does not have an active deadline to schedule reminders for.",
                status_code=status.HTTP_400_BAD_REQUEST
            )

        standard_tiers = ['7_DAYS_BEFORE', '3_DAYS_BEFORE', '1_DAY_BEFORE', 'DAY_OF']
        try:
            created_reminders = StudentUpdateService.schedule_deadline_reminders(
                user=request.user,
                update_id=update.id,
                reminder_types=standard_tiers
            )
            serializer = UpdateReminderSerializer(created_reminders, many=True)
            return success_response(
                data=serializer.data,
                message=f"Successfully scheduled {len(created_reminders)} automated deadline reminders.",
                status_code=status.HTTP_201_CREATED
            )
        except ValidationError as e:
            return error_response(str(e.message if hasattr(e, 'message') else e), status_code=status.HTTP_400_BAD_REQUEST)


class ResultWatcherListView(APIView):
    """
    Lists user's registered Result Watchers or creates a new automated tracking watcher.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        watchers = list_user_result_watchers(request.user)
        serializer = ResultWatcherSerializer(watchers, many=True)
        return success_response(data=serializer.data, meta={"count": len(serializer.data)})

    def post(self, request):
        serializer = CreateResultWatcherInputSerializer(data=request.data)
        if not serializer.is_valid():
            return error_response(
                message="Invalid input payload.",
                errors=serializer.errors,
                status_code=status.HTTP_400_BAD_REQUEST
            )

        try:
            watcher = StudentUpdateService.create_result_watcher(
                user=request.user,
                institution=serializer.validated_data["institution"],
                course=serializer.validated_data["course"],
                semester=serializer.validated_data.get("semester", ""),
                roll_number=serializer.validated_data.get("roll_number", ""),
            )
            return success_response(
                data=ResultWatcherSerializer(watcher).data,
                message=f"Result Watcher activated for {watcher.course} ({watcher.semester or 'All'}) @ {watcher.institution}.",
                status_code=status.HTTP_201_CREATED
            )
        except ValidationError as e:
            return error_response(str(e.message if hasattr(e, 'message') else e), status_code=status.HTTP_400_BAD_REQUEST)


class ResultWatcherDetailView(APIView):
    """
    Retrieves or cancels an active Result Watcher.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, watcher_id: str):
        watcher = get_result_watcher_detail(request.user, watcher_id)
        if not watcher:
            return error_response("Result Watcher not found.", status_code=status.HTTP_404_NOT_FOUND)
        return success_response(data=ResultWatcherSerializer(watcher).data)

    def delete(self, request, watcher_id: str):
        deleted = StudentUpdateService.cancel_result_watcher(request.user, watcher_id)
        if not deleted:
            return error_response("Result Watcher not found or already cancelled.", status_code=status.HTTP_404_NOT_FOUND)
        return success_response(message="Result Watcher successfully cancelled.")




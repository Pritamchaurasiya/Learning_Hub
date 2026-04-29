"""
Enhanced Study Groups Service

Provides real-time collaboration features for study groups including:
1. Real-time presence tracking
2. Collaborative note-taking
3. Group challenges
4. Study session scheduling
5. Progress syncing
"""

import logging
from datetime import timedelta
from typing import Dict, Any, List, Optional
from dataclasses import dataclass
from enum import Enum

from django.utils import timezone
from django.db.models import Count, Avg, Q
from django.core.cache import cache
from django.conf import settings

logger = logging.getLogger(__name__)


class PresenceStatus(Enum):
    """User presence status in study group."""
    ONLINE = "online"
    AWAY = "away"
    STUDYING = "studying"
    IN_MEETING = "in_meeting"
    OFFLINE = "offline"


class SessionType(Enum):
    """Types of study sessions."""
    SELF_PACED = "self_paced"
    GROUP_SYNC = "group_sync"
    CHALLENGE = "challenge"
    REVIEW = "review"
    LIVE = "live"


@dataclass
class StudySession:
    """Represents a study session."""
    session_id: str
    group_id: str
    title: str
    session_type: SessionType
    start_time: str
    end_time: Optional[str]
    participants: List[str]
    course_id: Optional[str]
    lesson_id: Optional[str]


class StudyGroupService:
    """
    Enhanced service for study group collaboration.
    """
    
    PRESENCE_TIMEOUT = 300  # 5 minutes
    CACHE_PREFIX = "study_group"
    
    # ==========================================================================
    # PRESENCE MANAGEMENT
    # ==========================================================================
    
    @classmethod
    def update_presence(
        cls,
        user,
        group_id: str,
        status: PresenceStatus,
        activity: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Update user's presence status in a study group.
        """
        cache_key = f"{cls.CACHE_PREFIX}:presence:{group_id}:{user.id}"
        
        presence_data = {
            'user_id': str(user.id),
            'username': user.username,
            'avatar': user.avatar.url if hasattr(user, 'avatar') and user.avatar else None,
            'status': status.value,
            'activity': activity,
            'last_seen': timezone.now().isoformat()
        }
        
        cache.set(cache_key, presence_data, timeout=cls.PRESENCE_TIMEOUT)
        
        # Also update the group's active members list
        cls._update_active_members(group_id, user.id, status)
        
        return presence_data
    
    @classmethod
    def get_group_presence(cls, group_id: str) -> List[Dict[str, Any]]:
        """
        Get presence status of all members in a study group.
        """
        cache_key = f"{cls.CACHE_PREFIX}:active_members:{group_id}"
        active_member_ids = cache.get(cache_key, [])
        
        presence_list = []
        for user_id in active_member_ids:
            presence_key = f"{cls.CACHE_PREFIX}:presence:{group_id}:{user_id}"
            presence = cache.get(presence_key)
            if presence:
                presence_list.append(presence)
        
        return presence_list
    
    @classmethod
    def _update_active_members(
        cls, 
        group_id: str, 
        user_id, 
        status: PresenceStatus
    ) -> None:
        """Update the list of active members in a group."""
        cache_key = f"{cls.CACHE_PREFIX}:active_members:{group_id}"
        active_members = set(cache.get(cache_key, []))
        
        if status == PresenceStatus.OFFLINE:
            active_members.discard(str(user_id))
        else:
            active_members.add(str(user_id))
        
        cache.set(cache_key, list(active_members), timeout=cls.PRESENCE_TIMEOUT * 2)
    
    # ==========================================================================
    # COLLABORATIVE NOTES
    # ==========================================================================
    
    @classmethod
    def create_shared_note(
        cls,
        group_id: str,
        user,
        title: str,
        content: str,
        lesson_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Create a shared note in the study group.
        """
        from apps.study_groups.models import StudyGroup, SharedNote
        
        group = StudyGroup.objects.get(id=group_id)
        
        note = SharedNote.objects.create(
            study_group=group,
            created_by=user,
            title=title,
            content=content,
            lesson_id=lesson_id
        )
        
        return {
            'note_id': str(note.id),
            'title': note.title,
            'content': note.content,
            'created_by': user.username,
            'created_at': note.created_at.isoformat()
        }
    
    @classmethod
    def get_shared_notes(
        cls,
        group_id: str,
        lesson_id: Optional[str] = None,
        limit: int = 20
    ) -> List[Dict[str, Any]]:
        """
        Get shared notes for a study group.
        """
        from apps.study_groups.models import SharedNote
        
        query = SharedNote.objects.filter(study_group_id=group_id)
        
        if lesson_id:
            query = query.filter(lesson_id=lesson_id)
        
        notes = query.select_related('created_by').order_by('-created_at')[:limit]
        
        return [
            {
                'note_id': str(n.id),
                'title': n.title,
                'content': n.content[:500],  # Preview
                'created_by': n.created_by.username,
                'created_at': n.created_at.isoformat()
            }
            for n in notes
        ]
    
    @classmethod
    def update_note(
        cls,
        note_id: str,
        user,
        content: str
    ) -> Dict[str, Any]:
        """
        Update a shared note (collaborative editing).
        """
        from apps.study_groups.models import SharedNote, NoteEdit
        
        note = SharedNote.objects.get(id=note_id)
        
        # Save edit history
        NoteEdit.objects.create(
            note=note,
            edited_by=user,
            previous_content=note.content,
            new_content=content
        )
        
        note.content = content
        note.save()
        
        return {
            'note_id': str(note.id),
            'content': note.content,
            'updated_by': user.username,
            'updated_at': timezone.now().isoformat()
        }
    
    # ==========================================================================
    # STUDY SESSIONS
    # ==========================================================================
    
    @classmethod
    def create_study_session(
        cls,
        group_id: str,
        host,
        title: str,
        session_type: SessionType,
        scheduled_time: Optional[str] = None,
        duration_minutes: int = 60,
        course_id: Optional[str] = None,
        lesson_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Create a scheduled or instant study session.
        """
        from apps.study_groups.models import StudyGroup, StudySession as SessionModel
        
        group = StudyGroup.objects.get(id=group_id)
        
        if scheduled_time:
            start_time = timezone.datetime.fromisoformat(scheduled_time)
        else:
            start_time = timezone.now()
        
        end_time = start_time + timedelta(minutes=duration_minutes)
        
        session = SessionModel.objects.create(
            study_group=group,
            host=host,
            title=title,
            session_type=session_type.value,
            start_time=start_time,
            end_time=end_time,
            course_id=course_id,
            lesson_id=lesson_id
        )
        
        # Notify group members
        cls._notify_session_created(group, session)
        
        return {
            'session_id': str(session.id),
            'title': session.title,
            'session_type': session.session_type,
            'start_time': session.start_time.isoformat(),
            'end_time': session.end_time.isoformat(),
            'host': host.username
        }
    
    @classmethod
    def join_session(cls, session_id: str, user) -> Dict[str, Any]:
        """
        Join an active study session.
        """
        from apps.study_groups.models import StudySession, SessionParticipant
        
        session = StudySession.objects.get(id=session_id)
        
        participant, created = SessionParticipant.objects.get_or_create(
            session=session,
            user=user,
            defaults={'joined_at': timezone.now()}
        )
        
        if not created:
            participant.joined_at = timezone.now()
            participant.left_at = None
            participant.save()
        
        # Update presence
        cls.update_presence(
            user,
            str(session.study_group_id),
            PresenceStatus.STUDYING,
            f"In session: {session.title}"
        )
        
        return {
            'session_id': str(session.id),
            'joined': True,
            'participant_count': SessionParticipant.objects.filter(
                session=session,
                left_at__isnull=True
            ).count()
        }
    
    @classmethod
    def leave_session(cls, session_id: str, user) -> Dict[str, Any]:
        """
        Leave a study session.
        """
        from apps.study_groups.models import SessionParticipant
        
        try:
            participant = SessionParticipant.objects.get(
                session_id=session_id,
                user=user
            )
            participant.left_at = timezone.now()
            participant.save()
        except SessionParticipant.DoesNotExist:
            pass
        
        return {'left': True}
    
    @classmethod
    def get_active_sessions(cls, group_id: str) -> List[Dict[str, Any]]:
        """
        Get currently active study sessions for a group.
        """
        from apps.study_groups.models import StudySession, SessionParticipant
        
        now = timezone.now()
        
        sessions = StudySession.objects.filter(
            study_group_id=group_id,
            start_time__lte=now,
            end_time__gte=now
        ).select_related('host')
        
        result = []
        for session in sessions:
            participant_count = SessionParticipant.objects.filter(
                session=session,
                left_at__isnull=True
            ).count()
            
            result.append({
                'session_id': str(session.id),
                'title': session.title,
                'session_type': session.session_type,
                'host': session.host.username,
                'participant_count': participant_count,
                'start_time': session.start_time.isoformat(),
                'end_time': session.end_time.isoformat()
            })
        
        return result
    
    @classmethod
    def _notify_session_created(cls, group, session) -> None:
        """Notify group members about new session."""
        from apps.notifications.smart_notifications import (
            SmartNotificationService, 
            NotificationType,
            NotificationPriority
        )
        
        for member in group.members.all():
            if member != session.host:
                SmartNotificationService.create_notification(
                    user=member,
                    title=f"📚 New Study Session: {session.title}",
                    body=f"{session.host.first_name or session.host.username} started a session",
                    notification_type=NotificationType.SOCIAL,
                    priority=NotificationPriority.NORMAL,
                    action_url=f"/study-groups/{group.id}/sessions/{session.id}",
                    schedule_optimal=False
                )
    
    # ==========================================================================
    # GROUP CHALLENGES
    # ==========================================================================
    
    @classmethod
    def create_group_challenge(
        cls,
        group_id: str,
        creator,
        title: str,
        description: str,
        challenge_type: str,
        target_value: int,
        deadline_days: int = 7
    ) -> Dict[str, Any]:
        """
        Create a challenge for the study group.
        """
        from apps.study_groups.models import StudyGroup, GroupChallenge
        
        group = StudyGroup.objects.get(id=group_id)
        deadline = timezone.now() + timedelta(days=deadline_days)
        
        challenge = GroupChallenge.objects.create(
            study_group=group,
            created_by=creator,
            title=title,
            description=description,
            challenge_type=challenge_type,
            target_value=target_value,
            deadline=deadline
        )
        
        return {
            'challenge_id': str(challenge.id),
            'title': challenge.title,
            'description': challenge.description,
            'target_value': challenge.target_value,
            'deadline': challenge.deadline.isoformat()
        }
    
    @classmethod
    def get_challenge_leaderboard(cls, challenge_id: str) -> List[Dict[str, Any]]:
        """
        Get leaderboard for a group challenge.
        """
        from apps.study_groups.models import ChallengeProgress
        
        progress_list = ChallengeProgress.objects.filter(
            challenge_id=challenge_id
        ).select_related('user').order_by('-current_value')[:20]
        
        return [
            {
                'rank': idx + 1,
                'user': p.user.username,
                'avatar': p.user.avatar.url if hasattr(p.user, 'avatar') and p.user.avatar else None,
                'progress': p.current_value,
                'completed': p.is_completed
            }
            for idx, p in enumerate(progress_list)
        ]
    
    # ==========================================================================
    # GROUP ANALYTICS
    # ==========================================================================
    
    @classmethod
    def get_group_stats(cls, group_id: str) -> Dict[str, Any]:
        """
        Get comprehensive stats for a study group.
        """
        from apps.study_groups.models import (
            StudyGroup, SharedNote, StudySession, GroupChallenge
        )
        from apps.ai_engine.models import ActivityLog
        
        group = StudyGroup.objects.get(id=group_id)
        member_count = group.members.count()
        
        # Session stats
        total_sessions = StudySession.objects.filter(study_group=group).count()
        
        # Note stats
        total_notes = SharedNote.objects.filter(study_group=group).count()
        
        # Challenge stats
        active_challenges = GroupChallenge.objects.filter(
            study_group=group,
            deadline__gte=timezone.now()
        ).count()
        
        # Activity (last 7 days)
        week_ago = timezone.now() - timedelta(days=7)
        member_ids = list(group.members.values_list('id', flat=True))
        
        weekly_activity = ActivityLog.objects.filter(
            user_id__in=member_ids,
            created_at__gte=week_ago
        ).count()
        
        return {
            'group_id': str(group.id),
            'name': group.name,
            'member_count': member_count,
            'total_sessions': total_sessions,
            'total_notes': total_notes,
            'active_challenges': active_challenges,
            'weekly_activity': weekly_activity,
            'current_online': len(cls.get_group_presence(group_id))
        }


class CollaborativeLearning:
    """
    Real-time collaborative learning features.
    """
    
    @classmethod
    def sync_progress(
        cls,
        group_id: str,
        user,
        lesson_id: str,
        progress_data: Dict
    ) -> Dict[str, Any]:
        """
        Sync learning progress with group members.
        Enables "learning together" feature.
        """
        cache_key = f"group_progress:{group_id}:{lesson_id}"
        
        # Get current group progress
        group_progress = cache.get(cache_key, {})
        
        # Update user's progress
        group_progress[str(user.id)] = {
            'username': user.username,
            'progress': progress_data.get('progress', 0),
            'current_position': progress_data.get('current_position'),
            'last_updated': timezone.now().isoformat()
        }
        
        cache.set(cache_key, group_progress, timeout=1800)  # 30 min
        
        return {
            'synced': True,
            'group_progress': list(group_progress.values())
        }
    
    @classmethod
    def get_group_progress(
        cls,
        group_id: str,
        lesson_id: str
    ) -> Dict[str, Any]:
        """
        Get collective progress of group on a lesson.
        """
        cache_key = f"group_progress:{group_id}:{lesson_id}"
        group_progress = cache.get(cache_key, {})
        
        if not group_progress:
            return {'members': [], 'average_progress': 0}
        
        members = list(group_progress.values())
        avg_progress = sum(m['progress'] for m in members) / len(members)
        
        return {
            'members': members,
            'average_progress': round(avg_progress, 1),
            'total_studying': len(members)
        }

    # ==========================================================================
    # AI MODERATOR & ASSISTANT
    # ==========================================================================
    
    @classmethod
    def generate_discussion_topics(cls, group_id: str, context: str = "") -> List[str]:
        """
        Generate discussion starters using AI based on group context.
        """
        from apps.ai_engine.ai_client import AIClient
        
        # In a real scenario, fetch recent messages/study topics
        prompt = f"""
        Generate 3 engaging discussion questions for a study group.
        Context: {context or "General Computer Science and Coding"}
        Audience: Students learning together.
        Tone: Encouraging and thought-provoking.
        Return ONLY the questions list.
        """
        
        try:
            response = AIClient.generate_text(prompt)
            # Simple parsing assume line separated
            questions = [q.strip() for q in response.split('\n') if '?' in q]
            return questions[:3]
        except Exception as e:
            logger.error(f"AI Discussion Gen failed: {e}")
            return [
                "What was the most challenging technical concept you learned this week?",
                "Share a useful coding tip or shortcut you found recently.",
                "What represent your current learning goals?"
            ]

    @classmethod
    def analyze_group_health(cls, group_id: str) -> Dict[str, Any]:
        """
        Analyze group activity health using AI.
        """
        stats = cls.get_group_stats(group_id)
        
        health_score = 0
        if stats['weekly_activity'] > 10: health_score += 30
        if stats['total_sessions'] > 2: health_score += 30
        if stats['active_challenges'] > 0: health_score += 20
        if stats['current_online'] > 0: health_score += 20
        
        # AI Insight
        insight = "Group is highly active and engaged!" if health_score > 70 else "Consider scheduling a sync session to boost engagement."
        
        return {
            'health_score': health_score,
            'status': 'Healthy' if health_score > 50 else 'Needs Attention',
            'insight': insight
        }

"""
Real-Time WebSocket Consumers for Conductor Test Engine.
Provides:
1. ExamStationConsumer: Live exam attempt session, autosave streaming, heartbeat liveness, and proctoring telemetry.
2. ExamProctorConsumer: Live exam proctoring hub for instructors, incident alerts, time adjustments, and announcements.
"""

import logging
from datetime import datetime
from typing import Optional, Dict, Any

from channels.generic.websocket import AsyncJsonWebsocketConsumer
from channels.db import database_sync_to_async
from django.utils import timezone
from django.db.models import F

from .models import Test, TestAttempt, Question, Option, AttemptAnswer
from .services import TestSessionManager

logger = logging.getLogger(__name__)


class ExamStationConsumer(AsyncJsonWebsocketConsumer):
    """
    WebSocket consumer for active examinee test sessions.
    Path: ws/test/attempts/<attempt_id>/
    Features:
    - Liveness heartbeat & time synchronization
    - Zero-latency autosave streaming over WebSocket
    - Client proctoring telemetry auditing (tab switch, window blur, face detection)
    - Proctor real-time incident broadcast
    - Remote proctor action handling (warning, extra time, force-submit)
    """

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.attempt_id: Optional[str] = None
        self.test_id: Optional[str] = None
        self.attempt_group: Optional[str] = None
        self.proctor_group: Optional[str] = None
        self.user = None

    async def connect(self):
        self.user = self.scope.get('user')
        if not self.user or not self.user.is_authenticated:
            logger.warning("Rejecting unauthenticated connection to ExamStationConsumer")
            await self.close(code=4401)
            return

        self.attempt_id = self.scope['url_route']['kwargs'].get('attempt_id')
        if not self.attempt_id:
            await self.close(code=4400)
            return

        # Validate attempt ownership and active state
        attempt_data = await self._get_attempt_context(self.attempt_id, self.user.id)
        if not attempt_data:
            logger.warning(f"Attempt {self.attempt_id} not found or unauthorized for user {self.user.id}")
            await self.close(code=4403)
            return

        self.test_id = str(attempt_data['test_id'])
        self.attempt_group = f"test_attempt_{self.attempt_id}"
        self.proctor_group = f"test_proctor_{self.test_id}"

        # Join attempt channel group and proctor group
        await self.channel_layer.group_add(self.attempt_group, self.channel_name)

        await self.accept()

        # Send initial session handshake
        await self.send_json({
            "type": "connection_established",
            "attempt_id": self.attempt_id,
            "test_id": self.test_id,
            "status": attempt_data['status'],
            "time_remaining_seconds": attempt_data['time_remaining_seconds'],
            "server_time": timezone.now().isoformat(),
        })

        logger.info(f"User {self.user.id} connected to ExamStationConsumer for attempt {self.attempt_id}")

    async def disconnect(self, close_code):
        if self.attempt_group:
            await self.channel_layer.group_discard(self.attempt_group, self.channel_name)

        if self.attempt_id:
            await self._record_disconnect(self.attempt_id)

        logger.info(f"ExamStationConsumer disconnected for attempt {self.attempt_id} (code: {close_code})")

    async def receive_json(self, content: Dict[str, Any], **kwargs):
        event_type = content.get('type')

        if event_type == 'heartbeat':
            await self._handle_heartbeat(content)
        elif event_type == 'autosave':
            await self._handle_autosave(content)
        elif event_type == 'telemetry_event':
            await self._handle_telemetry_event(content)
        elif event_type == 'ping':
            await self.send_json({"type": "pong", "server_time": timezone.now().isoformat()})
        else:
            await self.send_json({
                "type": "error",
                "message": f"Unrecognized event type: {event_type}",
            })

    async def _handle_heartbeat(self, content: Dict[str, Any]):
        """Processes client heartbeat, tracks activity timestamp and verifies timeout."""
        attempt_status = await self._update_heartbeat(self.attempt_id)
        if not attempt_status:
            await self.send_json({"type": "error", "message": "Attempt not found"})
            return

        if attempt_status['is_timed_out']:
            await self.send_json({
                "type": "test_timed_out",
                "attempt_id": self.attempt_id,
                "message": "Time limit has expired. Attempt auto-submitted.",
            })
            await self.close(code=4408)
            return

        await self.send_json({
            "type": "heartbeat_ack",
            "timestamp": timezone.now().isoformat(),
            "time_remaining_seconds": attempt_status['time_remaining_seconds'],
            "status": attempt_status['status'],
        })

    async def _handle_autosave(self, content: Dict[str, Any]):
        """Real-time autosave over WebSocket."""
        question_id = content.get('question_id')
        answer_data = content.get('answer_data', {})

        if not question_id:
            await self.send_json({"type": "autosave_error", "message": "question_id required"})
            return

        save_res = await self._persist_autosave(self.attempt_id, question_id, answer_data)
        if save_res.get('success'):
            await self.send_json({
                "type": "autosave_ack",
                "question_id": question_id,
                "status": "saved",
                "timestamp": timezone.now().isoformat(),
            })
        else:
            await self.send_json({
                "type": "autosave_error",
                "question_id": question_id,
                "message": save_res.get('error', 'Autosave failed'),
            })

    async def _handle_telemetry_event(self, content: Dict[str, Any]):
        """Ingests client proctoring telemetry incident and alerts proctor channel."""
        event_name = content.get('event_name') or content.get('event_type', 'unknown')
        severity = content.get('severity', 'low')
        details = content.get('details', {})

        # Record incident in attempt audit trail
        incident_record = await self._record_proctoring_incident(
            self.attempt_id, event_name, severity, details
        )

        await self.send_json({
            "type": "telemetry_ack",
            "event_name": event_name,
            "recorded_at": timezone.now().isoformat(),
        })

        # Broadcast real-time alert to proctors monitoring this test
        if self.proctor_group:
            candidate_name = getattr(self.user, 'get_full_name', None) and self.user.get_full_name() or self.user.username
            await self.channel_layer.group_send(
                self.proctor_group,
                {
                    "type": "proctor_incident_alert",
                    "attempt_id": self.attempt_id,
                    "student_id": str(self.user.id),
                    "student_name": candidate_name,
                    "event_name": event_name,
                    "severity": severity,
                    "details": details,
                    "timestamp": timezone.now().isoformat(),
                }
            )

    # Handlers for messages broadcast from proctor
    async def proctor_warning(self, event):
        """Receive warning issued by an exam proctor."""
        await self.send_json({
            "type": "proctor_warning",
            "message": event.get("message", "A proctoring integrity warning was issued."),
            "severity": event.get("severity", "medium"),
            "issued_at": event.get("timestamp", timezone.now().isoformat()),
        })

    async def proctor_time_extension(self, event):
        """Receive extra time granted by an exam proctor."""
        seconds_added = event.get("seconds_added", 0)
        await self.send_json({
            "type": "proctor_time_extension",
            "seconds_added": seconds_added,
            "new_time_remaining": event.get("new_time_remaining"),
            "message": event.get("message", f"{seconds_added // 60} minutes added to your test."),
        })

    async def proctor_force_submit(self, event):
        """Receive force-submit command from exam proctor."""
        await self.send_json({
            "type": "proctor_force_submit",
            "reason": event.get("reason", "Proctor terminated exam session."),
        })
        await self.close(code=4409)

    # Database helpers wrapped in database_sync_to_async
    @database_sync_to_async
    def _get_attempt_context(self, attempt_id: str, user_id: str) -> Optional[Dict[str, Any]]:
        try:
            attempt = TestAttempt.objects.select_related('test').get(id=attempt_id)
            if str(attempt.user_id) != str(user_id) and not getattr(self.user, 'is_staff', False):
                return None
            return {
                'id': str(attempt.id),
                'test_id': str(attempt.test_id),
                'status': attempt.status,
                'time_remaining_seconds': attempt.time_remaining_seconds,
            }
        except TestAttempt.DoesNotExist:
            return None

    @database_sync_to_async
    def _update_heartbeat(self, attempt_id: str) -> Optional[Dict[str, Any]]:
        try:
            attempt = TestAttempt.objects.select_related('test').get(id=attempt_id)
            now = timezone.now()
            attempt.last_activity_at = now
            attempt.save(update_fields=['last_activity_at'])

            is_timed_out = attempt.is_timed_out
            if is_timed_out and attempt.status == 'in_progress':
                TestSessionManager.check_timeout(attempt)
                attempt.refresh_from_db()

            return {
                'status': attempt.status,
                'is_timed_out': is_timed_out,
                'time_remaining_seconds': attempt.time_remaining_seconds,
            }
        except TestAttempt.DoesNotExist:
            return None

    @database_sync_to_async
    def _record_disconnect(self, attempt_id: str):
        try:
            TestAttempt.objects.filter(id=attempt_id).update(last_activity_at=timezone.now())
        except Exception:
            pass

    @database_sync_to_async
    def _persist_autosave(self, attempt_id: str, question_id: str, answer_data: Dict[str, Any]) -> Dict[str, Any]:
        try:
            attempt = TestAttempt.objects.select_related('test').get(id=attempt_id)
            if attempt.status != 'in_progress':
                return {'success': False, 'error': f"Attempt is not in progress (status: {attempt.status})"}

            TestSessionManager.autosave_answer(attempt, question_id, answer_data)
            return {'success': True}
        except Exception as e:
            logger.warning(f"ExamStation WebSocket autosave failed: {e}")
            return {'success': False, 'error': str(e)}

    @database_sync_to_async
    def _record_proctoring_incident(self, attempt_id: str, event_name: str, severity: str, details: Dict[str, Any]):
        try:
            attempt = TestAttempt.objects.get(id=attempt_id)
            meta = attempt.metadata or {}
            incidents = meta.get('proctoring_incidents', [])
            incident = {
                'event_name': event_name,
                'severity': severity,
                'details': details,
                'timestamp': timezone.now().isoformat(),
            }
            incidents.append(incident)
            meta['proctoring_incidents'] = incidents
            attempt.metadata = meta
            attempt.save(update_fields=['metadata'])
            return incident
        except Exception as e:
            logger.warning(f"Failed to record proctoring incident on attempt {attempt_id}: {e}")
            return None


class ExamProctorConsumer(AsyncJsonWebsocketConsumer):
    """
    WebSocket consumer for Exam Proctors & Instructors.
    Path: ws/test/proctor/<test_id>/
    Features:
    - Real-time candidate incident feed
    - Candidate warning broadcasting
    - Remote time adjustment
    - Force-submission of compromised candidate sessions
    """

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.test_id: Optional[str] = None
        self.proctor_group: Optional[str] = None
        self.user = None

    async def connect(self):
        self.user = self.scope.get('user')
        if not self.user or not self.user.is_authenticated:
            await self.close(code=4401)
            return

        is_authorized = await self._is_authorized_proctor(self.user)
        if not is_authorized:
            logger.warning(f"Unauthorized proctor access attempt by user {self.user.id}")
            await self.close(code=4403)
            return

        self.test_id = self.scope['url_route']['kwargs'].get('test_id')
        if not self.test_id:
            await self.close(code=4400)
            return

        self.proctor_group = f"test_proctor_{self.test_id}"
        await self.channel_layer.group_add(self.proctor_group, self.channel_name)

        await self.accept()

        stats = await self._get_active_test_stats(self.test_id)
        await self.send_json({
            "type": "proctor_connected",
            "test_id": self.test_id,
            "proctor_name": self.user.username,
            "active_candidates": stats['in_progress_count'],
            "server_time": timezone.now().isoformat(),
        })

        logger.info(f"Proctor {self.user.id} connected to test {self.test_id}")

    async def disconnect(self, close_code):
        if self.proctor_group:
            await self.channel_layer.group_discard(self.proctor_group, self.channel_name)

    async def receive_json(self, content: Dict[str, Any], **kwargs):
        action = content.get('action')

        if action == 'issue_warning':
            attempt_id = content.get('attempt_id')
            message = content.get('message', 'Warning: suspicious activity detected.')
            if attempt_id:
                attempt_group = f"test_attempt_{attempt_id}"
                await self.channel_layer.group_send(
                    attempt_group,
                    {
                        "type": "proctor_warning",
                        "message": message,
                        "severity": content.get("severity", "high"),
                        "timestamp": timezone.now().isoformat(),
                    }
                )
                await self.send_json({"type": "action_ack", "action": "issue_warning", "status": "delivered"})

        elif action == 'add_time':
            attempt_id = content.get('attempt_id')
            seconds = int(content.get('seconds', 300))
            if attempt_id:
                new_remaining = await self._extend_attempt_time(attempt_id, seconds)
                attempt_group = f"test_attempt_{attempt_id}"
                await self.channel_layer.group_send(
                    attempt_group,
                    {
                        "type": "proctor_time_extension",
                        "seconds_added": seconds,
                        "new_time_remaining": new_remaining,
                        "timestamp": timezone.now().isoformat(),
                    }
                )
                await self.send_json({"type": "action_ack", "action": "add_time", "status": "extended"})

        elif action == 'force_submit':
            attempt_id = content.get('attempt_id')
            reason = content.get('reason', 'Exam terminated by proctor.')
            if attempt_id:
                await self._force_submit_attempt(attempt_id)
                attempt_group = f"test_attempt_{attempt_id}"
                await self.channel_layer.group_send(
                    attempt_group,
                    {
                        "type": "proctor_force_submit",
                        "reason": reason,
                    }
                )
                await self.send_json({"type": "action_ack", "action": "force_submit", "status": "submitted"})

        elif action == 'ping':
            await self.send_json({"type": "pong"})

    # Group message handler: receives alerts sent from ExamStationConsumer
    async def proctor_incident_alert(self, event: Dict[str, Any]):
        await self.send_json({
            "type": "candidate_incident",
            "attempt_id": event.get("attempt_id"),
            "student_id": event.get("student_id"),
            "student_name": event.get("student_name"),
            "event_name": event.get("event_name"),
            "severity": event.get("severity"),
            "details": event.get("details"),
            "timestamp": event.get("timestamp"),
        })

    @database_sync_to_async
    def _is_authorized_proctor(self, user) -> bool:
        return getattr(user, 'is_staff', False) or getattr(user, 'is_superuser', False) or getattr(user, 'role', '') in ('instructor', 'admin', 'proctor')

    @database_sync_to_async
    def _get_active_test_stats(self, test_id: str) -> Dict[str, Any]:
        count = TestAttempt.objects.filter(test_id=test_id, status='in_progress').count()
        return {'in_progress_count': count}

    @database_sync_to_async
    def _extend_attempt_time(self, attempt_id: str, extra_seconds: int) -> int:
        try:
            attempt = TestAttempt.objects.select_related('test').get(id=attempt_id)
            meta = attempt.metadata or {}
            current_ext = meta.get('time_extension_seconds', 0)
            meta['time_extension_seconds'] = current_ext + extra_seconds
            attempt.metadata = meta
            attempt.save(update_fields=['metadata'])
            return attempt.time_remaining_seconds + extra_seconds
        except Exception:
            return 0

    @database_sync_to_async
    def _force_submit_attempt(self, attempt_id: str):
        try:
            TestSessionManager.submit_attempt(attempt_id)
        except Exception as e:
            logger.warning(f"Force submit failed for {attempt_id}: {e}")

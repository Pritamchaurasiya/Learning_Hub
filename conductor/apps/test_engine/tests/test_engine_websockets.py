"""
WebSocket and Real-Time Proctoring Tests for Conductor Test Engine.
Validates:
1. ExamStationConsumer session handshake, ping/pong, heartbeat, autosave, and telemetry.
2. ExamProctorConsumer proctor authorization, candidate monitoring, and warning broadcast.
3. Tamper-evident scorecard audit digest and verification.
"""

import uuid
from channels.testing import WebsocketCommunicator
from django.test import TransactionTestCase
from django.utils import timezone
from django.contrib.auth import get_user_model

from apps.exams.models import Country, Exam, Subject, Topic
from apps.test_engine.models import (
    Question,
    Option,
    Test as TestModel,
    TestQuestion,
    TestAttempt,
)
from apps.test_engine.services import TestSessionManager
from apps.test_engine.consumers import ExamStationConsumer, ExamProctorConsumer


class TestEngineWebSocketTests(TransactionTestCase):
    def setUp(self):
        User = get_user_model()
        self.user = User.objects.create_user(email='examinee@example.com', password='pass1234')
        self.proctor_user = User.objects.create_user(
            email='proctor@example.com',
            password='pass1234',
            is_staff=True
        )

        self.country = Country.objects.create(code='IN', name='India')
        self.exam = Exam.objects.create(country=self.country, code='JEE-ADV', name='JEE Advanced', pattern={'total_marks': 100})
        self.subject = Subject.objects.create(exam=self.exam, code='MATH', name='Mathematics')
        self.topic = Topic.objects.create(subject=self.subject, name='Calculus')

        self.test = TestModel.objects.create(
            exam=self.exam,
            title='Real-Time Proctored Grand Mock',
            mode='mock',
            time_limit_minutes=45,
            is_published=True,
            total_marks=4
        )
        self.question = Question.objects.create(
            topic=self.topic,
            text='Evaluate limit as x approaches 0 of sin(x)/x.',
            question_type='mcq',
            explanation='Standard limit equals 1.'
        )
        self.option1 = Option.objects.create(question=self.question, text='0', is_correct=False, order=1)
        self.option2 = Option.objects.create(question=self.question, text='1', is_correct=True, order=2)
        self.tq = TestQuestion.objects.create(test=self.test, question=self.question, order=1, marks=4)

        self.attempt = TestSessionManager.start_attempt(user=self.user, test_id=self.test.id, mode='mock')

    async def test_station_unauthenticated_rejected(self):
        """Unauthenticated clients must receive 4401 closure."""
        communicator = WebsocketCommunicator(
            ExamStationConsumer.as_asgi(),
            f"/ws/test/attempts/{self.attempt.id}/"
        )
        communicator.scope['user'] = None
        communicator.scope['url_route'] = {'kwargs': {'attempt_id': str(self.attempt.id)}}

        connected, close_code = await communicator.connect()
        self.assertFalse(connected)
        self.assertEqual(close_code, 4401)

    async def test_station_connected_and_ping_pong(self):
        """Authenticated student receives connection handshake and pong on ping."""
        communicator = WebsocketCommunicator(
            ExamStationConsumer.as_asgi(),
            f"/ws/test/attempts/{self.attempt.id}/"
        )
        communicator.scope['user'] = self.user
        communicator.scope['url_route'] = {'kwargs': {'attempt_id': str(self.attempt.id)}}

        connected, _ = await communicator.connect()
        self.assertTrue(connected)

        # 1. Verify handshake
        handshake = await communicator.receive_json_from()
        self.assertEqual(handshake['type'], 'connection_established')
        self.assertEqual(handshake['attempt_id'], str(self.attempt.id))
        self.assertEqual(handshake['test_id'], str(self.test.id))

        # 2. Ping-pong
        await communicator.send_json_to({'type': 'ping'})
        pong = await communicator.receive_json_from()
        self.assertEqual(pong['type'], 'pong')

        await communicator.disconnect()

    async def test_station_heartbeat_and_autosave(self):
        """Heartbeat tracks liveness and autosave persists answer over WebSocket."""
        communicator = WebsocketCommunicator(
            ExamStationConsumer.as_asgi(),
            f"/ws/test/attempts/{self.attempt.id}/"
        )
        communicator.scope['user'] = self.user
        communicator.scope['url_route'] = {'kwargs': {'attempt_id': str(self.attempt.id)}}

        connected, _ = await communicator.connect()
        self.assertTrue(connected)
        await communicator.receive_json_from()  # consume handshake

        # Heartbeat
        await communicator.send_json_to({'type': 'heartbeat'})
        hb_ack = await communicator.receive_json_from()
        self.assertEqual(hb_ack['type'], 'heartbeat_ack')
        self.assertGreater(hb_ack['time_remaining_seconds'], 0)

        # Autosave
        await communicator.send_json_to({
            'type': 'autosave',
            'question_id': str(self.question.id),
            'answer_data': {
                'selected_options': [str(self.option2.id)],
                'time_spent': 15
            }
        })
        save_ack = await communicator.receive_json_from()
        self.assertEqual(save_ack['type'], 'autosave_ack')
        self.assertEqual(save_ack['question_id'], str(self.question.id))

        await communicator.disconnect()

    async def test_station_telemetry_event_audit(self):
        """Proctoring telemetry events are acknowledged and recorded."""
        communicator = WebsocketCommunicator(
            ExamStationConsumer.as_asgi(),
            f"/ws/test/attempts/{self.attempt.id}/"
        )
        communicator.scope['user'] = self.user
        communicator.scope['url_route'] = {'kwargs': {'attempt_id': str(self.attempt.id)}}

        connected, _ = await communicator.connect()
        self.assertTrue(connected)
        await communicator.receive_json_from()  # consume handshake

        await communicator.send_json_to({
            'type': 'telemetry_event',
            'event_name': 'tab_switch',
            'severity': 'medium',
            'details': {'blur_duration_seconds': 4.2}
        })
        ack = await communicator.receive_json_from()
        self.assertEqual(ack['type'], 'telemetry_ack')
        self.assertEqual(ack['event_name'], 'tab_switch')

        await communicator.disconnect()

    async def test_proctor_unauthorized_rejected(self):
        """Non-staff students cannot join the proctor control room."""
        communicator = WebsocketCommunicator(
            ExamProctorConsumer.as_asgi(),
            f"/ws/test/proctor/{self.test.id}/"
        )
        communicator.scope['user'] = self.user  # student, not staff
        communicator.scope['url_route'] = {'kwargs': {'test_id': str(self.test.id)}}

        connected, close_code = await communicator.connect()
        self.assertFalse(connected)
        self.assertEqual(close_code, 4403)

    async def test_proctor_connected_and_ping(self):
        """Staff proctor can connect to proctor room and receive active candidate count."""
        communicator = WebsocketCommunicator(
            ExamProctorConsumer.as_asgi(),
            f"/ws/test/proctor/{self.test.id}/"
        )
        communicator.scope['user'] = self.proctor_user
        communicator.scope['url_route'] = {'kwargs': {'test_id': str(self.test.id)}}

        connected, _ = await communicator.connect()
        self.assertTrue(connected)

        msg = await communicator.receive_json_from()
        self.assertEqual(msg['type'], 'proctor_connected')
        self.assertEqual(msg['test_id'], str(self.test.id))
        self.assertGreaterEqual(msg['active_candidates'], 1)

        # Ping
        await communicator.send_json_to({'action': 'ping'})
        pong = await communicator.receive_json_from()
        self.assertEqual(pong['type'], 'pong')

        await communicator.disconnect()

    def test_scorecard_audit_digest_and_verification(self):
        """Tamper-evident audit digest calculation and verification."""
        timestamp = timezone.now().isoformat()
        digest = TestSessionManager.compute_scorecard_audit_digest(
            attempt_id=str(self.attempt.id),
            score=4.0,
            percentage=100.0,
            timestamp=timestamp
        )
        self.assertTrue(digest.startswith('LH-'))
        self.assertEqual(len(digest.split('-')), 5)

        # Verification with the correct attempt
        self.attempt.metadata = {'verification_code': digest}
        self.attempt.score = 4.0
        self.attempt.percentage = 100.0
        self.attempt.status = 'submitted'
        self.attempt.submitted_at = timezone.now()
        self.attempt.save()

        verify_res = TestSessionManager.verify_scorecard(code=digest, attempt_id=str(self.attempt.id))
        self.assertTrue(verify_res['valid'])
        self.assertEqual(verify_res['status'], 'AUTHENTIC_VERIFIED')

        # Tampered code rejection
        tampered = digest[:-2] + 'ZZ'
        verify_tampered = TestSessionManager.verify_scorecard(code=tampered)
        self.assertFalse(verify_tampered['valid'])

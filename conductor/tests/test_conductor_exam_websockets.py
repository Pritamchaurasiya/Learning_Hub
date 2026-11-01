"""
Unit and integration tests for Exam Station and Proctor WebSocket Consumers.
Tests real-time heartbeat liveness, autosave streaming, proctoring telemetry audit,
and proctor control actions using Channels' WebsocketCommunicator.
"""

import pytest
from channels.testing import WebsocketCommunicator
from django.contrib.auth import get_user_model
from django.utils import timezone

from apps.exams.models import Country, Exam, Subject, Topic
from apps.test_engine.models import (
    Test,
    Question,
    Option,
    TestQuestion,
    TestAttempt,
    AttemptAnswer,
)
from apps.test_engine.consumers import ExamStationConsumer, ExamProctorConsumer

User = get_user_model()


@pytest.fixture
def exam_battery(db):
    country, _ = Country.objects.get_or_create(code="IN", defaults={"name": "India"})
    exam = Exam.objects.create(
        name="Realtime Exam Station Suite",
        code="RT_EXAM_01",
        country=country,
        pattern={"total_questions": 2, "duration_minutes": 25},
        is_active=True,
    )
    subject = Subject.objects.create(
        exam=exam, name="Mathematics", code="MATH_RT", is_active=True
    )
    topic = Topic.objects.create(subject=subject, name="Algebra", is_active=True)

    test = Test.objects.create(
        exam=exam,
        title="Realtime Algebra Station Test",
        mode="mock",
        time_limit_minutes=25,
        passing_score=50,
        total_marks=4,
        marks_per_correct=2,
        is_published=True,
    )

    q1 = Question.objects.create(
        topic=topic,
        text="Solve 2x + 4 = 10",
        question_type="mcq",
        difficulty=0.2,
        discrimination=1.1,
    )
    opt1_c = Option.objects.create(question=q1, text="x = 3", is_correct=True, order=1)
    opt1_w = Option.objects.create(question=q1, text="x = 2", is_correct=False, order=2)
    TestQuestion.objects.create(test=test, question=q1, order=1, marks=2)

    student = User.objects.create_user(
        username="rt_student",
        email="rt_student@learninghub.app",
        password="TestPassword123!",
    )

    instructor = User.objects.create_user(
        username="rt_proctor",
        email="rt_proctor@learninghub.app",
        password="TestPassword123!",
        is_staff=True,
    )

    attempt = TestAttempt.objects.create(
        user=student,
        test=test,
        session_token="session-rt-101",
        status="in_progress",
        mode="mock",
        total_marks=4,
        attempt_number=1,
    )

    return {
        "test": test,
        "question": q1,
        "opt_correct": opt1_c,
        "student": student,
        "instructor": instructor,
        "attempt": attempt,
    }


@pytest.mark.asyncio
@pytest.mark.django_db(transaction=True)
async def test_exam_station_unauthenticated_rejection(exam_battery):
    attempt = exam_battery["attempt"]
    # Scope without user
    communicator = WebsocketCommunicator(
        ExamStationConsumer.as_asgi(), f"/ws/test/attempts/{attempt.id}/"
    )
    communicator.scope["url_route"] = {"kwargs": {"attempt_id": str(attempt.id)}}

    connected, close_code = await communicator.connect()
    assert not connected or close_code == 4401
    await communicator.disconnect()


@pytest.mark.asyncio
@pytest.mark.django_db(transaction=True)
async def test_exam_station_connect_and_heartbeat(exam_battery):
    student = exam_battery["student"]
    attempt = exam_battery["attempt"]

    communicator = WebsocketCommunicator(
        ExamStationConsumer.as_asgi(), f"/ws/test/attempts/{attempt.id}/"
    )
    communicator.scope["user"] = student
    communicator.scope["url_route"] = {"kwargs": {"attempt_id": str(attempt.id)}}

    connected, subprotocol = await communicator.connect()
    assert connected

    # Receive initial connection handshake
    handshake = await communicator.receive_json_from()
    assert handshake["type"] == "connection_established"
    assert handshake["attempt_id"] == str(attempt.id)
    assert handshake["status"] == "in_progress"

    # Send heartbeat
    await communicator.send_json_to({"type": "heartbeat"})
    ack = await communicator.receive_json_from()
    assert ack["type"] == "heartbeat_ack"
    assert "time_remaining_seconds" in ack

    await communicator.disconnect()


@pytest.mark.asyncio
@pytest.mark.django_db(transaction=True)
async def test_exam_station_autosave_and_telemetry(exam_battery):
    student = exam_battery["student"]
    attempt = exam_battery["attempt"]
    question = exam_battery["question"]
    opt_c = exam_battery["opt_correct"]

    communicator = WebsocketCommunicator(
        ExamStationConsumer.as_asgi(), f"/ws/test/attempts/{attempt.id}/"
    )
    communicator.scope["user"] = student
    communicator.scope["url_route"] = {"kwargs": {"attempt_id": str(attempt.id)}}

    connected, _ = await communicator.connect()
    assert connected
    await communicator.receive_json_from()  # Handshake

    # 1. Autosave over WebSocket
    await communicator.send_json_to(
        {
            "type": "autosave",
            "question_id": str(question.id),
            "answer_data": {
                "selected_options": [str(opt_c.id)],
                "time_spent": 18,
            },
        }
    )
    save_ack = await communicator.receive_json_from()
    assert save_ack["type"] == "autosave_ack"
    assert save_ack["status"] == "saved"

    # 2. Telemetry incident over WebSocket
    await communicator.send_json_to(
        {
            "type": "telemetry_event",
            "event_name": "tab_switch",
            "severity": "medium",
            "details": {"switch_count": 1, "duration_ms": 1200},
        }
    )
    telem_ack = await communicator.receive_json_from()
    assert telem_ack["type"] == "telemetry_ack"
    assert telem_ack["event_name"] == "tab_switch"

    await communicator.disconnect()


@pytest.mark.asyncio
@pytest.mark.django_db(transaction=True)
async def test_proctor_consumer_and_interventions(exam_battery):
    student = exam_battery["student"]
    instructor = exam_battery["instructor"]
    test = exam_battery["test"]
    attempt = exam_battery["attempt"]

    # 1. Connect student communicator
    student_comm = WebsocketCommunicator(
        ExamStationConsumer.as_asgi(), f"/ws/test/attempts/{attempt.id}/"
    )
    student_comm.scope["user"] = student
    student_comm.scope["url_route"] = {"kwargs": {"attempt_id": str(attempt.id)}}
    connected_student, _ = await student_comm.connect()
    assert connected_student
    await student_comm.receive_json_from()  # Handshake

    # 2. Connect proctor communicator
    proctor_comm = WebsocketCommunicator(
        ExamProctorConsumer.as_asgi(), f"/ws/test/proctor/{test.id}/"
    )
    proctor_comm.scope["user"] = instructor
    proctor_comm.scope["url_route"] = {"kwargs": {"test_id": str(test.id)}}
    connected_proctor, _ = await proctor_comm.connect()
    assert connected_proctor
    proctor_welcome = await proctor_comm.receive_json_from()
    assert proctor_welcome["type"] == "proctor_connected"

    # 3. Proctor issues warning to student
    await proctor_comm.send_json_to(
        {
            "action": "issue_warning",
            "attempt_id": str(attempt.id),
            "message": "Warning: Please return to full screen immediately.",
        }
    )
    action_ack = await proctor_comm.receive_json_from()
    assert action_ack["status"] == "delivered"

    # 4. Student receives warning message in real-time
    warning_msg = await student_comm.receive_json_from()
    assert warning_msg["type"] == "proctor_warning"
    assert "full screen" in warning_msg["message"]

    # 5. Proctor grants extra time
    await proctor_comm.send_json_to(
        {
            "action": "add_time",
            "attempt_id": str(attempt.id),
            "seconds": 180,
        }
    )
    time_ack = await proctor_comm.receive_json_from()
    assert time_ack["status"] == "extended"

    # 6. Student receives time extension
    ext_msg = await student_comm.receive_json_from()
    assert ext_msg["type"] == "proctor_time_extension"
    assert ext_msg["seconds_added"] == 180

    await student_comm.disconnect()
    await proctor_comm.disconnect()

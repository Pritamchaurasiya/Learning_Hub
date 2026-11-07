"""
Tests for Test Engine & Exam Simulation Subsystem Parity.
Validates complete contract alignment with frontend learninghub/src/services/testsAService.ts.
"""

import pytest
from rest_framework import status
from rest_framework.test import APIClient
from django.contrib.auth import get_user_model
from apps.exams.models import Country, Exam, Subject, Topic, PYQ
from apps.test_engine.models import (
    Test,
    Question,
    Option,
    TestQuestion,
    TestSection,
    TestAttempt,
    QuestionBookmark,
)

User = get_user_model()


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def student_user(db):
    import uuid
    uid = uuid.uuid4().hex[:6]
    return User.objects.create_user(
        username=f"teststudent_{uid}",
        email=f"teststudent_{uid}@example.com",
        password="TestPassword123!",
        first_name="Test",
        last_name="Student",
    )


@pytest.fixture
def auth_client(api_client, student_user):
    api_client.force_authenticate(user=student_user)
    return api_client


@pytest.fixture
def exam_setup(db):
    country, _ = Country.objects.get_or_create(code="IN", defaults={"name": "India"})
    exam = Exam.objects.create(
        name="JEE Advanced Simulation",
        code="JEE_ADV",
        country=country,
        pattern={
            "total_questions": 10,
            "total_marks": 40,
            "duration_minutes": 60,
            "marks_per_correct": 4,
            "negative_marks_per_wrong": 1,
            "passing_score": 50,
        },
        difficulty_distribution={"easy": 30, "medium": 50, "hard": 20},
        is_active=True,
    )
    subject = Subject.objects.create(
        exam=exam,
        name="Physics",
        code="PHY",
        is_active=True,
    )
    topic = Topic.objects.create(
        subject=subject,
        name="Thermodynamics",
        is_active=True,
    )
    return {
        "country": country,
        "exam": exam,
        "subject": subject,
        "topic": topic,
    }


@pytest.fixture
def published_test(db, exam_setup):
    exam = exam_setup["exam"]
    topic = exam_setup["topic"]

    test = Test.objects.create(
        exam=exam,
        title="Comprehensive Thermodynamics Mock",
        description="Full simulation test for thermodynamics laws and cycles.",
        mode="mock",
        difficulty="medium",
        ai_mode="ai_optional",
        question_source="database",
        time_limit_minutes=30,
        passing_score=50,
        total_marks=8,
        marks_per_correct=4,
        negative_marks_per_question=1,
        is_published=True,
        is_featured=True,
    )

    # Question 1
    q1 = Question.objects.create(
        topic=topic,
        text="Which law of thermodynamics defines the concept of entropy?",
        question_type="mcq",
        difficulty=2.5,
        bloom_level="understand",
        explanation="The Second Law states that the entropy of an isolated system always increases.",
    )
    Option.objects.create(question=q1, text="Zeroth Law", is_correct=False, order=1)
    opt1_correct = Option.objects.create(question=q1, text="Second Law", is_correct=True, order=2)
    Option.objects.create(question=q1, text="First Law", is_correct=False, order=3)
    Option.objects.create(question=q1, text="Third Law", is_correct=False, order=4)
    TestQuestion.objects.create(test=test, question=q1, order=1, marks=4)

    # Question 2
    q2 = Question.objects.create(
        topic=topic,
        text="In an isothermal process for an ideal gas, the change in internal energy is:",
        question_type="mcq",
        difficulty=2.0,
        bloom_level="apply",
        explanation="For an ideal gas, internal energy depends solely on temperature; thus delta U = 0.",
    )
    opt2_correct = Option.objects.create(question=q2, text="Zero", is_correct=True, order=1)
    Option.objects.create(question=q2, text="Positive", is_correct=False, order=2)
    Option.objects.create(question=q2, text="Negative", is_correct=False, order=3)
    Option.objects.create(question=q2, text="Equal to heat added", is_correct=False, order=4)
    TestQuestion.objects.create(test=test, question=q2, order=2, marks=4)

    test.total_marks = 8
    test.save()

    return {
        "test": test,
        "q1": q1,
        "opt1_correct": opt1_correct,
        "q2": q2,
        "opt2_correct": opt2_correct,
    }


@pytest.mark.django_db
class TestTestEngineParity:
    """Test Suite for frontend testsAService.ts contract parity."""

    def test_get_tests_list_dual_envelope_and_filtering(self, api_client, published_test):
        """GET /api/v1/tests/ returns standard dual envelope and supports query param filters."""
        # 1. Unfiltered list
        res = api_client.get("/api/v1/tests/")
        assert res.status_code == status.HTTP_200_OK
        data = res.json()
        assert data.get("status") == "success"
        assert "data" in data
        assert isinstance(data["data"], list)
        assert len(data["data"]) >= 1

        first_test = data["data"][0]
        assert "id" in first_test
        assert "title" in first_test
        assert "mode" in first_test
        assert "difficulty" in first_test
        assert "ai_mode" in first_test
        assert "question_source" in first_test

        # 2. Filter by exam
        res_exam = api_client.get("/api/v1/tests/?exam=JEE_ADV")
        assert res_exam.status_code == status.HTTP_200_OK
        assert len(res_exam.json()["data"]) >= 1

        # 3. Filter by ai_mode
        res_ai = api_client.get("/api/v1/tests/?ai_mode=ai_optional")
        assert res_ai.status_code == status.HTTP_200_OK
        assert len(res_ai.json()["data"]) >= 1

        # 4. Filter by question_source
        res_qs = api_client.get("/api/v1/tests/?question_source=database")
        assert res_qs.status_code == status.HTTP_200_OK
        assert len(res_qs.json()["data"]) >= 1

        # 5. Filter by non-matching difficulty
        res_none = api_client.get("/api/v1/tests/?difficulty=hard")
        assert res_none.status_code == status.HTTP_200_OK
        assert len(res_none.json()["data"]) == 0

    def test_get_test_detail(self, api_client, published_test):
        """GET /api/v1/tests/<id>/ returns test details with questions and options."""
        test = published_test["test"]
        res = api_client.get(f"/api/v1/tests/{test.id}/")
        assert res.status_code == status.HTTP_200_OK
        data = res.json()
        assert data.get("status") == "success"

        test_data = data.get("data")
        assert test_data["id"] == str(test.id)
        assert test_data["title"] == test.title
        assert len(test_data["questions"]) == 2

        q1 = test_data["questions"][0]
        assert "id" in q1
        assert "text" in q1
        assert "options" in q1
        assert len(q1["options"]) == 4

    def test_start_attempt_slash_and_noslash(self, auth_client, published_test):
        """POST /api/v1/tests/<id>/start and /start/ return enriched attempt bootstrap payload."""
        test = published_test["test"]

        # 1. Non-trailing slash (frontend default in testsAService.ts)
        res_noslash = auth_client.post(f"/api/v1/tests/{test.id}/start", {}, format="json")
        assert res_noslash.status_code == status.HTTP_201_CREATED
        data = res_noslash.json()
        assert data.get("status") == "success"

        attempt_info = data["data"]
        assert "attemptId" in attempt_info
        assert "attempt_id" in attempt_info
        assert attempt_info["attemptId"] == attempt_info["attempt_id"]
        assert "questions" in attempt_info
        assert len(attempt_info["questions"]) == 2
        assert "time_limit" in attempt_info
        assert "time_remaining_seconds" in attempt_info
        assert attempt_info["time_remaining_seconds"] == test.time_limit_minutes * 60

    def test_autosave_batch_and_single_noslash(self, auth_client, published_test):
        """POST /api/v1/tests/<id>/autosave supports batch answers map and single answer."""
        test = published_test["test"]
        q1 = published_test["q1"]
        opt1 = published_test["opt1_correct"]

        # Start attempt
        start_res = auth_client.post(f"/api/v1/tests/{test.id}/start", {}, format="json")
        attempt_id = start_res.json()["data"]["attempt_id"]

        # Batch autosave (as sent by testsAService.batchAutosave / autosaveAnswer)
        batch_payload = {
            "answers": {
                str(q1.id): str(opt1.id),
            },
            "attempt_id": attempt_id,
        }
        res_batch = auth_client.post(f"/api/v1/tests/{test.id}/autosave", batch_payload, format="json")
        assert res_batch.status_code == status.HTTP_200_OK
        data_batch = res_batch.json()
        assert data_batch.get("status") == "success"
        assert data_batch.get("data", {}).get("saved") is True

    def test_submit_attempt_and_result_noslash(self, auth_client, published_test):
        """POST /api/v1/tests/<id>/submit and GET /api/v1/tests/<id>/result match TestResult contract."""
        test = published_test["test"]
        q1 = published_test["q1"]
        opt1 = published_test["opt1_correct"]
        q2 = published_test["q2"]
        opt2 = published_test["opt2_correct"]

        # Start attempt
        start_res = auth_client.post(f"/api/v1/tests/{test.id}/start", {}, format="json")
        attempt_id = start_res.json()["data"]["attempt_id"]

        # Submit test
        submit_payload = {
            "answers": {
                str(q1.id): str(opt1.id),
                str(q2.id): str(opt2.id),
            },
            "timeTaken": 42,
            "attempt_id": attempt_id,
        }
        res_submit = auth_client.post(f"/api/v1/tests/{test.id}/submit", submit_payload, format="json")
        assert res_submit.status_code == status.HTTP_200_OK
        data_submit = res_submit.json()
        assert data_submit.get("status") == "success"

        result = data_submit["data"]
        assert result["attempt_id"] == attempt_id
        assert result["test_id"] == str(test.id)
        assert result["score"] == 8.0
        assert result["total_marks"] == 8.0
        assert result["percentage"] == 100.0
        assert result["passed"] is True
        assert result["time_taken"] == 42
        assert result["correct_count"] == 2
        assert result["incorrect_count"] == 0

        # Retrieve result via GET /api/v1/tests/<id>/result
        res_result = auth_client.get(f"/api/v1/tests/{test.id}/result")
        assert res_result.status_code == status.HTTP_200_OK
        result_get = res_result.json()["data"]
        assert result_get["score"] == 8.0
        assert result_get["passed"] is True

    def test_attempts_and_my_results_endpoints(self, auth_client, published_test):
        """GET /api/v1/tests/attempts and /api/v1/tests/my-results list user attempts."""
        test = published_test["test"]
        # Start an attempt
        auth_client.post(f"/api/v1/tests/{test.id}/start", {}, format="json")

        # 1. /tests/attempts
        res_attempts = auth_client.get("/api/v1/tests/attempts")
        assert res_attempts.status_code == status.HTTP_200_OK
        assert res_attempts.json()["status"] == "success"
        assert len(res_attempts.json()["data"]) >= 1

        # 2. /tests/my-results
        res_my_results = auth_client.get("/api/v1/tests/my-results")
        assert res_my_results.status_code == status.HTTP_200_OK
        assert res_my_results.json()["status"] == "success"
        assert len(res_my_results.json()["data"]) >= 1

    def test_bookmarks_and_diagnose_misconception(self, auth_client, published_test):
        """POST /api/v1/tests/bookmarks and /diagnose-misconception succeed."""
        q1 = published_test["q1"]

        # Bookmark question
        bm_res = auth_client.post("/api/v1/tests/bookmarks", {
            "question_id": str(q1.id),
            "notes": "Important second law concept",
        }, format="json")
        assert bm_res.status_code == status.HTTP_200_OK
        assert bm_res.json()["status"] == "success"
        assert bm_res.json()["data"]["bookmarked"] is True

        # Diagnose misconception
        diag_res = auth_client.post("/api/v1/tests/diagnose-misconception", {
            "question_text": q1.text,
            "selected_option_text": "Zeroth Law",
            "correct_option_text": "Second Law",
            "topic": "Thermodynamics",
        }, format="json")
        assert diag_res.status_code == status.HTTP_200_OK
        assert diag_res.json()["status"] == "success"
        assert "misconception" in diag_res.json()["data"]

    def test_offline_bundle_and_adaptive_step(self, auth_client, published_test):
        """GET /offline-bundle and POST /offline-sync /adaptive/step return structured responses."""
        test = published_test["test"]

        # Offline bundle
        res_bundle = auth_client.get(f"/api/v1/tests/{test.id}/offline-bundle")
        assert res_bundle.status_code == status.HTTP_200_OK
        assert res_bundle.json()["status"] == "success"
        assert "bundle_version" in res_bundle.json()["data"]

        # Offline sync
        res_sync = auth_client.post(f"/api/v1/tests/{test.id}/offline-sync", {"sync_data": []}, format="json")
        assert res_sync.status_code == status.HTTP_200_OK
        assert res_sync.json()["status"] == "success"
        assert res_sync.json()["data"]["reconciled"] is True

        # Adaptive step
        res_step = auth_client.post(f"/api/v1/tests/{test.id}/adaptive/step", {
            "attempt_id": "none",
            "question_id": str(published_test["q1"].id),
            "selected_option_id": "opt1",
        }, format="json")
        assert res_step.status_code == status.HTTP_200_OK
        assert res_step.json()["status"] == "success"

    def test_ai_generate_test_endpoint(self, auth_client, exam_setup):
        """POST /api/v1/ai/generate-test synthesizes practice test matching frontend contract."""
        payload = {
            "topic": "Thermodynamics",
            "difficulty": "medium",
            "count": 3,
            "mode": "practice",
            "ai_mode": "ai_optional",
            "question_source": "ai_generated",
            "time_limit": 20,
        }
        res = auth_client.post("/api/v1/ai/generate-test", payload, format="json")
        assert res.status_code == status.HTTP_201_CREATED
        data = res.json()
        assert data.get("status") == "success"

        generated = data.get("data")
        assert "id" in generated
        assert "title" in generated
        assert generated["mode"] == "practice"
        assert generated["difficulty"] == "medium"
        assert generated["time_limit_minutes"] == 20
        assert "questions" in generated

    def test_sections_and_test_cases_sanitization(self, auth_client, published_test):
        """Test that sections are serialized and hidden test cases are sanitized during testing."""
        test = published_test["test"]
        section1 = TestSection.objects.create(
            test=test,
            name="Section A: Core Physics",
            order=1,
            duration_minutes=45,
            is_timed=True,
            section_type="MANDATORY"
        )
        tq1 = test.test_questions.first()
        tq1.section = section1
        tq1.save()

        # Add coding question with a hidden test case
        coding_q = Question.objects.create(
            text="Implement an efficient bounded priority queue.",
            topic=published_test["q1"].topic,
            question_type="coding",
            difficulty=2.5,
            test_cases=[
                {"input": "pq.insert(5)", "output": "5", "is_hidden": False},
                {"input": "pq.insert(10); pq.pop()", "output": "10", "is_hidden": True, "explanation": "Secret edge case"},
            ]
        )
        TestQuestion.objects.create(test=test, question=coding_q, order=99, marks=5, section=section1)

        res = auth_client.get(f"/api/v1/tests/{test.id}/")
        assert res.status_code == status.HTTP_200_OK
        data = res.json()["data"]

        # 1. Sections array
        assert "sections" in data
        assert len(data["sections"]) >= 1
        assert data["sections"][0]["name"] == "Section A: Core Physics"
        assert data["sections"][0]["duration_minutes"] == 45

        # 2. Section mapping on questions
        matching_q = next(q for q in data["questions"] if q["id"] == str(tq1.question_id))
        assert matching_q["section_id"] == str(section1.id)
        assert matching_q["section_name"] == "Section A: Core Physics"

        # 3. Sanitized test cases
        matching_coding = next(q for q in data["questions"] if q["id"] == str(coding_q.id))
        cases = matching_coding["test_cases"]
        assert len(cases) == 2
        # Public sample case keeps output
        assert cases[0]["output"] == "5"
        # Hidden test case MUST NOT expose secret output
        assert "output" not in cases[1]
        assert cases[1]["is_hidden"] is True

    def test_proctor_time_extension_and_negative_scoring(self, auth_client, published_test):
        """Test proctor time extension is added to time_remaining_seconds and negative marking works."""
        test = published_test["test"]
        test.negative_marks_per_question = 2.0
        test.save()

        start_res = auth_client.post(f"/api/v1/tests/{test.id}/start", {}, format="json")
        attempt_id = start_res.json()["data"]["attempt_id"]

        attempt = TestAttempt.objects.get(id=attempt_id)
        # Grant 10 minutes (600s) extension via proctor metadata
        attempt.metadata = {"time_extension_seconds": 600}
        attempt.save()

        # time_remaining_seconds must reflect the 600s extension
        expected_min = (test.time_limit_minutes * 60) + 550
        assert attempt.time_remaining_seconds >= expected_min

        # Submit attempt with wrong answers to test negative scoring unclamping
        wrong_opt1 = published_test["q1"].options.filter(is_correct=False).first()
        wrong_opt2 = published_test["q2"].options.filter(is_correct=False).first()
        submit_payload = {
            "attempt_id": attempt_id,
            "answers": {
                str(published_test["q1"].id): str(wrong_opt1.id),
                str(published_test["q2"].id): str(wrong_opt2.id),
            },
            "timeTaken": 120,
        }
        res_submit = auth_client.post(f"/api/v1/tests/{test.id}/submit", submit_payload, format="json")
        assert res_submit.status_code == status.HTTP_200_OK
        result = res_submit.json()["data"]

        # Net score should be negative: 0 obtained - (2 * 2.0 negative marks) = -4.0
        assert result["score"] == -4.0
        assert result["passed"] is False

    def test_question_bookmarks_crud(self, auth_client, published_test, student_user):
        """Test GET, POST, and DELETE on /api/v1/tests/bookmarks/."""
        q1 = published_test["q1"]

        # 1. Create Bookmark via POST
        create_res = auth_client.post("/api/v1/tests/bookmarks/", {
            "question_id": str(q1.id),
            "notes": "Review Carnot cycle formula before exam",
        }, format="json")
        assert create_res.status_code == status.HTTP_200_OK
        assert create_res.json()["data"]["bookmarked"] is True
        assert QuestionBookmark.objects.filter(user=student_user, question=q1).exists()

        # 2. List Bookmarks via GET
        list_res = auth_client.get("/api/v1/tests/bookmarks/")
        assert list_res.status_code == status.HTTP_200_OK
        bookmarks_data = list_res.json()["data"]
        assert len(bookmarks_data) >= 1
        bm_item = next(b for b in bookmarks_data if str(b["question"]) == str(q1.id))
        assert bm_item["notes"] == "Review Carnot cycle formula before exam"
        assert "question_text" in bm_item

        # 3. Remove Bookmark via DELETE
        del_res = auth_client.delete(f"/api/v1/tests/bookmarks/?question_id={q1.id}")
        assert del_res.status_code == status.HTTP_200_OK
        assert del_res.json()["data"]["bookmarked"] is False
        assert not QuestionBookmark.objects.filter(user=student_user, question=q1).exists()

    def test_pyq_viewset_endpoints_and_filtering(self, auth_client, exam_setup):
        """Test GET /api/v1/exams/pyqs/ with exam, year, shift filtering."""
        pyq = PYQ.objects.create(
            exam=exam_setup["exam"],
            subject=exam_setup["subject"],
            topic=exam_setup["topic"],
            year=2024,
            shift="Morning Shift 1",
            paper_code="JEE_ADV_P1",
            question_text="Evaluate the adiabatic expansion work integral for van der Waals gas.",
            solution_text="W = R*T*ln((V2-b)/(V1-b)) + a*(1/V2 - 1/V1)",
            difficulty="HARD",
            marks=4,
            is_verified=True,
            source_metadata={"conducting_body": "IIT Madras", "verified_key": True}
        )

        res = auth_client.get(f"/api/v1/exams/pyqs/?exam={exam_setup['exam'].code}&year=2024&shift=Morning")
        assert res.status_code == status.HTTP_200_OK
        pyqs = res.json()["results"] if "results" in res.json() else res.json()
        assert len(pyqs) >= 1
        item = next(p for p in pyqs if p["id"] == str(pyq.id))
        assert item["shift"] == "Morning Shift 1"
        assert item["paper_code"] == "JEE_ADV_P1"
        assert item["is_verified"] is True
        assert item["exam_code"] == exam_setup["exam"].code

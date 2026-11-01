"""
Tests for seed_exam_question_bank management command.
Validates question bank generation, exam blueprints, IRT parameters, and idempotency.
"""
import pytest
from io import StringIO
from django.core.management import call_command
from apps.exams.models import Exam, Subject, Topic
from apps.test_engine.models import Question, Option, Test as TestModel, TestQuestion as TestQuestionModel


@pytest.mark.django_db
class TestSeedExamQuestionBankCommand:
    """Test suite for national competitive exam question bank seeder."""

    def test_seed_command_execution(self):
        """Verify command runs successfully and populates taxonomy, questions, and test papers."""
        out = StringIO()
        call_command('seed_exam_question_bank', stdout=out)
        output = out.getvalue()

        assert "Successfully seeded" in output

        # Verify Exams created
        assert Exam.objects.filter(code="JEE_ADV").exists()
        assert Exam.objects.filter(code="GATE_CS").exists()
        assert Exam.objects.filter(code="SAT_MATH").exists()

        # Verify Subjects & Topics
        jee_exam = Exam.objects.get(code="JEE_ADV")
        assert Subject.objects.filter(exam=jee_exam, code="PHYS_JEE").exists()
        assert Subject.objects.filter(exam=jee_exam, code="MATH_JEE").exists()

        sat_exam = Exam.objects.get(code="SAT_MATH")
        assert Subject.objects.filter(exam=sat_exam, code="SAT_MATH_CORE").exists()

        # Verify Questions created with verified status
        questions = Question.objects.filter(is_verified=True, status="published")
        assert questions.count() >= 12

        # Verify IRT parameters are properly populated
        for q in questions:
            assert q.difficulty > 0
            assert q.discrimination > 0
            # MCQs require four distractor/answer choices. Coding questions
            # intentionally use a canonical reference answer plus executable
            # test cases, so they must not be treated as four-option MCQs.
            if q.question_type == "mcq":
                assert q.options.count() >= 4
            elif q.question_type == "coding":
                assert q.code_template.strip()
                assert len(q.test_cases) >= 1

            # Every seeded question keeps a canonical correct/reference answer.
            assert q.options.filter(is_correct=True).exists()

        # Verify Test Blueprints
        assert TestModel.objects.filter(title="JEE Advanced Grand Simulation Paper 1").exists()
        assert TestModel.objects.filter(title="GATE CS Algorithms & Systems Sprint").exists()
        assert TestModel.objects.filter(title="Adaptive IRT Diagnostic Battery").exists()
        assert TestModel.objects.filter(title="Digital SAT Math Mastery Practice").exists()

        jee_test = TestModel.objects.get(title="JEE Advanced Grand Simulation Paper 1")
        assert jee_test.test_questions.count() > 0

        sat_test = TestModel.objects.get(title="Digital SAT Math Mastery Practice")
        assert sat_test.test_questions.count() > 0

    def test_seed_command_idempotence(self):
        """Verify calling seed command multiple times does not produce duplicate exams or questions."""
        out1 = StringIO()
        call_command('seed_exam_question_bank', stdout=out1)

        count_exams_1 = Exam.objects.count()
        count_questions_1 = Question.objects.count()
        count_tests_1 = TestModel.objects.count()

        out2 = StringIO()
        call_command('seed_exam_question_bank', stdout=out2)

        count_exams_2 = Exam.objects.count()
        count_questions_2 = Question.objects.count()
        count_tests_2 = TestModel.objects.count()

        assert count_exams_1 == count_exams_2
        assert count_questions_1 == count_questions_2
        assert count_tests_1 == count_tests_2

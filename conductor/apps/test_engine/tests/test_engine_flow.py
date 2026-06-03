import uuid
from datetime import timedelta

from django.test import TestCase
from django.utils import timezone
from django.contrib.auth import get_user_model

from apps.exams.models import Country, Exam, Subject, Topic
from apps.test_engine.models import (
    Question,
    Option,
    Test as TestModel,
    TestQuestion,
    TestAttempt,
    AttemptAnswer,
)
from apps.test_engine.services import TestSessionManager


class TestEngineFlowTests(TestCase):
    def setUp(self):
        User = get_user_model()
        self.user = User.objects.create_user(email='test@example.com', password='pass1234')

        self.country = Country.objects.create(code='IN', name='India')
        self.exam = Exam.objects.create(country=self.country, code='JEE', name='JEE', pattern={'total_marks': 100})
        self.subject = Subject.objects.create(exam=self.exam, code='MATH', name='Mathematics')
        self.topic = Topic.objects.create(subject=self.subject, name='Algebra')

        # Create a test and a single MCQ question
        self.test = TestModel.objects.create(exam=self.exam, title='Sample Test', mode='mock', time_limit_minutes=30, is_published=True)
        self.question = Question.objects.create(topic=self.topic, text='What is 2+2?', question_type='mcq', explanation='4')
        self.option1 = Option.objects.create(question=self.question, text='3', is_correct=False, order=1)
        self.option2 = Option.objects.create(question=self.question, text='4', is_correct=True, order=2)
        self.tq = TestQuestion.objects.create(test=self.test, question=self.question, order=1, marks=1)
        # Ensure total marks is correct
        self.test.total_marks = 1
        self.test.save()

    def test_autosave_and_submit(self):
        attempt = TestSessionManager.start_attempt(user=self.user, test_id=self.test.id, mode='mock')
        # Autosave answer
        result = TestSessionManager.autosave_answer(
            attempt=attempt,
            question_id=self.question.id,
            answer_data={'selected_options': [self.option2.id], 'time_spent': 5}
        )
        self.assertIn('answer_id', result)

        attempt.refresh_from_db()
        self.assertIn(str(self.question.id), attempt.autosave_data)
        self.assertGreaterEqual(attempt.autosave_version, 1)

        # Submit attempt
        submitted = TestSessionManager.submit_attempt(attempt.id)
        self.assertEqual(submitted.status, 'submitted')
        self.assertEqual(submitted.score, 1)
        self.assertTrue(submitted.passed)

    def test_autosave_size_eviction(self):
        # Create multiple questions to force autosave_data to grow and trigger eviction
        created_questions = []
        for i in range(50):
            q = Question.objects.create(topic=self.topic, text=f'Q {i}', question_type='mcq')
            Option.objects.create(question=q, text='A', is_correct=True)
            TestQuestion.objects.create(test=self.test, question=q, order=i + 10, marks=1)
            created_questions.append(q)

        attempt = TestSessionManager.start_attempt(user=self.user, test_id=self.test.id, mode='mock')

        # Autosave for many different questions
        for q in created_questions:
            # Use first option id if available
            first_opt = q.options.first()
            opt_id = first_opt.id if first_opt else None
            TestSessionManager.autosave_answer(
                attempt=attempt,
                question_id=q.id,
                answer_data={'selected_options': [opt_id] if opt_id else [], 'text_answer': 'x' * 512}
            )

        attempt.refresh_from_db()
        # autosave_data should not be excessively large; enforce our guard limit check
        data_size = len(str(attempt.autosave_data).encode('utf-8'))
        from apps.test_engine.services import MAX_AUTOSAVE_BYTES
        self.assertLessEqual(data_size, MAX_AUTOSAVE_BYTES)

    def test_timeout_auto_submit_marks_expired(self):
        attempt = TestSessionManager.start_attempt(user=self.user, test_id=self.test.id, mode='mock')
        # Simulate started_at in the past beyond time limit
        TestAttempt.objects.filter(id=attempt.id).update(started_at=timezone.now() - timedelta(minutes=self.test.time_limit_minutes + 2))
        attempt.refresh_from_db()

        # Invoke timeout check
        timed_out = TestSessionManager.check_timeout(attempt)
        self.assertTrue(timed_out)

        attempt.refresh_from_db()
        # After auto-submit, status should be either 'submitted' or 'expired' depending on logic, but submitted_at must be set
        self.assertIn(attempt.status, ('submitted', 'expired'))
        self.assertIsNotNone(attempt.submitted_at)


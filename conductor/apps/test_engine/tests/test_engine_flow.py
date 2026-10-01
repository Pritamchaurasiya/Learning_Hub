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

    def test_ai_test_generation_flow(self):
        from apps.ai_engine.test_generation import AITestGenerationService
        service = AITestGenerationService()
        generated_test = service.generate_test(
            user=self.user,
            exam_id=self.exam.id,
            subject_id=self.subject.id,
            topic_ids=[self.topic.id],
            config={
                'mode': 'mock',
                'difficulty': 'medium',
                'question_count': 5,
                'time_limit_minutes': 15,
            }
        )
        self.assertIsNotNone(generated_test)
        self.assertEqual(str(generated_test.exam.id), str(self.exam.id))
        self.assertEqual(generated_test.test_questions.count(), 5)
        for tq in generated_test.test_questions.all():
            self.assertEqual(tq.question.options.count(), 4)
            self.assertEqual(tq.question.options.filter(is_correct=True).count(), 1)

    def test_api_endpoints_and_analytics_integration(self):
        from rest_framework.test import APIClient
        from django.urls import reverse
        client = APIClient()
        client.force_authenticate(user=self.user)

        # 1. Start attempt via API using reversed URL
        start_url = reverse('test-start-attempt', kwargs={'pk': self.test.id})
        response = client.post(start_url, {'mode': 'mock'}, format='json')
        self.assertEqual(response.status_code, 201)
        attempt_data = response.data['data']
        attempt_id = attempt_data['id']

        # 2. Autosave via API
        autosave_url = reverse('test-autosave', kwargs={'pk': self.test.id})
        autosave_resp = client.post(
            autosave_url,
            {
                'question_id': str(self.question.id),
                'selected_options': [str(self.option2.id)],
                'time_spent': 12,
            },
            format='json'
        )
        self.assertEqual(autosave_resp.status_code, 200)

        # 3. Submit attempt via API
        submit_url = reverse('test-submit-attempt', kwargs={'pk': self.test.id})
        submit_resp = client.post(submit_url, {}, format='json')
        self.assertEqual(submit_resp.status_code, 200)
        self.assertEqual(submit_resp.data['data']['score'], 1.0)
        self.assertTrue(submit_resp.data['data']['passed'])

        # 4. Get Result via API
        result_url = reverse('test-get-result', kwargs={'pk': self.test.id})
        result_resp = client.get(result_url)
        self.assertEqual(result_resp.status_code, 200)
        self.assertEqual(result_resp.data['data']['attempt_id'], str(attempt_id))

        # 5. Verify Analytics Engine dashboard
        from apps.analytics_v2.services import AnalyticsEngine
        dashboard = AnalyticsEngine.get_dashboard(self.user, exam_id=self.exam.id)
        self.assertGreaterEqual(dashboard['total_tests_taken'], 1)
        self.assertGreaterEqual(dashboard['total_questions_answered'], 1)
        self.assertEqual(dashboard['overall_accuracy'], 100.0)

    def test_celery_periodic_tasks(self):
        from apps.test_engine.tasks import (
            check_expired_attempts,
            cleanup_abandoned_attempts,
            recalculate_question_stats,
        )

        # 1. Test check_expired_attempts
        attempt = TestSessionManager.start_attempt(user=self.user, test_id=self.test.id, mode='mock')
        # Backdate started_at
        TestAttempt.objects.filter(id=attempt.id).update(
            started_at=timezone.now() - timedelta(minutes=self.test.time_limit_minutes + 5)
        )
        res_expired = check_expired_attempts()
        self.assertGreaterEqual(res_expired['expired'], 1)

        # 2. Test cleanup_abandoned_attempts
        attempt2 = TestSessionManager.start_attempt(user=self.user, test_id=self.test.id, mode='mock')
        # Backdate last_activity_at to 48 hours ago
        TestAttempt.objects.filter(id=attempt2.id).update(
            last_activity_at=timezone.now() - timedelta(hours=48)
        )
        res_abandoned = cleanup_abandoned_attempts()
        self.assertGreaterEqual(res_abandoned['abandoned'], 1)
        attempt2.refresh_from_db()
        self.assertEqual(attempt2.status, 'abandoned')

        # 3. Test recalculate_question_stats bulk update
        res_stats = recalculate_question_stats()
        self.assertIsInstance(res_stats['updated'], int)




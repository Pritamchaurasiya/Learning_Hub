import pytest
from datetime import timedelta
from django.utils import timezone
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
from apps.tests_engine.models import (
    Test, Question, Option, TestAttempt, AttemptAnswer,
    QuestionBookmark, SpacedRepetitionCard
)
from apps.tests_engine.spaced_repetition import SuperMemoEngine

User = get_user_model()


@pytest.fixture
def auth_user():
    user = User.objects.create_user(
        email='spaced_student@example.com',
        username='spaced_student',
        password='ValidPassword123!',
        first_name='Spaced',
        last_name='Student'
    )
    return user


@pytest.fixture
def api_client(auth_user):
    client = APIClient()
    client.force_authenticate(user=auth_user)
    return client


@pytest.fixture
def sample_test_with_questions():
    test = Test.objects.create(
        title="Dynamic Programming Mastery",
        slug="dp-mastery",
        category="Algorithms",
        duration_minutes=60,
        total_marks=20.0,
    )
    q1 = Question.objects.create(
        test=test,
        prompt="What is the time complexity of 0/1 Knapsack with memoization?",
        question_type="MCQ",
        topic="Knapsack",
        difficulty=0.5,
        explanation="O(N*W) where N is items and W is knapsack capacity.",
    )
    Option.objects.create(question=q1, text="O(N*W)", is_correct=True)
    Option.objects.create(question=q1, text="O(2^N)", is_correct=False)

    q2 = Question.objects.create(
        test=test,
        prompt="Longest Common Subsequence base case length when string is empty?",
        question_type="MCQ",
        topic="Strings",
        difficulty=-0.2,
        explanation="Empty string has 0 common characters.",
    )
    Option.objects.create(question=q2, text="0", is_correct=True)
    Option.objects.create(question=q2, text="1", is_correct=False)

    return test, q1, q2


@pytest.mark.django_db
class TestSuperMemoEngine:
    def test_calculate_review_success_sequence(self):
        """Test progressing through successful recall grades (quality >= 3)."""
        # First review, perfect recall (quality=5)
        res1 = SuperMemoEngine.calculate_review(quality=5, previous_interval=1, previous_ease_factor=2.5, previous_repetitions=0)
        assert res1['interval_days'] == 1
        assert res1['repetitions'] == 1
        assert res1['ease_factor'] >= 2.5
        assert not res1['is_lapse']

        # Second review, good recall (quality=4)
        res2 = SuperMemoEngine.calculate_review(quality=4, previous_interval=res1['interval_days'], previous_ease_factor=res1['ease_factor'], previous_repetitions=res1['repetitions'])
        assert res2['interval_days'] == 6
        assert res2['repetitions'] == 2

        # Third review, perfect recall (quality=5) -> interval = round(6 * EF)
        res3 = SuperMemoEngine.calculate_review(quality=5, previous_interval=res2['interval_days'], previous_ease_factor=res2['ease_factor'], previous_repetitions=res2['repetitions'])
        assert res3['interval_days'] > 6
        assert res3['repetitions'] == 3

    def test_calculate_review_lapse_resets_interval(self):
        """Test that quality < 3 resets interval to 1 and flags a lapse."""
        res = SuperMemoEngine.calculate_review(quality=1, previous_interval=15, previous_ease_factor=2.6, previous_repetitions=3)
        assert res['interval_days'] == 1
        assert res['repetitions'] == 0
        assert res['is_lapse'] is True
        assert res['ease_factor'] < 2.6

    def test_retention_decay_probability(self, auth_user):
        """Test retention probability calculation property."""
        card = SpacedRepetitionCard.objects.create(
            user=auth_user,
            front="State Master Theorem",
            back="T(n) = aT(n/b) + f(n)",
            stability=2.0,
            last_reviewed_at=timezone.now() - timedelta(days=2),
        )
        # At t = 2 days with S = 2 days, R = exp(-2/2) = exp(-1) ~= 0.3679
        assert 0.35 <= card.retention_probability <= 0.38


@pytest.mark.django_db
class TestSpacedRepetitionEndpoints:
    def test_get_empty_daily_deck(self, api_client):
        response = api_client.get('/api/v1/revision/deck')
        assert response.status_code == 200
        payload = response.json()
        assert payload['status'] == 'success'
        assert payload['data']['cards'] == []
        assert payload['data']['stats']['total_cards'] == 0

    def test_create_custom_card(self, api_client):
        payload = {
            'front': 'What is QuickSort average time complexity?',
            'back': 'O(N log N)',
            'explanation': 'Divide and conquer with balanced partitioning.',
            'topic': 'Sorting',
            'subject': 'DSA',
            'card_type': 'CONCEPT',
        }
        response = api_client.post('/api/v1/revision/deck', data=payload, format='json')
        assert response.status_code == 201
        data = response.json()['data']
        assert data['front'] == payload['front']
        assert data['card_type'] == 'CONCEPT'
        assert data['topic'] == 'Sorting'

    def test_record_card_review(self, api_client, auth_user):
        card = SpacedRepetitionCard.objects.create(
            user=auth_user,
            front="Merge sort stability",
            back="Stable sorting algorithm",
            interval_days=1,
            ease_factor=2.5,
            repetitions=0,
        )
        response = api_client.post('/api/v1/revision/review', data={
            'card_id': card.id,
            'quality': 4
        }, format='json')
        assert response.status_code == 200
        data = response.json()['data']
        assert data['card']['repetitions'] == 1
        assert data['card']['interval_days'] == 1

        # Second review -> should jump to 6 days
        response2 = api_client.post('/api/v1/revision/review', data={
            'card_id': card.id,
            'quality': 5
        }, format='json')
        assert response2.status_code == 200
        data2 = response2.json()['data']
        assert data2['card']['repetitions'] == 2
        assert data2['card']['interval_days'] == 6

    def test_generate_from_test_mistakes(self, api_client, auth_user, sample_test_with_questions):
        test, q1, q2 = sample_test_with_questions
        attempt = TestAttempt.objects.create(
            user=auth_user,
            test=test,
            attempt_number=1,
            status='SUBMITTED',
            score=0.0,
        )
        # Mark q1 as incorrect
        AttemptAnswer.objects.create(
            attempt=attempt,
            question=q1,
            is_correct=False,
            marks_awarded=0.0,
        )
        # Mark q2 as correct
        AttemptAnswer.objects.create(
            attempt=attempt,
            question=q2,
            is_correct=True,
            marks_awarded=4.0,
        )

        response = api_client.post('/api/v1/revision/generate', data={
            'source': 'mistakes',
            'attempt_id': attempt.id,
        }, format='json')

        assert response.status_code == 200
        data = response.json()['data']
        assert data['created_count'] == 1
        assert data['cards'][0]['card_type'] == 'MISTAKE'
        assert q1.prompt in data['cards'][0]['front']

    def test_generate_from_bookmarks(self, api_client, auth_user, sample_test_with_questions):
        test, q1, q2 = sample_test_with_questions
        QuestionBookmark.objects.create(
            user=auth_user,
            question=q2,
            notes="Review string matching prefix table."
        )

        response = api_client.post('/api/v1/revision/generate', data={
            'source': 'bookmarks',
        }, format='json')

        assert response.status_code == 200
        data = response.json()['data']
        assert data['created_count'] == 1
        assert data['cards'][0]['card_type'] == 'QUESTION'

    def test_get_retention_stats(self, api_client, auth_user):
        SpacedRepetitionCard.objects.create(
            user=auth_user,
            front="Concept 1",
            back="Answer 1",
            topic="Graphs",
            repetitions=4,  # Mastered
            stability=12.0,
        )
        SpacedRepetitionCard.objects.create(
            user=auth_user,
            front="Concept 2",
            back="Answer 2",
            topic="Trees",
            repetitions=1,  # Learning
            stability=2.0,
        )

        response = api_client.get('/api/v1/revision/stats')
        assert response.status_code == 200
        stats = response.json()['data']
        assert stats['total_cards'] == 2
        assert stats['mastered_count'] == 1
        assert stats['mastery_rate'] == 50.0
        assert len(stats['topic_breakdown']) == 2

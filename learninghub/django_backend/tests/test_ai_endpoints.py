import pytest
from django.urls import reverse
from rest_framework.test import APIClient
from rest_framework import status
from apps.users.models import User

@pytest.mark.django_db
class TestAIEndpoints:
    def setup_method(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            email='ai_student@learninghub.app',
            password='Password123!',
            username='AIStudent'
        )
        self.client.force_authenticate(user=self.user)

    def test_ai_ebook_summarize_chapter(self):
        url = reverse('ai-ebook-summarize-chapter')
        payload = {
            'chapterTitle': '1. Asymptotic Notation & Master Theorem',
            'chapterContent': 'Asymptotic analysis evaluates algorithmic growth rate. Big-O represents asymptotic upper bounds.'
        }
        res = self.client.post(url, payload, format='json')
        assert res.status_code == status.HTTP_200_OK
        data = res.data.get('data', {})
        assert 'summary' in data
        assert 'keyTakeaways' in data
        assert isinstance(data['keyTakeaways'], list)
        assert len(data['keyTakeaways']) >= 2
        assert 'definitions' in data
        assert len(data['definitions']) >= 1

    def test_ai_ebook_explain_paragraph(self):
        url = reverse('ai-ebook-explain-paragraph')
        payload = {
            'paragraphText': 'The Master Theorem solves recurrences of the form T(n) = aT(n/b) + f(n).',
            'chapterContext': 'Chapter 1: Asymptotic Bounds'
        }
        res = self.client.post(url, payload, format='json')
        assert res.status_code == status.HTTP_200_OK
        data = res.data.get('data', {})
        assert 'explanation' in data
        assert 'analogy' in data
        assert 'bulletPoints' in data
        assert len(data['bulletPoints']) >= 2

    def test_ai_ebook_explain_paragraph_empty_validation(self):
        url = reverse('ai-ebook-explain-paragraph')
        res = self.client.post(url, {'paragraphText': ''}, format='json')
        assert res.status_code == status.HTTP_400_BAD_REQUEST

    def test_ai_generate_test(self):
        url = reverse('ai-generate-test')
        payload = {
            'topic': 'Dynamic Programming & Memoization',
            'difficulty': 'hard',
            'count': 4
        }
        res = self.client.post(url, payload, format='json')
        assert res.status_code in (status.HTTP_200_OK, status.HTTP_201_CREATED)
        data = res.data.get('data', {})
        assert 'testId' in data and data['testId']
        assert data['topic'] == 'Dynamic Programming & Memoization'
        assert data['difficulty'] == 'hard'
        assert data['question_count'] == 4
        assert len(data['questions']) == 4
        first_q = data['questions'][0]
        assert 'text' in first_q
        assert len(first_q['options']) == 4
        assert 'explanation' in first_q

    def test_ai_generate_weak_area_test(self):
        url = reverse('ai-generate-weak-area-test')
        payload = {'count': 6}
        res = self.client.post(url, payload, format='json')
        assert res.status_code == status.HTTP_200_OK
        data = res.data.get('data', {})
        assert data['testId'].startswith('ai-weak-')
        assert data['question_count'] == 6
        assert len(data['questions']) == 6

    def test_ai_learning_path(self):
        url = reverse('ai-learning-path')
        payload = {'target_role': 'Principal Systems Architect'}
        res = self.client.post(url, payload, format='json')
        assert res.status_code == status.HTTP_200_OK
        data = res.data.get('data', {})
        assert data['targetRole'] == 'Principal Systems Architect'
        assert len(data['milestones']) >= 4

    def test_ai_tutor_direct_route(self):
        url = reverse('ai-tutor-direct')
        payload = {'prompt': 'Explain Dijkstra algorithm simply'}
        res = self.client.post(url, payload, format='json')
        assert res.status_code == status.HTTP_200_OK
        assert 'response' in res.data.get('data', {})

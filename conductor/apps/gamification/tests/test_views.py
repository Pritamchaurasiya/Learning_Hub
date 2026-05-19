import pytest
from django.urls import reverse
from rest_framework import status
from unittest.mock import patch
from apps.gamification.models import UserXP, Streak

@pytest.mark.django_db
class TestGamificationViews:

    def test_get_user_stats_unauthorized(self, api_client):
        """Ensure unauthenticated users cannot access gamification stats."""
        url = reverse('gamification:user-stats')
        response = api_client.get(url)
        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_get_user_stats_authorized(self, authenticated_client, test_user):
        """Ensure authenticated users can fetch their gamification stats."""
        # Setup basic stats
        UserXP.objects.update_or_create(user=test_user, defaults={'total_xp': 150, 'level': 2})
        Streak.objects.update_or_create(user=test_user, defaults={'current_streak': 3, 'longest_streak': 5})
        
        url = reverse('gamification:user-stats')
        response = authenticated_client.get(url)
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data['status'] == 'success'
        assert data['data']['xp']['total'] == 150
        assert data['data']['xp']['level'] == 2
        assert data['data']['streak']['current'] == 3

    @patch('apps.gamification.views.GamificationService.get_leaderboard')
    def test_get_global_leaderboard(self, mock_get_leaderboard, authenticated_client):
        """Ensure leaderboard endpoint returns top users."""
        mock_get_leaderboard.return_value = [
            {"username": "player1", "total_xp": 5000, "level": 50, "rank": 1},
            {"username": "player2", "total_xp": 4000, "level": 40, "rank": 2},
        ]
        
        url = reverse('gamification:global-leaderboard')
        response = authenticated_client.get(url)
        
        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data['status'] == 'success'
        assert len(data['data']) == 2
        assert data['data'][0]['username'] == 'player1'

"""Gamification URLs."""

from django.urls import path
from .views import GamificationStatsView, LeaderboardView

urlpatterns = [
    path("stats/", GamificationStatsView.as_view(), name="stats"),
    path("leaderboard/", LeaderboardView.as_view(), name="leaderboard"),
]

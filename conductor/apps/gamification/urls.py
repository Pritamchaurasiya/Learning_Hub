"""
Gamification URL configuration.
Maps endpoints that the Flutter frontend expects at /api/v1/gamification/*.
"""
from django.urls import path
from . import views

app_name = 'gamification'

urlpatterns = [
    # XP
    path('xp/', views.get_user_xp, name='gamification-xp'),
    path('xp/add/', views.add_xp, name='gamification-add-xp'),

    # Achievements / Badges
    path('achievements/', views.get_achievements, name='gamification-achievements'),
    path('achievements/unlock/', views.unlock_achievement, name='gamification-unlock'),

    # Leaderboard
    path('leaderboard/', views.LeaderboardView.as_view(), name='global-leaderboard'),

    # Streaks
    path('streak/', views.get_streak, name='gamification-streak'),
    path('streak/checkin/', views.checkin_streak, name='gamification-checkin'),

    # Combined Dashboard
    path('stats/', views.get_gamification_stats, name='user-stats'),
]

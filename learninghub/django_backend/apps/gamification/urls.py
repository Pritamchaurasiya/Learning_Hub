from django.urls import path
from .views import (
    BadgesListView, AchievementsListView, LeaderboardView, LeaderboardMeView,
    DailyGoalView, NotificationsListView, NotificationsUnreadCountView,
    NotificationsMarkReadView, GlobalSearchView, SearchSuggestionsView,
    SearchTrendingView, SubscriptionsTiersView, UserSubscriptionView,
    CancelSubscriptionView
)

urlpatterns = [
    # Gamification & Leaderboard
    path('gamification/badges', BadgesListView.as_view(), name='badges-list'),
    path('gamification/achievements', AchievementsListView.as_view(), name='achievements-list'),
    path('gamification/leaderboard', LeaderboardView.as_view(), name='gamification-leaderboard'),
    path('gamification/daily-goal', DailyGoalView.as_view(), name='daily-goal'),
    path('leaderboard', LeaderboardView.as_view(), name='global-leaderboard'),
    path('leaderboard/', LeaderboardView.as_view(), name='global-leaderboard-slash'),
    path('leaderboard/me', LeaderboardMeView.as_view(), name='leaderboard-me'),
    path('leaderboard/me/', LeaderboardMeView.as_view(), name='leaderboard-me-slash'),

    # Notifications
    path('notifications', NotificationsListView.as_view(), name='notifications-list'),
    path('notifications/', NotificationsListView.as_view(), name='notifications-list-slash'),
    path('notifications/unread-count', NotificationsUnreadCountView.as_view(), name='notifications-unread-count'),
    path('notifications/mark-all-read', NotificationsMarkReadView.as_view(), name='notifications-mark-all-read'),
    path('notifications/<str:pk>/read', NotificationsMarkReadView.as_view(), name='notification-mark-read'),
    path('notifications/<str:pk>', NotificationsListView.as_view(), name='notification-delete'),

    # Search
    path('search', GlobalSearchView.as_view(), name='global-search'),
    path('search/', GlobalSearchView.as_view(), name='global-search-slash'),
    path('search/suggestions', SearchSuggestionsView.as_view(), name='search-suggestions'),
    path('search/trending', SearchTrendingView.as_view(), name='search-trending'),

    # Subscriptions
    path('subscriptions/tiers', SubscriptionsTiersView.as_view(), name='subscriptions-tiers'),
    path('subscriptions/me', UserSubscriptionView.as_view(), name='subscriptions-me'),
    path('subscriptions/create', UserSubscriptionView.as_view(), name='subscriptions-create'),
    path('subscriptions/cancel', CancelSubscriptionView.as_view(), name='subscriptions-cancel'),
]

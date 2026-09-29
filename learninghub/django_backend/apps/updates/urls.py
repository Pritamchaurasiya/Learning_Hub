"""
URL Routing for LearningHub Student Updates Hub.
"""
from django.urls import path
from .views import (
    StudentUpdateListView,
    StudentUpdatePersonalizedFeedView,
    StudentUpdateUpcomingDeadlinesView,
    StudentUpdateDetailView,
    StudentUpdateBookmarkListView,
    StudentUpdateBookmarkDetailView,
    StudentUpdateReminderListView,
    StudentUpdateReminderDetailView,
    StudentUpdateSubscriptionListView,
    StudentUpdateSubscriptionDetailView,
    UpdateSourceListView,
    UpdatesStatisticsView,
    SeedSourcesAndUpdatesView,
    StudentUpdateModerationView,
    TriggerSourceCrawlView,
)


urlpatterns = [
    path('', StudentUpdateListView.as_view(), name='update-list'),
    path('feed/', StudentUpdateListView.as_view(), name='update-feed'),
    path('personalized/', StudentUpdatePersonalizedFeedView.as_view(), name='update-personalized'),
    path('deadlines/', StudentUpdateUpcomingDeadlinesView.as_view(), name='update-deadlines'),
    path('stats/', UpdatesStatisticsView.as_view(), name='update-stats'),
    path('sources/', UpdateSourceListView.as_view(), name='update-sources'),
    path('seed/', SeedSourcesAndUpdatesView.as_view(), name='update-seed'),
    path('crawl/', TriggerSourceCrawlView.as_view(), name='update-crawl'),
    path('bookmarks/', StudentUpdateBookmarkListView.as_view(), name='update-bookmarks'),
    path('bookmarks/<str:update_id>/', StudentUpdateBookmarkDetailView.as_view(), name='update-bookmark-detail'),
    path('reminders/', StudentUpdateReminderListView.as_view(), name='update-reminders'),
    path('reminders/<str:reminder_id>/', StudentUpdateReminderDetailView.as_view(), name='update-reminder-detail'),
    path('subscriptions/', StudentUpdateSubscriptionListView.as_view(), name='update-subscriptions'),
    path('subscriptions/<str:subscription_id>/', StudentUpdateSubscriptionDetailView.as_view(), name='update-subscription-detail'),
    path('<str:update_id>/bookmark/', StudentUpdateBookmarkDetailView.as_view(), name='update-bookmark-shortcut'),
    path('<str:update_id>/moderate/', StudentUpdateModerationView.as_view(), name='update-moderate'),
    path('<str:update_id>/', StudentUpdateDetailView.as_view(), name='update-detail'),
]

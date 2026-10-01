from django.urls import path
from .views import (
    DiscussionListView, DiscussionDetailView, PostCommentView,
    UpvoteDiscussionView, LiveSessionsListView, MentorsListView
)

urlpatterns = [
    path('discussions', DiscussionListView.as_view(), name='discussions-list'),
    path('discussions/', DiscussionListView.as_view(), name='discussions-list-slash'),
    path('discussions/threads', DiscussionListView.as_view(), name='discussions-threads-list'),
    path('discussions/threads/', DiscussionListView.as_view(), name='discussions-threads-list-slash'),
    path('discussions/<str:pk>', DiscussionDetailView.as_view(), name='discussion-detail'),
    path('discussions/<str:pk>/', DiscussionDetailView.as_view(), name='discussion-detail-slash'),
    path('discussions/threads/<str:pk>', DiscussionDetailView.as_view(), name='discussion-thread-detail'),
    path('discussions/threads/<str:pk>/', DiscussionDetailView.as_view(), name='discussion-thread-detail-slash'),
    path('discussions/<str:pk>/comments', PostCommentView.as_view(), name='discussion-comments'),
    path('discussions/threads/<str:pk>/replies', PostCommentView.as_view(), name='discussion-thread-replies'),
    path('discussions/<str:pk>/upvote', UpvoteDiscussionView.as_view(), name='discussion-upvote'),
    path('discussions/threads/<str:pk>/vote', UpvoteDiscussionView.as_view(), name='discussion-thread-vote'),
    path('live-sessions', LiveSessionsListView.as_view(), name='live-sessions-list'),
    path('live-classes', LiveSessionsListView.as_view(), name='live-classes-list'),
    path('mentors', MentorsListView.as_view(), name='mentors-list'),
    path('tutors/list', MentorsListView.as_view(), name='tutors-list-alias'),
    path('tutors/list/', MentorsListView.as_view(), name='tutors-list-alias-slash'),
]

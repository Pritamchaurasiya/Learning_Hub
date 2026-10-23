from django.urls import path
from .views import (
    ProblemListView, ProblemDetailView, RunCodeView,
    SubmitProblemView, ProblemSubmissionsListView, ProblemRecommendationsView, DSAStatsView
)

urlpatterns = [
    path('problems', ProblemListView.as_view(), name='problems-list'),
    path('problems/', ProblemListView.as_view(), name='problems-list-slash'),
    path('problems/recommendations', ProblemRecommendationsView.as_view(), name='problem-recommendations'),
    path('problems/recommendations/', ProblemRecommendationsView.as_view(), name='problem-recommendations-slash'),
    path('problems/<str:pk>', ProblemDetailView.as_view(), name='problem-detail'),
    path('problems/<str:pk>/', ProblemDetailView.as_view(), name='problem-detail-slash'),
    path('problems/<str:pk>/run', RunCodeView.as_view(), name='problem-run'),
    path('problems/<str:pk>/submit', SubmitProblemView.as_view(), name='problem-submit'),
    path('problems/<str:pk>/submissions', ProblemSubmissionsListView.as_view(), name='problem-submissions'),
    path('code/run', RunCodeView.as_view(), name='global-code-run'),
    path('problems/dsa-stats', DSAStatsView.as_view(), name='problem-dsa-stats'),
    path('problems/dsa-stats/', DSAStatsView.as_view(), name='problem-dsa-stats-slash'),
    path('dsa-stats', DSAStatsView.as_view(), name='dsa-stats-direct'),
    path('dsa-stats/', DSAStatsView.as_view(), name='dsa-stats-direct-slash'),
]

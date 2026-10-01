from django.urls import path
from .views import (
    ProblemListView, ProblemDetailView, RunCodeView,
    SubmitProblemView, ProblemSubmissionsListView
)

urlpatterns = [
    path('problems', ProblemListView.as_view(), name='problems-list'),
    path('problems/', ProblemListView.as_view(), name='problems-list-slash'),
    path('problems/<str:pk>', ProblemDetailView.as_view(), name='problem-detail'),
    path('problems/<str:pk>/', ProblemDetailView.as_view(), name='problem-detail-slash'),
    path('problems/<str:pk>/run', RunCodeView.as_view(), name='problem-run'),
    path('problems/<str:pk>/submit', SubmitProblemView.as_view(), name='problem-submit'),
    path('problems/<str:pk>/submissions', ProblemSubmissionsListView.as_view(), name='problem-submissions'),
    path('code/run', RunCodeView.as_view(), name='global-code-run'),
]

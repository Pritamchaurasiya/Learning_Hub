"""
Direct Problem URLs for Learning Hub API.
Provides direct routing for /api/v1/problems/* matching frontend problemService.ts.
"""

from django.urls import path, include
from rest_framework import permissions
from rest_framework.routers import DefaultRouter

from .views import ProblemViewSet, TagViewSet
from .urls import (
    get_recommended_problems,
    validate_solution,
    analyze_complexity,
    get_dsa_stats,
)

router = DefaultRouter()
router.register(r'tags', TagViewSet, basename='direct-dsa-tag')
router.register(r'', ProblemViewSet, basename='direct-dsa-problem')

urlpatterns = [
    # Top-level direct actions
    path('recommendations/', get_recommended_problems, name='direct_dsa_recommendations'),
    path('recommendations', get_recommended_problems, name='direct_dsa_recommendations_noslash'),
    path('validate/', validate_solution, name='direct_validate_solution'),
    path('validate', validate_solution, name='direct_validate_solution_noslash'),
    path('analyze/', analyze_complexity, name='direct_analyze_complexity'),
    path('analyze', analyze_complexity, name='direct_analyze_complexity_noslash'),
    path('stats/', get_dsa_stats, name='direct_dsa_stats'),
    path('stats', get_dsa_stats, name='direct_dsa_stats_noslash'),

    # Explicit non-trailing slash routes for POST/GET detail actions (avoids 301 POST redirects)
    path('<slug:slug>/run', ProblemViewSet.as_view({'post': 'run'}, permission_classes=[permissions.AllowAny]), name='direct-problem-run-noslash'),
    path('<slug:slug>/submit', ProblemViewSet.as_view({'post': 'submit'}), name='direct-problem-submit-noslash'),
    path('<slug:slug>/submissions', ProblemViewSet.as_view({'get': 'submissions'}), name='direct-problem-submissions-noslash'),
    path('<slug:slug>/hint', ProblemViewSet.as_view({'get': 'hint'}), name='direct-problem-hint-noslash'),
    path('<slug:slug>/explain', ProblemViewSet.as_view({'get': 'explain'}), name='direct-problem-explain-noslash'),
    path('<slug:slug>/draft', ProblemViewSet.as_view({'get': 'draft', 'post': 'draft', 'delete': 'draft'}), name='direct-problem-draft-noslash'),

    # DefaultRouter URLs (handles /api/v1/problems/ and /api/v1/problems/<slug>/)
    path('', include(router.urls)),
]

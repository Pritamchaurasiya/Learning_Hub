"""
Search API endpoints for global search functionality.
"""
from django.urls import path
from . import views

urlpatterns = [
    # Global search
    path('', views.global_search, name='global-search'),
    path('suggestions/', views.search_suggestions, name='search-suggestions'),
    path('advanced/', views.advanced_search, name='advanced-search'),
    path('trending/', views.trending_searches, name='trending-searches'),
]

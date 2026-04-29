from rest_framework.routers import DefaultRouter
from django.urls import path, include
from . import views # Changed to import 'views' module to access views.get_god_mode_stats

router = DefaultRouter()
router.register(r'instructor', views.InstructorDashboardViewSet, basename='instructor-dashboard') # Updated to use views.InstructorDashboardViewSet
router.register(r'analytics', views.AnalyticsViewSet, basename='analytics') # Updated to use views.AnalyticsViewSet
router.register(r'dashboard', views.DashboardViewSet, basename='dashboard') # Updated to use views.DashboardViewSet

urlpatterns = [
    path('', include(router.urls)),
    path('god-mode/', views.get_god_mode_stats, name='god_mode_stats'),
    
    # Home Dashboard
    path('home/', views.get_home_dashboard, name='home_dashboard'),
    
    # Phase 7: Advanced Analytics
    path('learner/', views.get_learner_dashboard, name='learner_dashboard'),
    path('instructor-v2/', views.get_instructor_dashboard_v2, name='instructor_dashboard_v2'),
    path('platform/', views.get_platform_metrics, name='platform_metrics'),
    
    # Phase 7: Recommendations
    path('recommendations/', views.get_recommendations, name='recommendations'),
    path('similar-courses/<uuid:course_id>/', views.get_similar_courses, name='similar_courses'),
    
    # Phase 7: Content Moderation
    path('moderate/', views.moderate_content, name='moderate_content'),
    path('reputation/', views.get_content_reputation, name='content_reputation'),

    # Phase 10: Learning Streak
    path('streak/', views.get_learning_streak, name='learning_streak'),
]

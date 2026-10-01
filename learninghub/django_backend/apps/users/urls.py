from django.urls import path
from .views import (
    RegisterView, LoginView, RefreshTokenView, LogoutView,
    UserProfileView, ChangePasswordView, DeleteAccountView,
    UserBookmarksListView, UserBookmarkDeleteView, MediaAvatarUploadView,
    SetupMfaView, VerifyMfaView, AdminLoginView, AdminRegisterView,
    AdminUsersListView, AdminUserDetailView, AdminAnalyticsOverviewView,
    AdminUserAnalyticsView, AdminCourseAnalyticsView, AdminDauAnalyticsView,
    AdminABTestingResultsView, AdminAICourseGenerateView,
    AdminCoursesManagementView, AdminCourseDetailManagementView
)

urlpatterns = [
    # Auth endpoints
    path('auth/register', RegisterView.as_view(), name='auth-register'),
    path('auth/login', LoginView.as_view(), name='auth-login'),
    path('auth/refresh', RefreshTokenView.as_view(), name='auth-refresh'),
    path('auth/logout', LogoutView.as_view(), name='auth-logout'),
    path('auth/me', UserProfileView.as_view(), name='auth-me'),
    path('auth/profile/', UserProfileView.as_view(), name='auth-profile-update'),
    path('users/profile', UserProfileView.as_view(), name='users-profile'),
    path('auth/change-password', ChangePasswordView.as_view(), name='auth-change-password'),
    path('auth/delete-account', DeleteAccountView.as_view(), name='auth-delete-account'),
    path('auth/mfa/setup', SetupMfaView.as_view(), name='auth-mfa-setup'),
    path('auth/mfa/verify', VerifyMfaView.as_view(), name='auth-mfa-verify'),

    # Bookmarks & Media
    path('users/bookmarks', UserBookmarksListView.as_view(), name='users-bookmarks'),
    path('users/bookmarks/<str:course_id>', UserBookmarkDeleteView.as_view(), name='users-bookmarks-delete'),
    path('media/avatar', MediaAvatarUploadView.as_view(), name='media-avatar'),

    # Admin auth & user management
    path('admin/auth/login', AdminLoginView.as_view(), name='admin-auth-login'),
    path('admin/auth/register', AdminRegisterView.as_view(), name='admin-auth-register'),
    path('admin/auth/setup-mfa', SetupMfaView.as_view(), name='admin-auth-setup-mfa'),
    path('admin/auth/verify-mfa', VerifyMfaView.as_view(), name='admin-auth-verify-mfa'),
    path('admin/users', AdminUsersListView.as_view(), name='admin-users-list'),
    path('admin/users/', AdminUsersListView.as_view(), name='admin-users-list-slash'),
    path('admin/users/<str:pk>', AdminUserDetailView.as_view(), name='admin-user-detail'),

    # Admin analytics
    path('admin/analytics', AdminAnalyticsOverviewView.as_view(), name='admin-analytics-overview'),
    path('admin/analytics/', AdminAnalyticsOverviewView.as_view(), name='admin-analytics-overview-slash'),
    path('admin/analytics/users', AdminUserAnalyticsView.as_view(), name='admin-analytics-users'),
    path('admin/analytics/courses', AdminCourseAnalyticsView.as_view(), name='admin-analytics-courses'),
    path('admin/analytics/dau', AdminDauAnalyticsView.as_view(), name='admin-analytics-dau'),

    # Admin A/B testing & AI Course generation
    path('admin/ab-testing/results/<str:experiment_id>', AdminABTestingResultsView.as_view(), name='admin-ab-testing-results'),
    path('admin/ai/generate-course', AdminAICourseGenerateView.as_view(), name='admin-ai-generate-course'),

    # Admin course management
    path('admin/courses', AdminCoursesManagementView.as_view(), name='admin-courses-manage'),
    path('admin/courses/', AdminCoursesManagementView.as_view(), name='admin-courses-manage-slash'),
    path('admin/courses/<str:pk>', AdminCourseDetailManagementView.as_view(), name='admin-course-manage-detail'),
]

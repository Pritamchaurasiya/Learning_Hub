"""
Authentication URLs for Learning Hub API.
"""

from django.urls import path

from ..views import (
    ChangePasswordView,
    CustomTokenRefreshView,
    LoginView,
    LogoutView,
    PasswordResetConfirmView,
    PasswordResetRequestView,
    RegisterView,
    UserProfileViewSet,
)

app_name = "auth"

# ViewSet action for /auth/me/
me_view = UserProfileViewSet.as_view({
    "get": "profile",
    "put": "update_profile",
    "patch": "update_profile"
})

two_factor_setup_view = UserProfileViewSet.as_view({"get": "two_factor_setup", "post": "two_factor_setup"})
two_factor_verify_view = UserProfileViewSet.as_view({"post": "two_factor_verify"})
two_factor_disable_view = UserProfileViewSet.as_view({"post": "two_factor_disable"})
sessions_view = UserProfileViewSet.as_view({"get": "list_sessions"})
sessions_revoke_view = UserProfileViewSet.as_view({"post": "revoke_sessions"})
api_keys_view = UserProfileViewSet.as_view({"get": "manage_api_keys", "post": "manage_api_keys"})
api_keys_revoke_view = UserProfileViewSet.as_view({"delete": "revoke_key"})

urlpatterns = [
    path("register/", RegisterView.as_view(), name="register"),
    path("login/", LoginView.as_view(), name="login"),
    path("logout/", LogoutView.as_view(), name="logout"),
    path("me/", me_view, name="me"),
    path("refresh/", CustomTokenRefreshView.as_view(), name="token_refresh"),
    path("change-password/", ChangePasswordView.as_view(), name="change_password"),
    path("password-reset/", PasswordResetRequestView.as_view(), name="password_reset"),
    path(
        "password-reset/confirm/",
        PasswordResetConfirmView.as_view(),
        name="password_reset_confirm",
    ),
    # 2FA
    path("2fa/setup/", two_factor_setup_view, name="2fa_setup"),
    path("2fa/verify/", two_factor_verify_view, name="2fa_verify"),
    path("2fa/disable/", two_factor_disable_view, name="2fa_disable"),
    # Sessions
    path("sessions/", sessions_view, name="sessions_list"),
    path("sessions/revoke/", sessions_revoke_view, name="sessions_revoke"),
    # API Keys
    path("api-keys/", api_keys_view, name="api_keys"),
    path("api-keys/<str:key_id>/", api_keys_revoke_view, name="api_key_revoke"),
]


"""
User views for Learning Hub API.
"""

from rest_framework import generics, status, viewsets
from rest_framework.decorators import action
from rest_framework.parsers import MultiPartParser
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.throttling import ScopedRateThrottle
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenRefreshView

from drf_spectacular.utils import (
    extend_schema,
    extend_schema_view,
    OpenApiResponse,
)

from .models import User
from .serializers import (
    AvatarResponseSerializer,
    ChangePasswordSerializer,
    PasswordResetConfirmSerializer,
    PasswordResetRequestSerializer,
    TokenRefreshResponseSerializer,
    UserLoginSerializer,
    UserProfileSerializer,
    UserProfileUpdateSerializer,
    UserRegistrationSerializer,
    LogoutSerializer,
)


from .services import UserService


@extend_schema_view(post=extend_schema(responses={201: UserProfileSerializer}))
class RegisterView(generics.CreateAPIView):
    """
    User registration endpoint.

    POST /api/v1/auth/register/
    """

    serializer_class = UserRegistrationSerializer
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "auth"

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        # Generate tokens using Service
        tokens = UserService.generate_tokens(user)

        return Response(
            {
                "status": "success",
                "message": "Registration successful",
                "data": {
                    "user": UserProfileSerializer(user).data,
                    "accessToken": tokens["access_token"],
                    "refreshToken": tokens["refresh_token"],
                },
            },
            status=status.HTTP_201_CREATED,
        )


@extend_schema_view(post=extend_schema(responses={200: UserProfileSerializer}))
class LoginView(generics.GenericAPIView):
    """
    User login endpoint.

    POST /api/v1/auth/login/
    """

    serializer_class = UserLoginSerializer
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "auth"

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = serializer.validated_data["user"]
        tokens = serializer.validated_data["tokens"]

        # Update last login
        user.update_last_login()

        return Response(
            {
                "status": "success",
                "message": "Login successful",
                "data": {
                    "user": UserProfileSerializer(user).data,
                    "accessToken": tokens["access_token"],
                    "refreshToken": tokens["refresh_token"],
                },
            }
        )


@extend_schema_view(
    post=extend_schema(
        responses={200: OpenApiResponse(description="Logout successful")}
    )
)
class LogoutView(generics.GenericAPIView):
    """
    User logout endpoint - blacklists the refresh token.

    POST /api/v1/auth/logout/
    """

    permission_classes = [IsAuthenticated]
    serializer_class = LogoutSerializer

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        try:
            refresh_token = serializer.validated_data["refresh_token"]
            token = RefreshToken(refresh_token)
            token.blacklist()
        except Exception as e:
            # Log the error but don't fail the logout process for the user
            import logging

            logger = logging.getLogger(__name__)
            logger.warning(f"Failed to blacklist token during logout: {str(e)}")

        return Response({"status": "success", "message": "Logout successful"})


@extend_schema_view(post=extend_schema(responses={200: TokenRefreshResponseSerializer}))
class CustomTokenRefreshView(TokenRefreshView):
    """
    Custom token refresh view with consistent response format.

    POST /api/v1/auth/refresh/
    """

    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)

        if response.status_code == 200:
            return Response(
                {
                    "status": "success",
                    "message": "Token refreshed",
                    "data": {
                        "accessToken": response.data.get("access"),
                        "refreshToken": response.data.get("refresh"),
                    },
                }
            )

        return response


class PasswordResetRequestView(generics.GenericAPIView):
    """
    Request password reset - sends email with reset link.

    POST /api/v1/auth/password-reset/
    """

    serializer_class = PasswordResetRequestSerializer
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "auth"

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        email = serializer.validated_data["email"]

        UserService.request_password_reset(email)

        # Always return success to prevent email enumeration
        return Response(
            {
                "status": "success",
                "message": "If the email exists, a password reset link has been sent.",
            }
        )


@extend_schema_view(
    post=extend_schema(
        responses={200: OpenApiResponse(description="Password reset successful")}
    )
)
class PasswordResetConfirmView(generics.GenericAPIView):
    """
    Confirm password reset with token.

    POST /api/v1/auth/password-reset/confirm/
    """

    serializer_class = PasswordResetConfirmSerializer
    permission_classes = [AllowAny]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "auth"
    queryset = User.objects.none()

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        token = serializer.validated_data["token"]
        new_password = serializer.validated_data["new_password"]

        success = UserService.confirm_password_reset(token, new_password)

        if not success:
            return Response(
                {"status": "error", "message": "Reset token is invalid or expired."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {"status": "success", "message": "Password has been reset successfully."}
        )


@extend_schema_view(
    post=extend_schema(
        responses={200: OpenApiResponse(description="Password changed successfully")}
    )
)
class ChangePasswordView(generics.GenericAPIView):
    """
    Change password for authenticated user.

    POST /api/v1/auth/change-password/
    """

    serializer_class = ChangePasswordSerializer
    permission_classes = [IsAuthenticated]
    throttle_classes = [ScopedRateThrottle]
    throttle_scope = "auth"
    queryset = User.objects.none()

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = request.user
        user.set_password(serializer.validated_data["new_password"])
        user.save()

        return Response(
            {"status": "success", "message": "Password changed successfully."}
        )


@extend_schema_view(
    profile=extend_schema(responses={200: UserProfileSerializer}),
    avatar=extend_schema(responses={200: AvatarResponseSerializer}),
)
class UserProfileViewSet(viewsets.GenericViewSet):
    """
    User profile management.

    GET /api/v1/users/profile/ - Get current user profile
    PUT /api/v1/users/profile/ - Update profile
    POST /api/v1/users/avatar/ - Upload avatar
    """

    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.action == "update_profile":
            return UserProfileUpdateSerializer
        if self.action == "avatar":
            return AvatarResponseSerializer
        return UserProfileSerializer

    @action(detail=False, methods=["get"])
    def profile(self, request):
        """Get current user's profile."""
        serializer = UserProfileSerializer(request.user)
        return Response(
            {
                "status": "success",
                "message": "Profile retrieved",
                "data": serializer.data,
            }
        )

    @extend_schema(
        responses={200: UserProfileSerializer}, request=UserProfileUpdateSerializer
    )
    @profile.mapping.put
    def update_profile(self, request):
        """Update current user's profile."""
        serializer = UserProfileUpdateSerializer(
            request.user, data=request.data, partial=True
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response(
            {
                "status": "success",
                "message": "Profile updated",
                "data": UserProfileSerializer(request.user).data,
            }
        )

    @action(detail=False, methods=["post"], parser_classes=[MultiPartParser])
    def avatar(self, request):
        """Upload user avatar."""
        if "avatar" not in request.FILES:
            return Response(
                {"status": "error", "message": "No avatar file provided."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        avatar_url = UserService.update_avatar(request.user, request.FILES["avatar"])

        return Response(
            {
                "status": "success",
                "message": "Avatar uploaded",
                "data": {"avatar_url": avatar_url},
            }
        )

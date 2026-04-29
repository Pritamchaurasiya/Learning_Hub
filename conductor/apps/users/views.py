"""
User views for Learning Hub API.
"""

from rest_framework import generics, status, viewsets
from rest_framework.decorators import action, throttle_classes
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
from apps.core.throttles import LoginRateThrottle, RegistrationRateThrottle


@extend_schema_view(post=extend_schema(responses={201: UserProfileSerializer}))
@extend_schema(tags=["Auth"])
class RegisterView(generics.CreateAPIView):
    """
    User registration endpoint.

    POST /api/v1/auth/register/
    """

    serializer_class = UserRegistrationSerializer
    permission_classes = [AllowAny]
    throttle_classes = [RegistrationRateThrottle]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        # Generate tokens using Service
        tokens = UserService.generate_tokens(user)

        # Publish to EventBus — fires welcome notification + gamification XP
        try:
            from apps.core.event_bus import EventBus
            EventBus.publish("user.registered", {
                "user_id": user.id,
                "username": user.username,
                "email": user.email,
            })
        except Exception:
            pass  # EventBus is non-critical

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
@extend_schema(tags=["Auth"])
class LoginView(generics.GenericAPIView):
    """
    User login endpoint.

    POST /api/v1/auth/login/
    """

    serializer_class = UserLoginSerializer
    permission_classes = [AllowAny]
    throttle_classes = [LoginRateThrottle]

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
@extend_schema(tags=["Auth"])
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
            logger.warning("Failed to blacklist token during logout: %s", str(e))

        return Response({"status": "success", "message": "Logout successful"})


@extend_schema_view(post=extend_schema(responses={200: TokenRefreshResponseSerializer}))
@extend_schema(tags=["Auth"])
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


@extend_schema(tags=["Auth"])
class PasswordResetRequestView(generics.GenericAPIView):
    """
    Request password reset - sends email with reset link.

    POST /api/v1/auth/password-reset/
    """

    serializer_class = PasswordResetRequestSerializer
    permission_classes = [AllowAny]
    throttle_classes = [LoginRateThrottle]

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
@extend_schema(tags=["Auth"])
class PasswordResetConfirmView(generics.GenericAPIView):
    """
    Confirm password reset with token.

    POST /api/v1/auth/password-reset/confirm/
    """

    serializer_class = PasswordResetConfirmSerializer
    permission_classes = [AllowAny]
    throttle_classes = [LoginRateThrottle]
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
@extend_schema(tags=["Auth"])
class ChangePasswordView(generics.UpdateAPIView):
    """
    Change password for authenticated user.

    POST /api/v1/auth/change-password/
    """

    serializer_class = ChangePasswordSerializer
    permission_classes = [IsAuthenticated]
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
@extend_schema(tags=["Users"])
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
        """Upload user avatar with security validation."""
        if "avatar" not in request.FILES:
            return Response(
                {"status": "error", "message": "No avatar file provided."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        avatar_file = request.FILES["avatar"]
        
        # Validate file size (max 5MB)
        max_size = 5 * 1024 * 1024  # 5MB
        if avatar_file.size > max_size:
            return Response(
                {"status": "error", "message": "File too large. Maximum size is 5MB."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        
        # Validate file type
        allowed_types = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
        if avatar_file.content_type not in allowed_types:
            return Response(
                {"status": "error", "message": "Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        avatar_url = UserService.update_avatar(request.user, avatar_file)

        return Response(
            {
                "status": "success",
                "message": "Avatar uploaded",
                "data": {"avatar_url": avatar_url},
            }
        )

    @extend_schema(
        description="Get user's bookmarked courses",
        responses={200: dict}
    )
    @action(detail=False, methods=["get"], throttle_classes=[])
    def bookmarks(self, request):
        """Get user's bookmarked courses."""
        from apps.courses.serializers import CourseListSerializer
        from .models import Bookmark

        bookmarks = Bookmark.objects.filter(
            user=request.user
        ).select_related('course', 'course__instructor', 'course__category').order_by('-created_at')

        data = []
        for bookmark in bookmarks:
            course = bookmark.course
            data.append({
                'id': str(course.id),
                'title': course.title,
                'description': course.short_description or course.description[:200],
                'duration': f"{course.duration_hours} hours" if course.duration_hours else "Self-paced",
                'level': course.difficulty,
                'thumbnail': course.thumbnail.url if course.thumbnail else None,
                'instructor': course.instructor.display_name or course.instructor.username,
                'bookmark_id': str(bookmark.id),
                'bookmarked_at': bookmark.created_at.isoformat(),
                'notes': bookmark.notes,
            })

        return Response({
            'status': 'success',
            'count': len(data),
            'data': data
        })

    @extend_schema(
        description="Add a course to bookmarks",
        request=None,
        responses={201: dict}
    )
    @bookmarks.mapping.post
    @throttle_classes([ScopedRateThrottle])
    def add_bookmark(self, request):
        """Add a course to bookmarks."""
        from apps.courses.models import Course
        from .models import Bookmark

        course_id = request.data.get('course_id')
        notes = request.data.get('notes', '')

        if not course_id:
            return Response(
                {'status': 'error', 'message': 'course_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            course = Course.objects.get(id=course_id)
        except Course.DoesNotExist:
            return Response(
                {'status': 'error', 'message': 'Course not found'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Check if already bookmarked
        bookmark, created = Bookmark.objects.get_or_create(
            user=request.user,
            course=course,
            defaults={'notes': notes}
        )

        if not created:
            # Test expects 400 when bookmark already exists and 'error' in response
            return Response({
                'error': 'Course already in bookmarks'
            }, status=status.HTTP_400_BAD_REQUEST)

        return Response({
            'status': 'success',
            'message': 'Course bookmarked successfully',
            'data': {'bookmark_id': str(bookmark.id)}
        }, status=status.HTTP_201_CREATED)

    @extend_schema(
        description="Remove a course from bookmarks",
        responses={200: dict}
    )
    @action(detail=False, methods=["delete"], url_path='bookmarks/(?P<course_id>[^/.]+)', throttle_classes=[])
    def remove_bookmark(self, request, course_id=None):
        """Remove a course from bookmarks."""
        from .models import Bookmark

        try:
            bookmark = Bookmark.objects.get(user=request.user, course_id=course_id)
            bookmark.delete()
            return Response({
                'status': 'success',
                'message': 'Bookmark removed successfully'
            })
        except Bookmark.DoesNotExist:
            return Response(
                {'error': 'Bookmark not found'},
                status=status.HTTP_404_NOT_FOUND
            )

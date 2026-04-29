"""
User serializers for Learning Hub API.
"""

from django.contrib.auth import authenticate
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers
from rest_framework_simplejwt.tokens import RefreshToken

from .models import User


class UserRegistrationSerializer(serializers.ModelSerializer):
    """Serializer for user registration."""

    password = serializers.CharField(
        write_only=True,
        required=True,
        validators=[validate_password],
        style={"input_type": "password"},
    )
    password_confirm = serializers.CharField(
        write_only=True, required=True, style={"input_type": "password"}
    )

    class Meta:
        model = User
        fields = ["email", "username", "password", "password_confirm", "display_name"]
        extra_kwargs = {
            "email": {"required": True},
            "username": {"required": True},
        }

    def validate(self, attrs):
        """Validate that passwords match."""
        if attrs["password"] != attrs["password_confirm"]:
            raise serializers.ValidationError(
                {"password_confirm": "Passwords do not match."}
            )
        return attrs

    def create(self, validated_data):
        """Create a new user."""
        validated_data.pop("password_confirm")
        user = User.objects.create_user(**validated_data)
        return user


class UserLoginSerializer(serializers.Serializer):
    """Serializer for user login."""

    email = serializers.EmailField(required=True)
    password = serializers.CharField(
        required=True, write_only=True, style={"input_type": "password"}
    )

    def validate(self, attrs):
        """Validate credentials and return user with tokens."""
        email = attrs.get("email")
        password = attrs.get("password")

        # Get request from context for django-axes compatibility
        request = self.context.get("request")
        user = authenticate(request=request, username=email, password=password)

        if not user:
            raise serializers.ValidationError({"detail": "Invalid email or password."})

        if not user.is_active:
            raise serializers.ValidationError({"detail": "User account is disabled."})

        assert user is not None
        # Generate tokens
        refresh = RefreshToken.for_user(user)

        attrs["user"] = user
        attrs["tokens"] = {
            "access_token": str(refresh.access_token),  # type: ignore
            "refresh_token": str(refresh),
        }

        return attrs


class UserProfileSerializer(serializers.ModelSerializer):
    """Serializer for user profile."""
    xp = serializers.IntegerField(source='xp_profile.total_xp', read_only=True, default=0)
    level = serializers.IntegerField(source='xp_profile.level', read_only=True, default=1)
    streak = serializers.IntegerField(source='xp_profile.current_streak', read_only=True, default=0)

    class Meta:
        model = User
        fields = [
            "id",
            "email",
            "username",
            "role",
            "display_name",
            "avatar",
            "bio",
            "phone",
            "is_verified",
            "preferences",
            "created_at",
            "last_login_at",
            "xp",
            "level",
            "streak",
        ]
        read_only_fields = [
            "id",
            "email",
            "role",
            "is_verified",
            "created_at",
            "last_login_at",
            "xp",
            "level",
            "streak",
        ]


class UserProfileUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating user profile."""

    class Meta:
        model = User
        fields = ["display_name", "bio", "phone", "preferences"]


class ChangePasswordSerializer(serializers.Serializer):
    """Serializer for changing password."""

    current_password = serializers.CharField(
        required=True, write_only=True, style={"input_type": "password"}
    )
    new_password = serializers.CharField(
        required=True,
        write_only=True,
        validators=[validate_password],
        style={"input_type": "password"},
    )
    new_password_confirm = serializers.CharField(
        required=True, write_only=True, style={"input_type": "password"}
    )

    def validate(self, attrs):
        """Validate passwords."""
        if attrs["new_password"] != attrs["new_password_confirm"]:
            raise serializers.ValidationError(
                {"new_password_confirm": "New passwords do not match."}
            )
        return attrs

    def validate_current_password(self, value):
        """Validate current password."""
        user = self.context["request"].user
        if not user.check_password(value):
            raise serializers.ValidationError("Current password is incorrect.")
        return value


class PasswordResetRequestSerializer(serializers.Serializer):
    """Serializer for requesting password reset."""

    email = serializers.EmailField(required=True)

    def validate_email(self, value):
        """Validate that the email exists."""
        if not User.objects.filter(email=value, is_active=True).exists():
            # Don't reveal if email exists or not for security
            pass
        return value


class PasswordResetConfirmSerializer(serializers.Serializer):
    """Serializer for confirming password reset."""

    token = serializers.CharField(required=True)
    new_password = serializers.CharField(
        required=True,
        write_only=True,
        validators=[validate_password],
        style={"input_type": "password"},
    )
    new_password_confirm = serializers.CharField(
        required=True, write_only=True, style={"input_type": "password"}
    )

    def validate(self, attrs):
        """Validate passwords match."""
        if attrs["new_password"] != attrs["new_password_confirm"]:
            raise serializers.ValidationError(
                {"new_password_confirm": "Passwords do not match."}
            )
        return attrs


class UserListSerializer(serializers.ModelSerializer):
    """Serializer for listing users (minimal data)."""

    class Meta:
        model = User
        fields = ["id", "username", "display_name", "avatar", "role"]


class LogoutSerializer(serializers.Serializer):
    """Serializer for logout."""

    refresh_token = serializers.CharField(required=True)


class AvatarResponseSerializer(serializers.Serializer):
    avatar_url = serializers.URLField()


class TokenRefreshResponseSerializer(serializers.Serializer):
    accessToken = serializers.CharField()
    refreshToken = serializers.CharField()


class BookmarkSerializer(serializers.ModelSerializer):
    """Serializer for user bookmarks."""
    from apps.users.models import Bookmark
    
    course_title = serializers.CharField(source='course.title', read_only=True)
    course_slug = serializers.CharField(source='course.slug', read_only=True)
    course_id = serializers.UUIDField(write_only=True)
    
    class Meta:
        from apps.users.models import Bookmark
        model = Bookmark
        fields = ['course_id', 'course_title', 'course_slug', 'notes', 'created_at']
        read_only_fields = ['created_at']
        
    def validate_course_id(self, value):
        from apps.courses.models import Course
        if not Course.objects.filter(id=value).exists():
            raise serializers.ValidationError('Course does not exist.')
        return value
        
    def create(self, validated_data):
        from apps.courses.models import Course
        from apps.users.models import Bookmark
        
        user = self.context['request'].user
        course_id = validated_data.pop('course_id')
        course = Course.objects.get(id=course_id)
        
        if Bookmark.objects.filter(user=user, course=course).exists():
            raise serializers.ValidationError('Bookmark already exists.')
            
        bookmark = Bookmark.objects.create(user=user, course=course, **validated_data)
        return bookmark

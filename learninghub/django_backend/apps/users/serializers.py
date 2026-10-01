from rest_framework import serializers
from django.contrib.auth import authenticate
from django.contrib.auth.password_validation import validate_password
from .models import User, Profile

class ProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = Profile
        fields = ['headline', 'bio', 'github_url', 'linkedin_url', 'target_exam', 'college_target', 'preferences']

class UserSerializer(serializers.ModelSerializer):
    profile = ProfileSerializer(read_only=True)

    class Meta:
        model = User
        fields = [
            'id', 'email', 'username', 'role', 'avatar',
            'xp', 'level', 'streak', 'longest_streak', 'streak_freezes', 'timezone',
            'mfa_enabled', 'last_active', 'profile', 'created_at'
        ]
        read_only_fields = ['id', 'role', 'xp', 'level', 'streak', 'longest_streak', 'created_at']

    created_at = serializers.DateTimeField(source='date_joined', read_only=True)

class RegisterSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, min_length=8)
    username = serializers.CharField(required=False, allow_blank=True)
    role = serializers.ChoiceField(choices=['STUDENT', 'INSTRUCTOR'], default='STUDENT')

    def validate_email(self, value):
        norm_email = value.lower().strip()
        if User.objects.filter(email=norm_email).exists():
            raise serializers.ValidationError('A user with this email address already exists')
        return norm_email

    def validate_password(self, value):
        validate_password(value)
        return value

class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)

class AdminLoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)

class AdminRegisterSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, min_length=8)
    username = serializers.CharField()
    adminSecret = serializers.CharField(write_only=True)

    def validate_password(self, value):
        validate_password(value)
        return value

class MfaVerifySerializer(serializers.Serializer):
    userId = serializers.CharField()
    token = serializers.CharField(max_length=10)

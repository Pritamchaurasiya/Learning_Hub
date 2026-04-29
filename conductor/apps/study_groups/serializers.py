from rest_framework import serializers
from .models import StudyGroup, GroupMembership
from apps.users.serializers import UserListSerializer


class GroupMembershipSerializer(serializers.ModelSerializer):
    user = UserListSerializer(read_only=True)

    class Meta:
        model = GroupMembership
        fields = ['id', 'user', 'role', 'joined_at']


class StudyGroupSerializer(serializers.ModelSerializer):
    creator = UserListSerializer(read_only=True)
    member_count = serializers.IntegerField(read_only=True)
    is_member = serializers.SerializerMethodField()

    class Meta:
        model = StudyGroup
        fields = ['id', 'name', 'description', 'topic', 'creator', 
                  'max_members', 'is_public', 'member_count', 'is_member', 'created_at']

    def get_is_member(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.memberships.filter(user=request.user).exists()
        return False


class StudyGroupCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = StudyGroup
        fields = ['name', 'description', 'topic', 'max_members', 'is_public']

from rest_framework import serializers
from .models import LiveSession, SessionAttendee
from apps.users.serializers import UserListSerializer

class LiveSessionSerializer(serializers.ModelSerializer):
    host = UserListSerializer(read_only=True)
    attendee_count = serializers.SerializerMethodField()
    is_attending = serializers.SerializerMethodField()

    class Meta:
        model = LiveSession
        fields = ['id', 'title', 'description', 'course', 'host', 'scheduled_time', 
                  'duration_minutes', 'meeting_url', 'status', 'thumbnail',
                  'attendee_count', 'is_attending']

    def get_attendee_count(self, obj):
        return obj.attendees.count()

    def get_is_attending(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.attendees.filter(user=request.user).exists()
        return False

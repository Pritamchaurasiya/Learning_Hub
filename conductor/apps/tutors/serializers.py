from rest_framework import serializers
from .models import TutorProfile, Booking
from apps.users.serializers import UserListSerializer

class TutorProfileSerializer(serializers.ModelSerializer):
    user = UserListSerializer(read_only=True)
    
    class Meta:
        model = TutorProfile
        fields = ['id', 'user', 'bio', 'hourly_rate', 'skills', 'rating', 'total_reviews', 'is_verified']

class BookingSerializer(serializers.ModelSerializer):
    tutor_details = TutorProfileSerializer(source='tutor', read_only=True)
    student_details = UserListSerializer(source='student', read_only=True)

    class Meta:
        model = Booking
        fields = ['id', 'student', 'tutor', 'start_time', 'end_time', 'status', 'notes', 'meeting_link', 'tutor_details', 'student_details']
        read_only_fields = ['id', 'student', 'status', 'meeting_link']

    def validate(self, data):
        # Prevent overlaps
        start = data['start_time']
        end = data['end_time']
        tutor = data['tutor']
        
        overlapping = Booking.objects.filter(
            tutor=tutor,
            status='confirmed',
            start_time__lt=end,
            end_time__gt=start
        ).exists()
        
        if overlapping:
            raise serializers.ValidationError("This slot is already booked.")
        return data

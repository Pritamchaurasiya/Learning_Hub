from rest_framework import serializers
from .models import Feedback

class FeedbackSerializer(serializers.ModelSerializer):
    class Meta:
        model = Feedback
        fields = [
            'id', 'category', 'subject', 'message', 
            'status', 'urgency_score', 'ai_suggested_response',
            'admin_response', 'created_at'
        ]
        read_only_fields = [
            'id', 'status', 'urgency_score', 'ai_suggested_response', 
            'admin_response', 'created_at'
        ]

from rest_framework import serializers
from drf_spectacular.utils import extend_schema_field
from .models import Conversation, Message
from apps.users.serializers import UserListSerializer

class MessageSerializer(serializers.ModelSerializer):
    sender = UserListSerializer(read_only=True)
    is_me = serializers.SerializerMethodField()

    class Meta:
        model = Message
        fields = ['id', 'conversation', 'sender', 'content', 'created_at', 'is_me']
        read_only_fields = ['id', 'conversation', 'sender', 'created_at', 'is_me']

    def get_is_me(self, obj):
        request = self.context.get('request')
        if request and request.user:
            return obj.sender == request.user
        return False

class ConversationSerializer(serializers.ModelSerializer):
    participants = UserListSerializer(many=True, read_only=True)
    last_message = serializers.SerializerMethodField()

    class Meta:
        model = Conversation
        fields = ['id', 'participants', 'last_message', 'last_message_at', 'created_at']

    @extend_schema_field(dict)
    def get_last_message(self, obj):
        last_msg = obj.messages.last()
        if last_msg:
            return MessageSerializer(last_msg, context=self.context).data
        return None

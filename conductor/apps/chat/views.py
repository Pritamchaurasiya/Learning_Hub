from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Prefetch, Q
from drf_spectacular.utils import extend_schema
from .models import Conversation, Message
from .serializers import ConversationSerializer, MessageSerializer
from apps.users.models import User


@extend_schema(tags=["Chat"])
class ConversationViewSet(viewsets.ModelViewSet):
    """
    API for listing and creating conversations.

    list:   GET  /api/v1/chat/conversations/     — user's conversations
    create: POST /api/v1/chat/conversations/     — create new conversation
    start:  POST /api/v1/chat/conversations/start/ — start 1-on-1 conversation
    """
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = ConversationSerializer

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return Conversation.objects.none()
            
        return Conversation.objects.filter(
            participants=self.request.user
        ).prefetch_related(
            'participants',
            Prefetch('messages', queryset=Message.objects.order_by('created_at'))
        )

    def perform_create(self, serializer):
        """Create conversation and add the requesting user as participant."""
        conversation = serializer.save()
        conversation.participants.add(self.request.user)

        # Add other participants from request data
        participant_ids = self.request.data.get('participant_ids', [])
        if participant_ids:
            participants = User.objects.filter(id__in=participant_ids)
            conversation.participants.add(*participants)

    @action(detail=False, methods=['post'])
    def start(self, request):
        """Start or get existing conversation with a user."""
        target_user_id = request.data.get('user_id')
        if not target_user_id:
            return Response(
                {'status': 'error', 'message': 'user_id required'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            target_user = User.objects.get(id=target_user_id)
        except User.DoesNotExist:
            return Response(
                {'status': 'error', 'message': 'User not found'},
                status=status.HTTP_404_NOT_FOUND,
            )

        # Check existing 1-on-1
        existing = (
            Conversation.objects.filter(participants=request.user)
            .filter(participants=target_user)
            .first()
        )

        if existing:
            serializer = self.get_serializer(existing)
            return Response({'status': 'success', 'data': serializer.data})

        conversation = Conversation.objects.create()
        conversation.participants.add(request.user, target_user)
        serializer = self.get_serializer(conversation)
        return Response(
            {'status': 'success', 'data': serializer.data},
            status=status.HTTP_201_CREATED,
        )


@extend_schema(tags=["Chat"])
class MessageViewSet(viewsets.ModelViewSet):
    """
    API for messages within a conversation.

    list:   GET  /api/v1/chat/messages/     — user's messages
    create: POST /api/v1/chat/messages/     — send message
    """
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = MessageSerializer

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return Message.objects.none()
            
        return Message.objects.filter(
            conversation__participants=self.request.user
        ).select_related('sender', 'conversation')

    def perform_create(self, serializer):
        conversation_id = self.request.data.get('conversation')
        try:
            conversation = Conversation.objects.get(id=conversation_id)
        except Conversation.DoesNotExist:
            from rest_framework.exceptions import NotFound
            raise NotFound("Conversation not found")

        if self.request.user not in conversation.participants.all():
            raise permissions.PermissionDenied("You are not a participant")

        serializer.save(sender=self.request.user)
        conversation.last_message_at = serializer.instance.created_at
        conversation.save(update_fields=['last_message_at'])

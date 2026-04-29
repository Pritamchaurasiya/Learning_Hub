
import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from .models import StudyGroup, GroupMessage
from django.contrib.auth import get_user_model
from apps.ai_engine.moderation_service import ModerationService

User = get_user_model()

class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.room_id = self.scope['url_route']['kwargs']['room_id']
        self.room_group_name = f'chat_{self.room_id}'
        
        # Auth Check
        self.user = self.scope["user"]
        if not self.user.is_authenticated:
            await self.close()
            return

        # Optional: Check if user is member of the group
        # is_member = await self.check_membership(self.room_id, self.user)
        # if not is_member: await self.close(); return

        # Join room group
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )

        await self.accept()

        # Notify others
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'user_status',
                'status': 'online',
                'user_id': self.user.id,
                'username': self.user.username
            }
        )

    async def disconnect(self, close_code):
        # Leave room group
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )
        
        # Notify others
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'user_status',
                'status': 'offline',
                'user_id': self.user.id,
                'username': self.user.username
            }
        )

    # Receive message from WebSocket
        text_data_json = json.loads(text_data)
        message = text_data_json['message']
        sender_id = self.user.id
        
        # 1. AI Moderation Check
        # Wrap sync service call
        mod_result = await database_sync_to_async(ModerationService.check_message)(message)
        
        if not mod_result.get("is_safe", True):
            # Reject message
            await self.send(text_data=json.dumps({
                'type': 'moderation_alert',
                'title': 'Message Blocked',
                'message': f"Your message was flagged for {', '.join(mod_result.get('flags', []))}.",
                'reason': mod_result.get('reason')
            }))
            return

        # Save to DB
        await self.save_message(self.room_id, self.user, message)

        # Gamification: Award XP for activity
        from apps.gamification.services import GamificationService
        await database_sync_to_async(GamificationService.award_xp)(self.user, 10, "Study Group Participation")

        # Send message to room group
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'chat_message',
                'message': message,
                'sender_id': sender_id,
                'sender_name': self.user.username, # Or display_name
                'timestamp': 'Just now' # Improve with real formatting
            }
        )

    # Receive message from room group
    async def chat_message(self, event):
        message = event['message']
        sender_id = event['sender_id']
        sender_name = event['sender_name']

        # Send message to WebSocket
        await self.send(text_data=json.dumps({
            'message': message,
            'sender_id': sender_id,
            'sender_name': sender_name
        }))

    async def user_status(self, event):
        """Handle user status updates (online/offline)."""
        await self.send(text_data=json.dumps({
            'type': 'user_status',
            'status': event['status'],
            'user_id': event['user_id'],
            'username': event['username']
        }))

    @database_sync_to_async
    def save_message(self, group_id, user, content):
        GroupMessage.objects.create(group_id=group_id, sender=user, content=content)
    
    # @database_sync_to_async
    # def check_membership(self, group_id, user):
    #     return GroupMembership.objects.filter(group_id=group_id, user=user).exists()

class StudyRoomConsumer(ChatConsumer):
    """
    Extends ChatConsumer to add Real-Time Video Synchronization.
    """
    async def receive(self, text_data):
        text_data_json = json.loads(text_data)
        message_type = text_data_json.get('type')
        
        if message_type == 'chat_message':
            # Use parent logic for chat
            await super().receive(text_data)
        elif message_type in ['video_play', 'video_pause', 'video_seek']:
            # Handle Sync Logic
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'video_sync_event',
                    'event_type': message_type,
                    'timestamp': text_data_json.get('timestamp'),
                    'sender_id': self.user.id
                }
            )

    async def video_sync_event(self, event):
        """Broadcast video events to clients."""
        # Don't echo back to sender if we want purely optimistic UI, 
        # but usually echo is fine/safer for "Server Truth".
        # Here we echo, frontend decides if it ignores its own ID.
        await self.send(text_data=json.dumps({
            'type': event['event_type'],
            'timestamp': event['timestamp'],
            'sender_id': event['sender_id']
        }))

import json
import secrets
import structlog
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.core.cache import cache
from .models import Message, Conversation
from django.contrib.auth import get_user_model
from apps.ai_engine.ai_client import AIClient
from asgiref.sync import sync_to_async
import asyncio

User = get_user_model()
logger = structlog.get_logger(__name__)

class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.room_name = self.scope['url_route']['kwargs']['room_id']
        self.room_group_name = f'chat_{self.room_name}'
        self.user = self.scope.get("user")

        # Context for logging
        log_context = {
            "channel_name": self.channel_name,
            "room_id": self.room_name,
            "user_id": self.user.id if self.user and hasattr(self.user, 'id') else None,
        }

        # Check if user is authenticated
        if not self.user or self.user.is_anonymous:
            await logger.awarning("websocket_connect_rejected_anonymous", **log_context)
            await self.close()
            return

        # Check participation
        if not await self.is_participant(self.room_name, self.user):
            await logger.awarning("websocket_connect_rejected_forbidden", **log_context)
            await self.close()
            return

        # Join room group
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )

        await self.accept()
        await self.update_presence("online")
        await logger.ainfo("websocket_connected", **log_context)

    async def disconnect(self, close_code):
        if hasattr(self, 'user') and not self.user.is_anonymous:
            await self.update_presence("offline")
            
        # Leave room group
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )
        await logger.ainfo("websocket_disconnected", room_id=getattr(self, 'room_name', 'unknown'), code=close_code)

    async def update_presence(self, status):
        """Update presence in Redis and broadcast to the room."""
        if not hasattr(self, 'user') or self.user.is_anonymous:
            return
            
        cache_key = f"user_presence_{self.user.id}"
        if status == "online":
            await sync_to_async(cache.set)(cache_key, "online", 300) # 5m timeout
        else:
            await sync_to_async(cache.delete)(cache_key)
        
        # Broadcast presence change to room
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'presence_update',
                'user_id': self.user.id,
                'status': status
            }
        )

    async def presence_update(self, event):
        if event['user_id'] != self.user.id:
            await self.send(text_data=json.dumps({
                'type': 'presence_update',
                'user_id': event['user_id'],
                'status': event['status']
            }))

    # Receive message from WebSocket
    async def receive(self, text_data):
        try:
            text_data_json = json.loads(text_data)
        except json.JSONDecodeError:
            await logger.aerror("websocket_receive_json_error", error="Invalid JSON")
            return

        message_type = text_data_json.get('type', 'chat_message')
        
        if message_type == 'typing':
             await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'user_typing',
                    'sender_id': self.user.id,
                    'is_typing': text_data_json.get('is_typing', True)
                }
            )
             return

        if message_type == 'message_ack':
            # Handle client acknowledging receipt
            message_id = text_data_json.get('message_id')
            await self.mark_message_delivered(message_id)
            return

        if message_type == 'ask_ai':
            user_question = text_data_json.get('message', '')
            if user_question:
                await self.stream_ai_response(user_question)
            return

        message = text_data_json.get('message', '')
        if not message:
            return

        sender_id = self.user.id

        # Save to DB
        saved_message = await self.save_message(self.room_name, sender_id, message)

        # Notify sender instantly that it hit our server
        await self.send(text_data=json.dumps({
            'type': 'server_ack',
            'message_id': str(saved_message.id),
            'status': 'sent'
        }))

        # Send message to room group
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'chat_message',
                'message_id': str(saved_message.id),
                'message': message,
                'sender_id': sender_id,
                'timestamp': str(saved_message.created_at)
            }
        )
        await logger.adebug("websocket_message_processed", sender_id=sender_id, room_id=self.room_name)

    # Receive message from room group
    async def chat_message(self, event):
        message = event['message']
        sender_id = event['sender_id']
        timestamp = event['timestamp']
        message_id = event.get('message_id')

        # Send message to WebSocket
        await self.send(text_data=json.dumps({
            'type': 'chat_message',
            'message_id': message_id,
            'message': message,
            'sender_id': sender_id,
            'timestamp': timestamp,
            'is_me': sender_id == self.user.id
        }))

    async def user_typing(self, event):
        sender_id = event['sender_id']
        is_typing = event['is_typing']
        
        if sender_id != self.user.id:
            await self.send(text_data=json.dumps({
                'type': 'user_typing',
                'sender_id': sender_id,
                'is_typing': is_typing
            }))

    @database_sync_to_async
    def mark_message_delivered(self, message_id):
        # We process this but don't strictly require it to block
        pass

    @database_sync_to_async
    def save_message(self, conversation_id, sender_id, content):
        try:
            conversation = Conversation.objects.get(id=conversation_id)
            sender = User.objects.get(id=sender_id)
            return Message.objects.create(
                conversation=conversation,
                sender=sender,
                content=content
            )
        except Exception as e:
            logger.error("save_message_failed", error=str(e), conversation_id=conversation_id)
            raise e

    @database_sync_to_async
    def is_participant(self, conversation_id, user):
        try:
            return Conversation.objects.filter(id=conversation_id, participants=user).exists()
        except Conversation.DoesNotExist:
            return False
        except Exception as e:
            logger.error("check_participant_failed", error=str(e))
            return False

    async def stream_ai_response(self, question):
        """
        Streams AI response back to the socket.
        """
        # Notify start
        await self.send(text_data=json.dumps({
            'type': 'ai_stream_start',
            'sender_id': 'ai_bot',
        }))

        # Run generator in thread to avoid blocking loop
        def get_stream():
            return AIClient.stream_dsa_chat_response(
                context_prompt="You are a helpful DSA tutor.",
                user_question=question
            )
        
        loop = asyncio.get_running_loop()
        
        def run_sync_stream():
            response_text = ""
            stream = get_stream()
            for chunk in stream:
                 # Schedule the send on the loop
                 asyncio.run_coroutine_threadsafe(
                     self.send(text_data=json.dumps({
                        'type': 'ai_stream_chunk',
                        'chunk': chunk,
                        'sender_id': 'ai_bot'
                     })),
                     loop
                 )
                 response_text += chunk
            return response_text

        try:
            full_response = await loop.run_in_executor(None, run_sync_stream)
        except Exception as e:
            await logger.aerror("ai_stream_failed", error=str(e))
            full_response = "I encountered an error generating a response."

        # Notify end
        await self.send(text_data=json.dumps({
            'type': 'ai_stream_end',
            'full_response': full_response,
            'sender_id': 'ai_bot'
        }))

        # Save AI response to DB
        if full_response:
            ai_user = await self.get_ai_user()
            if ai_user:
                await self.save_message(self.room_name, ai_user.id, full_response)

    @database_sync_to_async
    def get_ai_user(self):
        """Get or create the system AI user."""
        try:
            secure_pass = secrets.token_urlsafe(32)
            
            user, _ = User.objects.get_or_create(
                email="ai@learninghub.com",
                defaults={
                    "username": "AI_Tutor",
                    "display_name": "AI Tutor",
                    "role": "admin",
                    "is_active": True,
                    "is_verified": True
                }
            )
            if not user.has_usable_password():
                user.set_password(secure_pass)
                user.save()
            return user
        except Exception as e:
            logger.error("get_ai_user_failed", error=str(e))
            return User.objects.filter(is_superuser=True).first()

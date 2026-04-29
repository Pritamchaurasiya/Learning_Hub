"""
Real-Time WebSocket Handlers

Comprehensive WebSocket infrastructure for:
1. Live notifications
2. Real-time chat
3. Collaborative features
4. Live session streaming
5. Presence tracking
"""

import json
import logging
from datetime import timedelta
from typing import Dict, Any, Optional, Set
from enum import Enum

from channels.generic.websocket import AsyncJsonWebsocketConsumer
from channels.db import database_sync_to_async
from django.utils import timezone
from django.core.cache import cache

logger = logging.getLogger(__name__)


class WebSocketEventType(Enum):
    """WebSocket event types."""
    # Connection events
    CONNECT = "connect"
    DISCONNECT = "disconnect"
    ERROR = "error"
    
    # Notification events
    NOTIFICATION = "notification"
    NOTIFICATION_READ = "notification_read"
    
    # Chat events
    MESSAGE = "message"
    TYPING = "typing"
    READ_RECEIPT = "read_receipt"
    
    # Presence events
    PRESENCE_UPDATE = "presence_update"
    USER_ONLINE = "user_online"
    USER_OFFLINE = "user_offline"
    
    # Learning events
    LESSON_PROGRESS = "lesson_progress"
    QUIZ_RESULT = "quiz_result"
    ACHIEVEMENT_UNLOCKED = "achievement_unlocked"
    STREAK_UPDATE = "streak_update"
    
    # Live session events
    SESSION_STARTED = "session_started"
    SESSION_ENDED = "session_ended"
    POLL_CREATED = "poll_created"
    POLL_RESULT = "poll_result"
    QUESTION_ASKED = "question_asked"
    
    # Collaboration events
    NOTE_UPDATED = "note_updated"
    CURSOR_MOVE = "cursor_move"
    
    # AI events
    AI_ACTION_RESULT = "ai_action_result"


class BaseWebSocketConsumer(AsyncJsonWebsocketConsumer):
    """
    Base WebSocket consumer with common functionality.
    """
    
    async def connect(self):
        """Handle connection."""
        self.user = self.scope.get("user")
        
        if not self.user or not self.user.is_authenticated:
            await self.close()
            return
        
        self.user_id = str(self.user.id)
        self.groups: Set[str] = set()
        
        await self.accept()
        
        # Join user's personal channel
        await self.join_group(f"user_{self.user_id}")
        
        # Update online status
        await self.set_online_status(True)
        
        logger.info(f"WebSocket connected: user {self.user_id}")
    
    async def disconnect(self, close_code):
        """Handle disconnection."""
        # Leave all groups
        for group in self.groups.copy():
            await self.leave_group(group)
        
        # Update offline status
        if hasattr(self, 'user_id'):
            await self.set_online_status(False)
            logger.info(f"WebSocket disconnected: user {self.user_id}")
    
    async def receive_json(self, content: Dict):
        """Handle incoming message."""
        try:
            event_type = content.get("type")
            data = content.get("data", {})
            
            handler = getattr(self, f"handle_{event_type}", None)
            if handler:
                await handler(data)
            else:
                await self.send_error(f"Unknown event type: {event_type}")
        
        except Exception as e:
            logger.error(f"WebSocket error: {e}")
            await self.send_error(str(e))
    
    async def join_group(self, group_name: str):
        """Join a channel group."""
        await self.channel_layer.group_add(group_name, self.channel_name)
        self.groups.add(group_name)
    
    async def leave_group(self, group_name: str):
        """Leave a channel group."""
        await self.channel_layer.group_discard(group_name, self.channel_name)
        self.groups.discard(group_name)
    
    async def send_event(self, event_type: WebSocketEventType, data: Dict):
        """Send an event to client."""
        await self.send_json({
            "type": event_type.value,
            "data": data,
            "timestamp": timezone.now().isoformat()
        })
    
    async def send_error(self, message: str):
        """Send error to client."""
        await self.send_event(WebSocketEventType.ERROR, {"message": message})
    
    @database_sync_to_async
    def set_online_status(self, is_online: bool):
        """Update user online status in cache."""
        cache_key = f"user_online:{self.user_id}"
        if is_online:
            cache.set(cache_key, timezone.now().isoformat(), timeout=300)
        else:
            cache.delete(cache_key)
            
    async def ai_action_result(self, event):
        """Handle AI Action async broadcast."""
        await self.send_event(WebSocketEventType.AI_ACTION_RESULT, event.get("data", {}))


class NotificationConsumer(BaseWebSocketConsumer):
    """
    WebSocket consumer for real-time notifications.
    """
    
    async def notification_message(self, event):
        """Handle notification broadcast."""
        await self.send_event(
            WebSocketEventType.NOTIFICATION,
            event.get("data", {})
        )
    
    async def handle_mark_read(self, data: Dict):
        """Mark notification as read."""
        notification_id = data.get("notification_id")
        if notification_id:
            await self.mark_notification_read(notification_id)
            await self.send_event(
                WebSocketEventType.NOTIFICATION_READ,
                {"notification_id": notification_id}
            )
    
    @database_sync_to_async
    def mark_notification_read(self, notification_id: str):
        """Mark notification as read in database."""
        from apps.notifications.models import Notification
        Notification.objects.filter(
            id=notification_id,
            user_id=self.user_id
        ).update(is_read=True, read_at=timezone.now())


class ChatConsumer(BaseWebSocketConsumer):
    """
    WebSocket consumer for real-time chat.
    """
    
    async def connect(self):
        await super().connect()
        
        # Get room from URL
        self.room_id = self.scope["url_route"]["kwargs"].get("room_id")
        if self.room_id:
            self.room_group = f"chat_{self.room_id}"
            await self.join_group(self.room_group)
    
    async def chat_message(self, event):
        """Handle incoming chat broadcast."""
        await self.send_event(WebSocketEventType.MESSAGE, event.get("data", {}))
    
    async def handle_message(self, data: Dict):
        """Handle outgoing message."""
        message = data.get("message", "").strip()
        if not message:
            return
        
        # Save message
        saved_msg = await self.save_message(message)
        
        # Broadcast to room
        await self.channel_layer.group_send(
            self.room_group,
            {
                "type": "chat_message",
                "data": {
                    "id": str(saved_msg.id) if saved_msg else None,
                    "user_id": self.user_id,
                    "username": self.user.username,
                    "message": message,
                    "timestamp": timezone.now().isoformat()
                }
            }
        )
    
    async def handle_typing(self, data: Dict):
        """Handle typing indicator."""
        await self.channel_layer.group_send(
            self.room_group,
            {
                "type": "typing_indicator",
                "data": {
                    "user_id": self.user_id,
                    "username": self.user.username,
                    "is_typing": data.get("is_typing", True)
                }
            }
        )
    
    async def typing_indicator(self, event):
        """Handle typing indicator broadcast."""
        # Don't send to self
        if event["data"]["user_id"] != self.user_id:
            await self.send_event(WebSocketEventType.TYPING, event["data"])
    
    @database_sync_to_async
    def save_message(self, content: str):
        """Save chat message to database."""
        from apps.discussions.models import ChatMessage
        
        return ChatMessage.objects.create(
            room_id=self.room_id,
            user_id=self.user_id,
            content=content
        )


class LiveSessionConsumer(BaseWebSocketConsumer):
    """
    WebSocket consumer for live sessions.
    """
    
    async def connect(self):
        await super().connect()
        
        self.session_id = self.scope["url_route"]["kwargs"].get("session_id")
        if self.session_id:
            self.session_group = f"live_session_{self.session_id}"
            await self.join_group(self.session_group)
            
            # Notify others of join
            await self.broadcast_presence("joined")
    
    async def disconnect(self, close_code):
        if hasattr(self, 'session_group'):
            await self.broadcast_presence("left")
        await super().disconnect(close_code)
    
    async def broadcast_presence(self, action: str):
        """Broadcast presence update."""
        await self.channel_layer.group_send(
            self.session_group,
            {
                "type": "presence_update",
                "data": {
                    "user_id": self.user_id,
                    "username": self.user.username,
                    "action": action,
                    "timestamp": timezone.now().isoformat()
                }
            }
        )
    
    async def presence_update(self, event):
        """Handle presence broadcast."""
        await self.send_event(WebSocketEventType.PRESENCE_UPDATE, event["data"])
    
    async def poll_created(self, event):
        """Handle poll created broadcast."""
        await self.send_event(WebSocketEventType.POLL_CREATED, event["data"])
    
    async def poll_result(self, event):
        """Handle poll result broadcast."""
        await self.send_event(WebSocketEventType.POLL_RESULT, event["data"])
    
    async def session_event(self, event):
        """Handle session event broadcast."""
        event_type = event.get("event_type", "session_started")
        ws_event = WebSocketEventType.SESSION_STARTED if event_type == "started" else WebSocketEventType.SESSION_ENDED
        await self.send_event(ws_event, event["data"])


class CollaborationConsumer(BaseWebSocketConsumer):
    """
    WebSocket consumer for real-time collaboration (notes, documents).
    """
    
    async def connect(self):
        await super().connect()
        
        self.document_id = self.scope["url_route"]["kwargs"].get("document_id")
        if self.document_id:
            self.doc_group = f"collab_{self.document_id}"
            await self.join_group(self.doc_group)
    
    async def handle_update(self, data: Dict):
        """Handle document update."""
        # Broadcast to others
        await self.channel_layer.group_send(
            self.doc_group,
            {
                "type": "note_updated",
                "data": {
                    "user_id": self.user_id,
                    "username": self.user.username,
                    "content": data.get("content"),
                    "cursor_position": data.get("cursor_position"),
                    "timestamp": timezone.now().isoformat()
                }
            }
        )
    
    async def handle_cursor(self, data: Dict):
        """Handle cursor movement."""
        await self.channel_layer.group_send(
            self.doc_group,
            {
                "type": "cursor_move",
                "data": {
                    "user_id": self.user_id,
                    "username": self.user.username,
                    "position": data.get("position")
                }
            }
        )
    
    async def note_updated(self, event):
        """Handle note update broadcast."""
        if event["data"]["user_id"] != self.user_id:
            await self.send_event(WebSocketEventType.NOTE_UPDATED, event["data"])
    
    async def cursor_move(self, event):
        """Handle cursor move broadcast."""
        if event["data"]["user_id"] != self.user_id:
            await self.send_event(WebSocketEventType.CURSOR_MOVE, event["data"])


class LearningProgressConsumer(BaseWebSocketConsumer):
    """
    WebSocket consumer for learning progress updates.
    """
    
    async def achievement_unlocked(self, event):
        """Handle achievement unlocked broadcast."""
        await self.send_event(WebSocketEventType.ACHIEVEMENT_UNLOCKED, event["data"])
    
    async def streak_update(self, event):
        """Handle streak update broadcast."""
        await self.send_event(WebSocketEventType.STREAK_UPDATE, event["data"])
    
    async def quiz_result(self, event):
        """Handle quiz result broadcast."""
        await self.send_event(WebSocketEventType.QUIZ_RESULT, event["data"])


class SocialConsumer(BaseWebSocketConsumer):
    """
    WebSocket consumer for Real-Time Social & Gamification Feeds.
    Broadcasts platform-wide level-ups, badge unlocks, and milestones.
    """
    
    async def connect(self):
        await super().connect()
        # Join global social/activity feed
        self.feed_group = "global_activity_feed"
        await self.join_group(self.feed_group)
        
    async def feed_event(self, event):
        """Handle social feed event broadcast."""
        # Wrap it in "social_message" type for Flutter's SocialWebsocketService decoder
        await self.send_event(
            WebSocketEventType.NOTIFICATION, # We reuse the NOTIFICATION type, or push raw
            event["data"]
        )
        
        # We'll specifically dump raw JSON into the sink so Flutter's jsonDecode catches it cleanly as a map.
        # Actually our `send_event` wraps in `{"type": ..., "data": ...}` 
        # But flutter expects: `jsonDecode(messageStr)`
        # Let's override `send_event` locally to ensure perfect flutter compatibility.
        payload = {
            "type": "social_message",
            "event_type": event.get("event_type", "unknown"),
            "data": event["data"],
            "timestamp": event.get("timestamp", timezone.now().isoformat())
        }
        await self.send_json(payload)


class AIHintConsumer(BaseWebSocketConsumer):
    """
    WebSocket consumer for Real-Time AI Assistance.
    Analyzes user activity and pushes hints or guidance.
    """
    
    async def connect(self):
        await super().connect()
        # Personal AI channel
        self.ai_group = f"ai_assist_{self.user_id}"
        await self.join_group(self.ai_group)
    
    async def handle_request_hint(self, data: Dict):
        """Handle explicit hint request."""
        context = data.get("context", {}) # e.g., current code, problem ID
        
        # Simulate AI processing (async)
        # In production, this would offload to Celery or call AIClient
        await self.send_event(
            WebSocketEventType.NOTIFICATION, 
            {
                "title": "AI Thinking...",
                "message": "Analyzing your solution..."
            }
        )
        
        # Placeholder response
        hint = await self._generate_hint(context)
        
        await self.send_event(
            "ai_hint",
            {
                "hint": hint,
                "problem_id": context.get("problem_id")
            }
        )
        
    async def _generate_hint(self, context: Dict) -> str:
        """Generate hint using AI Engine."""
        from apps.ai_engine.ai_client import AIClient
        
        problem_title = context.get("title", "Unknown Problem")
        problem_desc = context.get("description", "")
        # Default to level 1 if not provided, or fetch from user profile if possible
        user_level = context.get("level", 1) 
        
        # We need to run the synchronous AIClient method in a thread
        hint = await database_sync_to_async(AIClient.generate_problem_hint)(
            problem_title=problem_title,
            problem_description=problem_desc,
            user_level=user_level
        )
        return hint


# ==========================================================================
# HELPER FUNCTIONS
# ==========================================================================

async def send_notification_to_user(user_id: str, notification_data: Dict):
    """
    Send a notification to a specific user via WebSocket.
    """
    from channels.layers import get_channel_layer
    
    channel_layer = get_channel_layer()
    await channel_layer.group_send(
        f"user_{user_id}",
        {
            "type": "notification_message",
            "data": notification_data
        }
    )


async def broadcast_to_session(session_id: str, event_type: str, data: Dict):
    """
    Broadcast an event to all participants in a live session.
    """
    from channels.layers import get_channel_layer
    
    channel_layer = get_channel_layer()
    await channel_layer.group_send(
        f"live_session_{session_id}",
        {
            "type": event_type,
            "data": data
        }
    )


def is_user_online(user_id: str) -> bool:
    """Check if a user is currently online."""
    cache_key = f"user_online:{user_id}"
    return cache.get(cache_key) is not None

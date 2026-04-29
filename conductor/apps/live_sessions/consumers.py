
import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async

class LiveSessionConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.session_id = self.scope['url_route']['kwargs']['session_id']
        self.room_group_name = f'live_{self.session_id}'
        self.user = self.scope["user"]

        if not self.user.is_authenticated:
            await self.close()
            return

        # Join session group
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )

        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

    # Receive from WebSocket (Client -> Server)
    async def receive(self, text_data):
        data = json.loads(text_data)
        msg_type = data.get('type')
        
        # Only Host Can Control Session
        is_host = await self.check_is_host(self.session_id, self.user)
        
        if msg_type == 'push_question' and is_host:
            # Broadast question to everyone
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'session_event',
                    'event': 'new_question',
                    'payload': data.get('question_data')
                }
            )
        
        elif msg_type == 'submit_answer':
            # Handle student answer (calculate score, save to DB, etc.)
            # For MVP, just acknowledge or broadcast "User X answered"
            
            # Gamification: Award XP for answering
            from apps.gamification.services import GamificationService
            await database_sync_to_async(GamificationService.award_xp)(self.user, 50, "Live Quiz Participation")
            pass

        elif msg_type == 'show_leaderboard' and is_host:
             await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'session_event',
                    'event': 'show_leaderboard',
                    'payload': data.get('leaderboard_data')
                }
            )

        # WebRTC Signaling Layer
        elif msg_type in ['webrtc_offer', 'webrtc_answer', 'webrtc_ice_candidate']:
            target_user_id = data.get('target_user_id')
            
            # If target provided, ideally route to specific user via a private channel.
            # For this simple group-based signaling architecture, we broadcast to the group 
            # with the sender's ID, and the clients decide if the message is for them.
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'webrtc_signal',
                    'signal_type': msg_type,
                    'sender_id': self.user.id,
                    'target_user_id': target_user_id,
                    'payload': data.get('payload')
                }
            )

        elif msg_type == 'chat_message':
            # AI Content Moderation
            from apps.ai_engine.ai_client import AIClient
            message_text = data.get('message', '')
            
            # Moderate asynchronously
            moderation_result = await database_sync_to_async(AIClient.moderate_content)(message_text)
            
            if moderation_result.get('is_safe', False):
                # Broadcast safe message
                await self.channel_layer.group_send(
                    self.room_group_name,
                    {
                        'type': 'session_event',
                        'event': 'chat_message',
                        'payload': {
                            'user': self.user.username,
                            'message': message_text,
                            'timestamp': 'now' # Should use timezone.now().isoformat()
                        }
                    }
                )
            else:
                # Notify sender of violation
                await self.send(text_data=json.dumps({
                    'event': 'moderation_alert',
                    'payload': {
                        'reason': moderation_result.get('reason', 'Content Policy Violation'),
                        'original_message': message_text
                    }
                }))

    # Receive from Group (Server -> Client)
    async def session_event(self, event):
        # Do not send echo back to sender if we want strict one-way events, 
        # but generally okay. 
        await self.send(text_data=json.dumps({
            'event': event['event'],
            'payload': event['payload']
        }))
        
    async def webrtc_signal(self, event):
        # Ensure we don't send the offer/answer back to the person who originated it
        if event['sender_id'] != self.user.id:
            # If target_user_id is specified and it's not this user, ignore
            target_id = event.get('target_user_id')
            if target_id and int(target_id) != self.user.id:
                return
                
            await self.send(text_data=json.dumps({
                'event': event['signal_type'],
                'sender_id': event['sender_id'],
                'payload': event['payload']
            }))
        
    @database_sync_to_async
    def check_is_host(self, session_id, user):
        from .models import LiveSession
        return LiveSession.objects.filter(id=session_id, host=user).exists()

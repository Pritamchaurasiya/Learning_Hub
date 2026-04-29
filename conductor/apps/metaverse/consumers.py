import json
import logging
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async

logger = logging.getLogger(__name__)

class SpatialConsumer(AsyncWebsocketConsumer):
    """
    High-frequency WebSocket Consumer for 3D Metaverse Synchronization.
    Handles:
    1. X, Y, Z coordinates + quaternions (rotation)
    2. Avatar animations (Walking, Talking, Idle)
    3. WebRTC SDP Offers/Answers for proximity voice chat
    """
    async def connect(self):
        self.room_slug = self.scope['url_route']['kwargs']['room_slug']
        self.room_group_name = f'metaverse_{self.room_slug}'

        # TODO: Add authentication check here using self.scope['user']
        # For Phase 2 prototype, we accept the connection
        
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        await self.accept()
        logger.info(f"Avatar connected to room {self.room_slug}. Channel: {self.channel_name}")

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )
        
        # Broadcast player leave
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'spatial_message',
                'action': 'player_left',
                'channel_id': self.channel_name
            }
        )

    async def receive(self, text_data):
        """
        Receives 60fps telemetry from Unity/Unreal/Three.js client.
        """
        try:
            data = json.loads(text_data)
            action = data.get('action')
            
            # Action: 'move' (Position & Rotation Update)
            if action == 'move':
                # Rebroadcast to everyone else in the room
                await self.channel_layer.group_send(
                    self.room_group_name,
                    {
                        'type': 'spatial_message',
                        'action': 'move',
                        'channel_id': self.channel_name,
                        'x': data.get('x', 0),
                        'y': data.get('y', 0),
                        'z': data.get('z', 0),
                        'ry': data.get('ry', 0), # Y-axis rotation (heading)
                        'anim': data.get('anim', 'idle')
                    }
                )
                
            # Action: 'webrtc_offer' or 'webrtc_answer' (Proximity Voice Chat)
            elif action in ['webrtc_offer', 'webrtc_answer', 'webrtc_ice']:
                # Target specific peer
                target_channel = data.get('target_channel')
                if target_channel:
                    await self.channel_layer.send(
                        target_channel,
                        {
                            'type': 'spatial_message',
                            'action': action,
                            'sender_channel': self.channel_name,
                            'payload': data.get('payload')
                        }
                    )
        except json.JSONDecodeError:
            pass
        except Exception as e:
            logger.error(f"Spatial WebSocket Error: {str(e)}")

    async def spatial_message(self, event):
        """
        Sends the group message to the specific WebSocket client.
        We drop self-messages to save bandwidth (client already knows its position).
        """
        sender = event.get('channel_id') or event.get('sender_channel')
        
        # Don't echo position back to the sender
        if sender == self.channel_name and event.get('action') == 'move':
            return
            
        await self.send(text_data=json.dumps(event))

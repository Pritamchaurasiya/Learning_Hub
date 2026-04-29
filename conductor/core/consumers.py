import json
from channels.generic.websocket import AsyncWebsocketConsumer

class AIConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.room_name = 'ai_agent'
        self.room_group_name = 'ai_agent_stream'

        # Join room group
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )

        await self.accept()

    async def disconnect(self, close_code):
        # Leave room group
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

    # Receive message from WebSocket
    async def receive(self, text_data):
        text_data_json = json.loads(text_data)
        message = text_data_json.get('message', '')
        
        # Echo back (simulate AI thinking)
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'ai_message',
                'message': f"Analyzing: {message}"
            }
        )

    # Receive message from room group
    async def ai_message(self, event):
        message = event['message']

        # Send message to WebSocket
        await self.send(text_data=json.dumps({
            'message': message
        }))

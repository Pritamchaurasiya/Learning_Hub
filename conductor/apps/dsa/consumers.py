import json
from channels.generic.websocket import AsyncWebsocketConsumer


class SubmissionConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.user_id = int(self.scope['url_route']['kwargs']['user_id'])

        # Security: Only allow user to listen to their own channel
        if self.scope['user'].is_anonymous or self.scope['user'].id != self.user_id:
            await self.close()
            return

        self.group_name = f'user_{self.user_id}_submissions'

        # Join room group
        await self.channel_layer.group_add(
            self.group_name,
            self.channel_name
        )

        await self.accept()

    async def disconnect(self, close_code):
        # Leave room group
        await self.channel_layer.group_discard(
            self.group_name,
            self.channel_name
        )

    # Receive message from room group
    async def submission_update(self, event):
        message = event['message']

        # Send message to WebSocket
        await self.send(text_data=json.dumps({
            'type': 'submission_update',
            'data': message
        }))

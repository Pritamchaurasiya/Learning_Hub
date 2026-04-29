
import json
from channels.generic.websocket import AsyncWebsocketConsumer

class ActivityFeedConsumer(AsyncWebsocketConsumer):
    """
    Consumer for the Universal Activity Feed.
    Broadcasts public events (Global) and private notifications (Personal).
    """
    
    async def connect(self):
        self.user = self.scope.get("user")
        
        # 1. Global Feed (For "Who just bought X", "User Y reached level 10")
        await self.channel_layer.group_add(
            "global_activity_feed",
            self.channel_name
        )
        
        # 2. Personal Feed (If authenticated)
        if self.user and self.user.is_authenticated:
            self.personal_group = f"user_feed_{self.user.id}"
            await self.channel_layer.group_add(
                self.personal_group,
                self.channel_name
            )
            
        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(
            "global_activity_feed",
            self.channel_name
        )
        
        if hasattr(self, 'personal_group'):
            await self.channel_layer.group_discard(
                self.personal_group,
                self.channel_name
            )

    async def feed_event(self, event):
        """
        Handler for feed events.
        """
        await self.send(text_data=json.dumps({
            "type": event.get("event_type", "activity"),
            "data": event["data"],
            "timestamp": event.get("timestamp")
        }))

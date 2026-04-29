
import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from typing import Dict, Any

class InstructorDashboardConsumer(AsyncWebsocketConsumer):
    """
    Consumer for real-time instructor dashboard updates.
    Sends live revenue, enrollment, and activity stats.
    """
    
    async def connect(self):
        self.user = self.scope.get("user")
        
        # For Demo/God-Mode, allow anonymous or mock connection if testing
        if not self.user or not self.user.is_authenticated:
            # Check for demo query param or just allow for now for visualisation
            pass 

        # Group name based on user ID or global for demo
        self.room_group_name = f"instructor_dashboard_{self.user.id}" if self.user and self.user.is_authenticated else "instructor_demo"

        # Join room group
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )

        await self.accept()
        
        # Send initial connection success message
        await self.send(text_data=json.dumps({
            "type": "connection_established",
            "message": "Connected to Instructor Dashboard Stream"
        }))

        # Start simulation task
        import asyncio
        self.simulation_task = asyncio.create_task(self._simulate_updates())

    async def disconnect(self, close_code):
        if hasattr(self, 'simulation_task'):
            self.simulation_task.cancel()
            
        # Leave room group
        if hasattr(self, 'room_group_name'):
             await self.channel_layer.group_discard(
                self.room_group_name,
                self.channel_name
            )

    async def _simulate_updates(self):
        """Simulate live revenue updates for God Mode demo."""
        import asyncio
        import random
        
        while True:
            await asyncio.sleep(5)
            revenue_bump = random.randint(10, 100)
            students_active = random.randint(50, 200)
            
            await self.send(text_data=json.dumps({
                "type": "stats_update",
                "data": {
                    "revenue_bump": revenue_bump,
                    "active_students": students_active,
                    "message": f"New sale! +${revenue_bump}"
                }
            }))

    async def dashboard_update(self, event: Dict[str, Any]):
        """
        Handler for dashboard_update messages sent to the group.
        """
        # Send message to WebSocket
        await self.send(text_data=json.dumps({
            "type": event["update_type"],  # e.g., 'revenue', 'enrollment'
            "data": event["data"]
        }))


class ActivityFeedConsumer(AsyncWebsocketConsumer):
    """Consumer for general activity feed updates."""
    
    async def connect(self):
        self.room_group_name = "global_activity_feed"
        await self.channel_layer.group_add(self.room_group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.room_group_name, self.channel_name)

    async def activity_log(self, event):
        """Handle activity log messages."""
        await self.send(text_data=json.dumps(event["data"]))



"""
Comprehensive tests for Chat module.
"""

import pytest
from django.utils import timezone

from apps.chat.models import ChatRoom, Message


@pytest.mark.django_db
class TestChatRoomModel:
    """Tests for ChatRoom model."""

    def test_chat_room_creation(self, user):
        """Test chat room is created correctly."""
        room = ChatRoom.objects.create(
            name="Test Room",
            type=ChatRoom.Type.GROUP,
            created_by=user,
        )
        
        assert room.name == "Test Room"
        assert room.type == ChatRoom.Type.GROUP
        assert room.created_by == user

    def test_chat_room_str(self, user):
        """Test string representation."""
        room = ChatRoom.objects.create(
            name="Test Room",
            type=ChatRoom.Type.DIRECT,
            created_by=user,
        )
        
        assert "Test Room" in str(room)


@pytest.mark.django_db
class TestMessageModel:
    """Tests for Message model."""

    def test_message_creation(self, user):
        """Test message is created correctly."""
        room = ChatRoom.objects.create(
            name="Test Room",
            type=ChatRoom.Type.GROUP,
            created_by=user,
        )
        
        message = Message.objects.create(
            room=room,
            sender=user,
            content="Hello World!",
            type=Message.Type.TEXT,
        )
        
        assert message.room == room
        assert message.sender == user
        assert message.content == "Hello World!"
        assert message.is_edited is False

    def test_message_edit(self, user):
        """Test message can be edited."""
        room = ChatRoom.objects.create(
            name="Test Room",
            type=ChatRoom.Type.GROUP,
            created_by=user,
        )
        
        message = Message.objects.create(
            room=room,
            sender=user,
            content="Original",
            type=Message.Type.TEXT,
        )
        
        message.content = "Edited"
        message.is_edited = True
        message.save()
        
        message.refresh_from_db()
        assert message.content == "Edited"
        assert message.is_edited is True

from django.db import models
from django.conf import settings
from apps.core.models import BaseModel


class ChatRoom(BaseModel):
    """
    Chat room for direct messaging and group chats.
    Backward compatible with Conversation model.
    """
    class Type(models.TextChoices):
        DIRECT = 'direct', 'Direct Message'
        GROUP = 'group', 'Group Chat'
    
    name = models.CharField(max_length=255, blank=True)
    type = models.CharField(max_length=10, choices=Type.choices, default=Type.DIRECT)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='created_rooms'
    )
    participants = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        related_name='chat_rooms'
    )
    last_message_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        db_table = 'chat_rooms'
        ordering = ['-last_message_at']

    def __str__(self):
        if self.name:
            return self.name
        return f"Chat Room {self.id}"


# Alias for backward compatibility
Conversation = ChatRoom


class Message(BaseModel):
    """A message within a chat room or conversation."""
    
    class Type(models.TextChoices):
        TEXT = 'text', 'Text'
        IMAGE = 'image', 'Image'
        FILE = 'file', 'File'
        AUDIO = 'audio', 'Audio'
        VIDEO = 'video', 'Video'
    
    room = models.ForeignKey(
        ChatRoom,
        on_delete=models.CASCADE,
        related_name='room_messages',
        null=True,
        blank=True
    )
    conversation = models.ForeignKey(
        ChatRoom,
        on_delete=models.CASCADE,
        related_name='messages',
        null=True,
        blank=True
    )
    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='sent_messages'
    )
    content = models.TextField()
    type = models.CharField(max_length=10, choices=Type.choices, default=Type.TEXT)
    is_edited = models.BooleanField(default=False)
    is_encrypted = models.BooleanField(default=False, help_text="True if content is E2E encrypted")
    attachment = models.FileField(upload_to='chat_attachments/', blank=True, null=True)
    
    # Read receipts
    read_by = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        related_name='read_messages',
        blank=True
    )
    
    class Meta:
        db_table = 'messages'
        ordering = ['created_at']

    def __str__(self):
        return f"Message by {self.sender} at {self.created_at}"

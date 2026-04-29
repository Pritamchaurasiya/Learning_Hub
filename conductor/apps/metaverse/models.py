from django.db import models
from django.conf import settings
from apps.core.models import BaseModel
from apps.courses.models import Course

class MetaverseRoom(BaseModel):
    """
    Represents a 3D Virtual Classroom instances.
    """
    course = models.ForeignKey(Course, on_delete=models.CASCADE, related_name="metaverse_rooms")
    room_slug = models.SlugField(max_length=255, unique=True, help_text="Unique identifier for the WebRTC/WebSocket channel")
    title = models.CharField(max_length=255)
    is_active = models.BooleanField(default=True, help_text="Is this room currently open for students?")
    max_capacity = models.PositiveIntegerField(default=50, help_text="Maximum number of simultaneous avatars")

    # Spatial configuration
    environment_asset_url = models.URLField(max_length=500, blank=True, null=True, help_text="URL to the glTF/GLB 3D scene file")

    class Meta:
        db_table = "metaverse_rooms"
        verbose_name = "Metaverse Room"
        verbose_name_plural = "Metaverse Rooms"

    def __str__(self):
        return f"{self.title} (Course: {self.course.title})"

class AvatarState(BaseModel):
    """
    Snapshot of a user's avatar. Persisted periodically, mostly handled in-memory via Redis.
    """
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="avatar_state")
    mesh_url = models.URLField(max_length=500, blank=True, null=True, help_text="ReadyPlayerMe or custom GLB avatar")
    last_x = models.FloatField(default=0.0)
    last_y = models.FloatField(default=0.0)
    last_z = models.FloatField(default=0.0)

    class Meta:
        db_table = "metaverse_avatar_states"

    def __str__(self):
        return f"{self.user.username}'s Avatar"

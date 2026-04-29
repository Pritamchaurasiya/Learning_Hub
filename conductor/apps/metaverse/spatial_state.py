"""
Spatial Computing (Metaverse) State Manager

Manages state for 3D/VR collaborative environments.
1. Room State Management (Users, Objects).
2. Volumetric Asset Linking.
3. Physics State Synchronization.
"""

import logging
import uuid
from typing import Dict, Any, List, Tuple
from dataclasses import dataclass

logger = logging.getLogger(__name__)


@dataclass
class Vector3:
    x: float
    y: float
    z: float

@dataclass
class Quaternion:
    x: float
    y: float
    z: float
    w: float

@dataclass
class SpatialObject:
    id: str
    type: str # 'whiteboard', 'desk', '3d_model'
    position: Vector3
    rotation: Quaternion
    scale: Vector3
    owner_id: str
    locked: bool = False


class SpatialRoomService:
    """
    Manages 3D virtual classroom instances.
    """
    _rooms: Dict[str, Dict[str, SpatialObject]] = {} # room_id -> {obj_id: Object}
    
    @classmethod
    def create_room(cls, host_id: str) -> str:
        room_id = str(uuid.uuid4())
        cls._rooms[room_id] = {}
        logger.info(f"Spatial Room created: {room_id}")
        return room_id

    @classmethod
    def update_object_transform(
        cls, 
        room_id: str, 
        obj_id: str, 
        position: Dict, 
        rotation: Dict
    ) -> bool:
        """
        Sync object movement.
        """
        room = cls._rooms.get(room_id)
        if room is None: return False
        
        obj = room.get(obj_id)
        if not obj:
            # Auto-create for demo
            obj = SpatialObject(
                id=obj_id,
                type="generic",
                position=Vector3(**position),
                rotation=Quaternion(**rotation),
                scale=Vector3(1,1,1),
                owner_id="system"
            )
            room[obj_id] = obj
        else:
            if obj.locked: return False
            obj.position = Vector3(**position)
            obj.rotation = Quaternion(**rotation)
            
        return True

    @classmethod
    def get_room_snapshot(cls, room_id: str) -> List[Dict[str, Any]]:
        """
        Get full state of room for new joiner.
        """
        room = cls._rooms.get(room_id, {})
        snapshot = []
        for obj in room.values():
            snapshot.append({
                "id": obj.id,
                "pos": {"x": obj.position.x, "y": obj.position.y, "z": obj.position.z},
                "rot": {"x": obj.rotation.x, "y": obj.rotation.y, "z": obj.rotation.z, "w": obj.rotation.w},
                "type": obj.type
            })
        return snapshot

    @classmethod
    def spawn_asset(cls, room_id: str, asset_type: str, position: Dict) -> str:
        """Spawn a new 3D learning asset (e.g. Molecule Model)."""
        obj_id = str(uuid.uuid4())
        room = cls._rooms.get(room_id)
        if room is not None:
             room[obj_id] = SpatialObject(
                id=obj_id,
                type=asset_type,
                position=Vector3(**position),
                rotation=Quaternion(0,0,0,1),
                scale=Vector3(1,1,1),
                owner_id="system"
            )
        return obj_id

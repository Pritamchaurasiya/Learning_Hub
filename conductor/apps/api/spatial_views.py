from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny

class SpatialComputerViewSet(viewsets.ViewSet):
    """
    API for Apple Vision Pro and Meta Quest spatial assets.
    """
    permission_classes = [AllowAny]

    @action(detail=False, methods=['get'])
    def environment(self, request):
        """
        Returns the USDZ/GLTF environment assets for the user's VR study room.
        """
        return Response({
            "environment_id": "study_room_v1",
            "assets": {
                "ios_usdz": "https://cdn.learninghub.com/spatial/room.usdz",
                "web_gltf": "https://cdn.learninghub.com/spatial/room.gltf"
            },
            "lighting": "ambient_soft",
            "anchors": [
                {"id": "whiteboard", "pos": [0, 1.5, -2]},
                {"id": "tutor_hologram", "pos": [1, 0, -1]}
            ]
        })

    @action(detail=False, methods=['get'])
    def hologram_token(self, request):
        """
        Generates a token for the Volumetric Video streaming service.
        """
        return Response({
            "token": "holo_jwt_example_token",
            "stream_url": "wss://hologram.learninghub.com/stream/v1"
        })

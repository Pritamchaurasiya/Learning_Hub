
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema
from .models import Organization, OrganizationMember

from rest_framework import serializers

class OrganizationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Organization
        fields = '__all__'

class OrgDashboardSerializer(serializers.Serializer):
    """Stats for Organization Dashboard"""
    total_members = serializers.IntegerField()
    active_licenses = serializers.IntegerField()
    total_xp = serializers.IntegerField()

class OrganizationViewSet(viewsets.ModelViewSet):
    """
    B2B Organization Management.
    """
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = OrganizationSerializer
    
    def get_queryset(self):
        # Only show orgs user owns or manages
        if self.request.user.is_staff:
             return Organization.objects.all()
        return Organization.objects.filter(owner=self.request.user)
    
    @action(detail=True, methods=['get'])
    def dashboard(self, request, pk=None):
        """
        Manager Dashboard Stats.
        """
        org = self.get_object()
        
        # Aggregate logic
        members = org.members.all()
        stats = {
            "total_members": members.count(),
            "active_licenses": org.max_seats - members.count(), # Simulation
            "total_xp": sum(m.user.xp_profile.total_xp for m in members if hasattr(m.user, 'xp_profile')),
            "top_learners": [
                {"username": m.user.username, "xp": m.user.xp_profile.total_xp}
                for m in members if hasattr(m.user, 'xp_profile')
            ][:5]
        }
        return Response({"status": "success", "data": stats})
    
    @action(detail=True, methods=['post'])
    def invite(self, request, pk=None):
        """
        Invite user to organization (Simulation).
        """
        email = request.data.get('email')
        return Response({"status": "success", "message": f"Invitation sent to {email}"})

"""
Study Groups views — Phase 11 Enhancement.

Provides:
- Full CRUD with search, topic filter, member_count annotation
- join/leave with capacity and admin-transfer guards
- transfer_admin, kick, members actions
- Consistent {status, data} responses
"""

from rest_framework import viewsets, permissions, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db import transaction
from django.db.models import Count
from drf_spectacular.utils import extend_schema

from .models import StudyGroup, GroupMembership
from .serializers import StudyGroupSerializer, StudyGroupCreateSerializer


@extend_schema(tags=["Study Groups"])
class StudyGroupViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Study Groups.

    list:           GET   /groups/                         — all groups
    join:           POST  /groups/{id}/join/                — join group
    leave:          POST  /groups/{id}/leave/               — leave group
    my_groups:      GET   /groups/my_groups/                — user's groups
    members:        GET   /groups/{id}/members/             — list members
    transfer_admin: POST  /groups/{id}/transfer_admin/      — transfer admin role
    kick:           POST  /groups/{id}/kick/                — admin kicks member
    """

    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ["name", "topic"]
    ordering_fields = ["created_at", "name"]
    ordering = ["-created_at"]

    def get_queryset(self):
        qs = StudyGroup.objects.annotate(member_count=Count("memberships"))
        topic = self.request.query_params.get("topic")
        if topic:
            qs = qs.filter(topic__icontains=topic)
        search = self.request.query_params.get("search")
        if search:
            qs = qs.filter(name__icontains=search)
        return qs

    def get_serializer_class(self):
        if self.action in ["create", "update", "partial_update"]:
            return StudyGroupCreateSerializer
        return StudyGroupSerializer

    def perform_create(self, serializer):
        group = serializer.save(creator=self.request.user)
        GroupMembership.objects.create(group=group, user=self.request.user, role="admin")

    # ------------------------------------------------------------------
    # Membership Actions
    # ------------------------------------------------------------------

    @extend_schema(description="Join a study group.")
    @action(detail=True, methods=["post"])
    def join(self, request, pk=None):
        """Join a study group (capacity-checked, locked)."""
        try:
            from django.db import NotSupportedError
            with transaction.atomic():
                try:
                    group = StudyGroup.objects.select_for_update().get(pk=self.get_object().pk)
                except NotSupportedError:
                    group = StudyGroup.objects.get(pk=self.get_object().pk)
                
                if group.memberships.count() >= group.max_members:
                    return Response(
                        {"status": "error", "message": "Group is full"},
                        status=status.HTTP_400_BAD_REQUEST,
                    )

                _, created = GroupMembership.objects.get_or_create(
                    group=group, user=request.user, defaults={"role": "member"}
                )
            msg = "Joined successfully" if created else "Already a member"
            return Response({"status": "success", "message": msg})
        except Exception as e:
            import traceback
            traceback.print_exc()
            raise e

    @extend_schema(description="Leave a study group.")
    @action(detail=True, methods=["post"])
    def leave(self, request, pk=None):
        """Leave a study group (admin must transfer first)."""
        group = self.get_object()
        membership = GroupMembership.objects.filter(group=group, user=request.user).first()

        if not membership:
            return Response(
                {"status": "error", "message": "Not a member"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if membership.role == "admin" and group.memberships.count() > 1:
            return Response(
                {"status": "error", "message": "Transfer admin role before leaving"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        membership.delete()
        return Response({"status": "success", "message": "Left group"})

    @extend_schema(description="Get groups the current user belongs to.")
    @action(detail=False, methods=["get"])
    def my_groups(self, request):
        """Get groups the user is a member of."""
        groups = self.get_queryset().filter(memberships__user=request.user)
        serializer = self.get_serializer(groups, many=True)
        return Response({"status": "success", "data": serializer.data})

    # ------------------------------------------------------------------
    # Admin Actions
    # ------------------------------------------------------------------

    @extend_schema(description="List members of a group.")
    @action(detail=True, methods=["get"])
    def members(self, request, pk=None):
        """List all members with roles."""
        group = self.get_object()
        memberships = group.memberships.select_related("user").all()
        data = [
            {
                "user_id": str(m.user.id),
                "email": m.user.email,
                "name": m.user.get_full_name(),
                "role": m.role,
                "joined_at": m.created_at.isoformat() if hasattr(m, "created_at") and m.created_at else None,
            }
            for m in memberships
        ]
        return Response({"status": "success", "data": data})

    @extend_schema(description="Transfer admin role to another member.")
    @action(detail=True, methods=["post"])
    def transfer_admin(self, request, pk=None):
        """Transfer admin role. Body: {"user_id": "..."}"""
        from .schemas import UserIdSchema
        from pydantic import ValidationError

        group = self.get_object()

        # Must be current admin
        caller_membership = GroupMembership.objects.filter(
            group=group, user=request.user, role="admin"
        ).first()
        if not caller_membership:
            return Response(
                {"status": "error", "message": "Only admins can transfer ownership"},
                status=status.HTTP_403_FORBIDDEN,
            )

        try:
            validated_data = UserIdSchema(**request.data)
            target_user_id = validated_data.user_id
        except ValidationError as e:
            return Response(
                {"status": "error", "message": "Invalid payload", "details": e.errors()},
                status=status.HTTP_400_BAD_REQUEST,
            )

        target_membership = GroupMembership.objects.filter(
            group=group, user_id=target_user_id
        ).first()
        if not target_membership:
            return Response(
                {"status": "error", "message": "Target user is not a member"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Atomically swap roles to prevent partial state
        with transaction.atomic():
            # Sort PKs to prevent Postgres deadlocks across concurrent transfers
            pks = sorted([caller_membership.pk, target_membership.pk])
            locked_memberships = {
                m.pk: m for m in GroupMembership.objects.select_for_update().filter(pk__in=pks)
            }
            
            caller_locked = locked_memberships[caller_membership.pk]
            target_locked = locked_memberships[target_membership.pk]

            caller_locked.role = "member"
            target_locked.role = "admin"
            caller_locked.save(update_fields=["role"])
            target_locked.save(update_fields=["role"])

        return Response({
            "status": "success",
            "message": f"Admin role transferred to {target_membership.user.email}",
        })

    @extend_schema(description="Admin kicks a member from the group.")
    @action(detail=True, methods=["post"])
    def kick(self, request, pk=None):
        """Admin removes a member. Body: {"user_id": "..."}"""
        from .schemas import UserIdSchema
        from pydantic import ValidationError

        group = self.get_object()

        # Must be admin
        if not GroupMembership.objects.filter(
            group=group, user=request.user, role="admin"
        ).exists():
            return Response(
                {"status": "error", "message": "Only admins can kick members"},
                status=status.HTTP_403_FORBIDDEN,
            )

        try:
            validated_data = UserIdSchema(**request.data)
            target_user_id = validated_data.user_id
        except ValidationError as e:
            return Response(
                {"status": "error", "message": "Invalid payload", "details": e.errors()},
                status=status.HTTP_400_BAD_REQUEST,
            )

        target_membership = GroupMembership.objects.filter(
            group=group, user_id=target_user_id
        ).first()
        if not target_membership:
            return Response(
                {"status": "error", "message": "User is not a member"},
                status=status.HTTP_404_NOT_FOUND,
            )

        if target_membership.role == "admin":
            return Response(
                {"status": "error", "message": "Cannot kick an admin"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        target_membership.delete()
        return Response({"status": "success", "message": "Member removed"})

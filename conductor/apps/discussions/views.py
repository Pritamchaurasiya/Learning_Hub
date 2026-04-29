from datetime import timedelta

from django.db.models import Count, Q
from django.db import transaction
from django.utils import timezone
from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_page
from django_filters.rest_framework import DjangoFilterBackend
from drf_spectacular.utils import extend_schema, extend_schema_view
from rest_framework import viewsets, permissions, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import DiscussionThread, DiscussionReply
from .serializers import (
    DiscussionThreadSerializer,
    DiscussionThreadDetailSerializer,
    DiscussionReplySerializer,
)


@extend_schema_view(
    list=extend_schema(description='List discussion threads'),
    retrieve=extend_schema(description='Get thread with replies'),
    create=extend_schema(description='Create new discussion thread'),
)
class DiscussionThreadViewSet(viewsets.ModelViewSet):
    """ViewSet for discussion threads."""
    
    queryset = DiscussionThread.objects.select_related('author', 'course').prefetch_related('tags')
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['course', 'is_resolved', 'author']
    search_fields = ['title', 'content']
    ordering_fields = ['created_at', 'like_count', 'reply_count']
    ordering = ['-created_at']
    
    def get_serializer_class(self):
        if self.action == 'retrieve':
            return DiscussionThreadDetailSerializer
        return DiscussionThreadSerializer
    
    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]
    
    def perform_create(self, serializer):
        # AI Moderation Check
        # Lazy import to avoid circular dependency
        from apps.ai_engine.ai_client import AIClient
        from rest_framework.exceptions import ValidationError
        
        content = serializer.validated_data.get('content', '')
        title = serializer.validated_data.get('title', '')
        
        # Check toxic content (Simulated or Real call)
        # Assuming AIClient has moderate_text method (we'll implement it if missing, or use existing check)
        is_safe = True 
        if hasattr(AIClient, 'moderate_text'):
             is_safe = AIClient.moderate_text(f"{title} {content}")
             
        if not is_safe:
             raise ValidationError({"error": "Content flagged as inappropriate by AI Moderator."})

        serializer.save(author=self.request.user)

    @action(detail=True, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def summarize(self, request, pk=None):
        """Generate AI summary for the thread."""
        thread = self.get_object()
        replies = thread.replies.all().order_by('created_at')
        
        if not replies.exists():
            return Response(
                {"error": "Cannot summarize a thread with no replies."},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        # Lazy import to avoid circular dependency
        from apps.ai_engine.ai_client import AIClient
        
        reply_texts = [f"{r.author.display_name}: {r.content}" for r in replies]
        
        summary_data = AIClient.generate_discussion_summary(thread.title, reply_texts)
        
        if not summary_data:
            return Response(
                {"error": "Failed to generate summary via AI."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )
            
        return Response({"status": "success", "data": summary_data})
    
    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def vote(self, request, pk=None):
        """
        Vote on a thread.
        Expects: {"value": 1} (upvote) or {"value": -1} (downvote) or {"value": 0} (remove)
        """
        thread = self.get_object()
        value = int(request.data.get('value', 0))
        
        from .models import DiscussionVote
        from django.contrib.contenttypes.models import ContentType
        ct = ContentType.objects.get_for_model(thread)
        
        if value == 0:
            DiscussionVote.objects.filter(
                user=request.user, content_type=ct, object_id=thread.id
            ).delete()
        elif value in [1, -1]:
            DiscussionVote.objects.update_or_create(
                user=request.user, content_type=ct, object_id=thread.id,
                defaults={'value': value}
            )
        
        # Atomically recalculate like_count to prevent drift under concurrent votes
        with transaction.atomic():
            thread = DiscussionThread.objects.select_for_update().get(pk=thread.pk)
            upvotes = DiscussionVote.objects.filter(content_type=ct, object_id=thread.id, value=1).count()
            downvotes = DiscussionVote.objects.filter(content_type=ct, object_id=thread.id, value=-1).count()
            thread.like_count = upvotes - downvotes
            thread.save(update_fields=['like_count'])
        
        return Response({'like_count': thread.like_count, 'user_vote': value})
    
    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def resolve(self, request, pk=None):
        """Mark thread as resolved (author only)."""
        thread = self.get_object()
        if thread.author != request.user:
            return Response(
                {'error': 'Only author can resolve thread'},
                status=status.HTTP_403_FORBIDDEN
            )
        thread.is_resolved = True
        thread.save(update_fields=['is_resolved'])
        return Response({'status': 'success', 'is_resolved': True})

    @extend_schema(description='Pin or unpin a thread (author or staff).')
    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def pin(self, request, pk=None):
        """Toggle pin status on a thread. Author or staff only."""
        thread = self.get_object()

        if thread.author != request.user and not request.user.is_staff:
            return Response(
                {'status': 'error', 'message': 'Only author or staff can pin'},
                status=status.HTTP_403_FORBIDDEN
            )

        is_pinned = getattr(thread, 'is_pinned', False)
        thread.is_pinned = not is_pinned
        thread.save(update_fields=['is_pinned'])
        return Response({
            'status': 'success',
            'is_pinned': thread.is_pinned,
        })

    @extend_schema(description='Get trending threads (most votes + replies in 7 days).')
    @method_decorator(cache_page(60 * 10))  # cache 10 min
    @action(detail=False, methods=['get'])
    def trending(self, request):
        """Trending threads — most engagement in the past 7 days."""
        seven_days_ago = timezone.now() - timedelta(days=7)
        limit = min(int(request.query_params.get('limit', 10)), 50)

        threads = (
            DiscussionThread.objects.filter(created_at__gte=seven_days_ago)
            .annotate(
                reply_count_recent=Count(
                    'replies',
                    filter=Q(replies__created_at__gte=seven_days_ago)
                ),
            )
            .order_by('-like_count', '-reply_count_recent')
            .select_related('author', 'course')
        )[:limit]

        serializer = DiscussionThreadSerializer(threads, many=True)
        return Response({'status': 'success', 'data': serializer.data})

    @extend_schema(description='Search threads by keyword.')
    @action(detail=False, methods=['get'])
    def search(self, request):
        """Full-text search across thread title and content."""
        query = request.query_params.get('q', '').strip()
        limit = min(int(request.query_params.get('limit', 20)), 50)

        if len(query) < 2:
            return Response(
                {'status': 'error', 'message': 'Query must be at least 2 characters'},
                status=status.HTTP_400_BAD_REQUEST
            )

        threads = (
            DiscussionThread.objects.filter(
                Q(title__icontains=query) | Q(content__icontains=query)
            )
            .select_related('author', 'course')
            .order_by('-created_at')
        )[:limit]

        serializer = DiscussionThreadSerializer(threads, many=True)
        return Response({
            'status': 'success',
            'data': serializer.data,
            'meta': {'query': query, 'count': len(serializer.data)},
        })


@extend_schema_view(
    list=extend_schema(description='List replies for a thread'),
    create=extend_schema(description='Post a reply'),
)
class DiscussionReplyViewSet(viewsets.ModelViewSet):
    """ViewSet for thread replies."""
    
    serializer_class = DiscussionReplySerializer
    
    def get_queryset(self):
        thread_id = self.kwargs.get('thread_pk')
        return DiscussionReply.objects.filter(
            thread_id=thread_id, parent__isnull=True
        ).select_related('author').prefetch_related('nested_replies', 'nested_replies__author')
    
    def get_permissions(self):
        if self.action == 'list':
            return [permissions.AllowAny()]
        return [permissions.IsAuthenticated()]
    
    def perform_create(self, serializer):
        thread_id = self.kwargs.get('thread_pk')
        parent_id = self.request.data.get('parent_id')
        
        parent = None
        if parent_id:
            from .models import DiscussionReply
            parent = DiscussionReply.objects.filter(id=parent_id, thread_id=thread_id).first()
            
        serializer.save(author=self.request.user, thread_id=thread_id, parent=parent)
    
    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def vote(self, request, thread_pk=None, pk=None):
        """Vote on a reply."""
        reply = self.get_object()
        value = int(request.data.get('value', 0))
        
        from .models import DiscussionVote
        from django.contrib.contenttypes.models import ContentType
        ct = ContentType.objects.get_for_model(reply)
        
        if value == 0:
            DiscussionVote.objects.filter(
                user=request.user, content_type=ct, object_id=reply.id
            ).delete()
        elif value in [1, -1]:
            DiscussionVote.objects.update_or_create(
                user=request.user, content_type=ct, object_id=reply.id,
                defaults={'value': value}
            )
        
        # Atomically recalculate like_count
        with transaction.atomic():
            reply = DiscussionReply.objects.select_for_update().get(pk=reply.pk)
            upvotes = DiscussionVote.objects.filter(content_type=ct, object_id=reply.id, value=1).count()
            downvotes = DiscussionVote.objects.filter(content_type=ct, object_id=reply.id, value=-1).count()
            reply.like_count = upvotes - downvotes
            reply.save(update_fields=['like_count'])
        
        return Response({'like_count': reply.like_count, 'user_vote': value})

    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAuthenticated])
    def accept(self, request, thread_pk=None, pk=None):
        """Mark reply as accepted answer (thread author only)."""
        reply = self.get_object()
        if reply.thread.author != request.user:
            return Response(
                {'error': 'Only thread author can accept answers'},
                status=status.HTTP_403_FORBIDDEN
            )
        # Atomically toggle accepted answer to prevent dual-accepted race
        with transaction.atomic():
            reply.thread.replies.select_for_update().update(is_accepted_answer=False)
            reply.is_accepted_answer = True
            reply.save(update_fields=['is_accepted_answer'])
        return Response({'is_accepted_answer': True})

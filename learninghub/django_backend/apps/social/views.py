from django.db.models import F
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework import status
from apps.core.responses import success_response, error_response
from .models import Discussion, Comment, LiveSession, Mentor, DiscussionBookmark, DiscussionVote
from .serializers import (
    DiscussionListSerializer, DiscussionDetailSerializer,
    CommentSerializer, LiveSessionSerializer, MentorSerializer
)

class DiscussionListView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        queryset = Discussion.objects.select_related('user').prefetch_related('comments')
        category = request.query_params.get('category')
        search = request.query_params.get('search') or request.query_params.get('q')

        if category and category != 'All':
            queryset = queryset.filter(category__iexact=category)
        if search:
            queryset = queryset.filter(title__icontains=search) | queryset.filter(content__icontains=search)

        serializer = DiscussionListSerializer(queryset, many=True)
        return success_response(data=serializer.data, meta={'count': len(serializer.data)})

    def post(self, request):
        if not request.user.is_authenticated:
            return error_response('Authentication required', status_code=status.HTTP_401_UNAUTHORIZED)

        title = request.data.get('title', '').strip()
        content = request.data.get('content', '').strip()
        category = request.data.get('category', 'General')
        tags = request.data.get('tags', [])

        if not title or not content:
            return error_response('Title and content are required', status_code=status.HTTP_400_BAD_REQUEST)

        discussion = Discussion.objects.create(
            user=request.user,
            title=title,
            content=content,
            category=category,
            tags=tags
        )

        return success_response(
            data=DiscussionDetailSerializer(discussion).data,
            message='Discussion posted successfully',
            status_code=status.HTTP_201_CREATED
        )

class DiscussionDetailView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, pk):
        try:
            Discussion.objects.filter(pk=pk).update(views=F('views') + 1)
            discussion = Discussion.objects.select_related('user').prefetch_related('comments__user').get(pk=pk)
        except Discussion.DoesNotExist:
            return error_response('Discussion not found', status_code=status.HTTP_404_NOT_FOUND)

        serializer = DiscussionDetailSerializer(discussion)
        return success_response(data=serializer.data)

class PostCommentView(APIView):
    def get_permissions(self):
        if self.request.method == 'GET':
            return [AllowAny()]
        return [IsAuthenticated()]

    def get(self, request, pk):
        try:
            discussion = Discussion.objects.get(pk=pk)
        except Discussion.DoesNotExist:
            return error_response('Discussion not found', status_code=status.HTTP_404_NOT_FOUND)

        comments = Comment.objects.filter(discussion=discussion).select_related('user')
        serializer = CommentSerializer(comments, many=True)
        return success_response(data=serializer.data, meta={'count': len(serializer.data)})

    def post(self, request, pk):
        try:
            discussion = Discussion.objects.get(pk=pk)
        except Discussion.DoesNotExist:
            return error_response('Discussion not found', status_code=status.HTTP_404_NOT_FOUND)

        content = request.data.get('content', '').strip()
        if not content:
            return error_response('Comment content cannot be empty', status_code=status.HTTP_400_BAD_REQUEST)

        comment = Comment.objects.create(
            discussion=discussion,
            user=request.user,
            content=content
        )

        return success_response(
            data=CommentSerializer(comment).data,
            message='Comment added successfully',
            status_code=status.HTTP_201_CREATED
        )

class UpvoteDiscussionView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        try:
            discussion = Discussion.objects.get(pk=pk)
        except Discussion.DoesNotExist:
            return error_response('Discussion not found', status_code=status.HTTP_404_NOT_FOUND)

        try:
            val = int(request.data.get('value', 1))
        except (ValueError, TypeError):
            val = 1
        if val not in (-1, 0, 1):
            val = 1

        vote, created = DiscussionVote.objects.get_or_create(
            user=request.user,
            discussion=discussion,
            defaults={'value': val}
        )
        if not created:
            if val == 0:
                vote.delete()
                user_vote = 0
            else:
                vote.value = val
                vote.save(update_fields=['value'])
                user_vote = val
        else:
            user_vote = val

        from django.db.models import Sum
        total_votes = DiscussionVote.objects.filter(discussion=discussion).aggregate(s=Sum('value'))['s'] or 0
        discussion.upvotes = max(0, total_votes)
        discussion.save(update_fields=['upvotes'])

        return success_response(
            data={
                'upvotes': discussion.upvotes,
                'likes': discussion.upvotes,
                'like_count': discussion.upvotes,
                'user_vote': user_vote
            },
            message='Vote recorded'
        )

class DiscussionBookmarkView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk=None):
        bookmarks = DiscussionBookmark.objects.filter(user=request.user).select_related('discussion__user')
        discussions = [b.discussion for b in bookmarks]
        serializer = DiscussionListSerializer(discussions, many=True)
        return success_response(data=serializer.data, meta={'count': len(serializer.data)})

    def post(self, request, pk):
        try:
            discussion = Discussion.objects.get(pk=pk)
        except Discussion.DoesNotExist:
            return error_response('Discussion not found', status_code=status.HTTP_404_NOT_FOUND)

        bm, created = DiscussionBookmark.objects.get_or_create(user=request.user, discussion=discussion)
        if not created:
            bm.delete()
            return success_response(data={'bookmarked': False, 'discussion_id': pk}, message='Bookmark removed')
        return success_response(data={'bookmarked': True, 'discussion_id': pk}, message='Bookmarked successfully')

    def delete(self, request, pk):
        DiscussionBookmark.objects.filter(user=request.user, discussion_id=pk).delete()
        return success_response(data={'bookmarked': False, 'discussion_id': pk}, message='Bookmark removed')

class DiscussionTrendingView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        trending = Discussion.objects.order_by('-upvotes', '-views')[:10]
        serializer = DiscussionListSerializer(trending, many=True)
        return success_response(data=serializer.data, meta={'count': len(serializer.data)})

class LiveSessionsListView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        sessions = LiveSession.objects.all()
        serializer = LiveSessionSerializer(sessions, many=True)
        return success_response(data=serializer.data, meta={'count': len(serializer.data)})

class MentorsListView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        mentors = Mentor.objects.all()
        serializer = MentorSerializer(mentors, many=True)
        return success_response(data=serializer.data, meta={'count': len(serializer.data)})

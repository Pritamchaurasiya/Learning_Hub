from rest_framework import serializers
from .models import DiscussionThread, DiscussionReply, ThreadTag


class ThreadTagSerializer(serializers.ModelSerializer):
    class Meta:
        model = ThreadTag
        fields = ['id', 'name']


class DiscussionReplySerializer(serializers.ModelSerializer):
    author_name = serializers.CharField(source='author.get_full_name', read_only=True)
    author_avatar = serializers.SerializerMethodField()
    is_instructor_reply = serializers.BooleanField(read_only=True)
    replies = serializers.SerializerMethodField()
    
    class Meta:
        model = DiscussionReply
        fields = [
            'id', 'thread', 'parent', 'author_name', 'author_avatar', 'content',
            'like_count', 'is_accepted_answer', 'is_instructor_reply', 'created_at',
            'user_vote', 'replies'
        ]
        read_only_fields = ['like_count', 'is_accepted_answer', 'thread', 'user_vote', 'parent']

    user_vote = serializers.SerializerMethodField()

    def get_replies(self, obj):
        # Fetch up to 1 depth natively to prevent infinite crash. 
        # In a real god-mode scenario we use MPTT but this works efficiently for standard 2-level nesting.
        children = obj.nested_replies.all()
        if children.exists():
            return DiscussionReplySerializer(children, many=True, context=self.context).data
        return []
    
    def get_author_avatar(self, obj):
        if hasattr(obj.author, 'avatar') and obj.author.avatar:
            return obj.author.avatar.url
        return ''

    def get_user_vote(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return 0
        from .models import DiscussionVote
        from django.contrib.contenttypes.models import ContentType
        ct = ContentType.objects.get_for_model(obj)
        vote = DiscussionVote.objects.filter(
            user=request.user, content_type=ct, object_id=obj.id
        ).first()
        return vote.value if vote else 0


class DiscussionThreadSerializer(serializers.ModelSerializer):
    author_name = serializers.CharField(source='author.get_full_name', read_only=True)
    author_avatar = serializers.SerializerMethodField()
    reply_count = serializers.IntegerField(read_only=True)
    tags = serializers.SlugRelatedField(
        many=True, slug_field='name', queryset=ThreadTag.objects.all(), required=False
    )
    
    class Meta:
        model = DiscussionThread
        fields = [
            'id', 'course', 'author_name', 'author_avatar', 'title', 'content',
            'is_pinned', 'is_resolved', 'like_count', 'reply_count', 'tags', 'created_at',
            'user_vote'
        ]
        read_only_fields = ['is_pinned', 'is_resolved', 'like_count', 'user_vote']

    user_vote = serializers.SerializerMethodField()

    def get_user_vote(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return 0
        from .models import DiscussionVote
        from django.contrib.contenttypes.models import ContentType
        ct = ContentType.objects.get_for_model(obj)
        # Optimized lookup could be done via prefetch, but simple for now
        vote = DiscussionVote.objects.filter(
            user=request.user, content_type=ct, object_id=obj.id
        ).first()
        return vote.value if vote else 0
    
    def get_author_avatar(self, obj):
        if hasattr(obj.author, 'avatar') and obj.author.avatar:
            return obj.author.avatar.url
        return ''


class DiscussionThreadDetailSerializer(DiscussionThreadSerializer):
    replies = serializers.SerializerMethodField()
    
    class Meta(DiscussionThreadSerializer.Meta):
        fields = DiscussionThreadSerializer.Meta.fields + ['replies', 'ai_summary', 'views']

    def get_replies(self, obj):
        # Only return top level replies (parent__isnull=True), the DiscussionReplySerializer handles the children.
        top_level = obj.replies.filter(parent__isnull=True).prefetch_related('nested_replies', 'author')
        return DiscussionReplySerializer(top_level, many=True, context=self.context).data

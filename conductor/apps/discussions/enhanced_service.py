"""
Enhanced Discussion Forum Service

Advanced discussion features with:
1. Threaded replies
2. Rich text with code syntax highlighting
3. Voting and reputation
4. Expert marking and best answers
5. Tags and categorization
6. Real-time notifications
7. Moderation tools
"""

import logging
from datetime import timedelta
from typing import Dict, Any, List, Optional
from enum import Enum

from django.utils import timezone
from django.db.models import Count, Sum, Q, F
from django.core.cache import cache

logger = logging.getLogger(__name__)


class DiscussionCategory(Enum):
    """Discussion categories."""
    GENERAL = "general"
    QUESTION = "question"
    TUTORIAL = "tutorial"
    SHOWCASE = "showcase"
    HELP = "help"
    ANNOUNCEMENT = "announcement"


class VoteType(Enum):
    """Vote types."""
    UPVOTE = "upvote"
    DOWNVOTE = "downvote"


class EnhancedDiscussionService:
    """
    Enhanced discussion forum service.
    """
    
    CACHE_TIMEOUT = 300  # 5 minutes
    
    # Reputation points
    REPUTATION_POINTS = {
        'question_asked': 1,
        'answer_posted': 2,
        'upvote_received': 5,
        'downvote_received': -2,
        'best_answer': 15,
        'question_upvoted': 3,
    }
    
    # ==========================================================================
    # DISCUSSION CRUD
    # ==========================================================================
    
    @classmethod
    def create_discussion(
        cls,
        user,
        title: str,
        content: str,
        category: DiscussionCategory = DiscussionCategory.GENERAL,
        tags: List[str] = None,
        course_id: Optional[str] = None,
        lesson_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Create a new discussion thread.
        """
        from apps.discussions.models import Discussion, DiscussionTag
        from apps.core.content_moderation import ContentModerationService, ContentType
        
        # Moderate content
        moderation = ContentModerationService.moderate_content(
            content=f"{title}\n{content}",
            content_type=ContentType.DISCUSSION,
            user_id=str(user.id)
        )
        
        if moderation.result.value == 'rejected':
            return {
                'success': False,
                'error': 'Content violates community guidelines',
                'flags': [f.type.value for f in moderation.flags]
            }
        
        # Create discussion
        discussion = Discussion.objects.create(
            author=user,
            title=title,
            content=content,
            category=category.value,
            course_id=course_id,
            lesson_id=lesson_id,
            is_moderated=moderation.result.value != 'approved'
        )
        
        # Add tags
        if tags:
            for tag_name in tags[:5]:  # Limit to 5 tags
                tag, _ = DiscussionTag.objects.get_or_create(name=tag_name.lower())
                discussion.tags.add(tag)
        
        # Award reputation
        cls._award_reputation(user, 'question_asked')
        
        # Invalidate cache
        cache.delete('trending_discussions')
        
        return {
            'success': True,
            'discussion_id': str(discussion.id),
            'title': discussion.title,
            'status': 'pending_review' if discussion.is_moderated else 'published'
        }
    
    @classmethod
    def get_discussion(cls, discussion_id: str, user=None) -> Dict[str, Any]:
        """
        Get a discussion with replies.
        """
        from apps.discussions.models import Discussion, Reply
        
        discussion = Discussion.objects.select_related('author', 'course').get(id=discussion_id)
        
        # Increment view count
        Discussion.objects.filter(id=discussion_id).update(views=F('views') + 1)
        
        # Get replies
        replies = Reply.objects.filter(
            discussion=discussion
        ).select_related('author').order_by('-is_best_answer', '-votes', 'created_at')
        
        # Check user's vote
        user_vote = None
        if user and user.is_authenticated:
            from apps.discussions.models import Vote
            vote = Vote.objects.filter(
                discussion=discussion,
                user=user
            ).first()
            if vote:
                user_vote = vote.vote_type
        
        return {
            'id': str(discussion.id),
            'title': discussion.title,
            'content': discussion.content,
            'category': discussion.category,
            'author': {
                'id': str(discussion.author.id),
                'username': discussion.author.username,
                'avatar': discussion.author.avatar.url if hasattr(discussion.author, 'avatar') and discussion.author.avatar else None,
                'reputation': cls._get_user_reputation(discussion.author)
            },
            'course': discussion.course.title if discussion.course else None,
            'votes': discussion.votes,
            'views': discussion.views,
            'user_vote': user_vote,
            'is_solved': discussion.is_solved,
            'created_at': discussion.created_at.isoformat(),
            'tags': list(discussion.tags.values_list('name', flat=True)),
            'replies': [
                {
                    'id': str(r.id),
                    'content': r.content,
                    'author': {
                        'id': str(r.author.id),
                        'username': r.author.username,
                        'reputation': cls._get_user_reputation(r.author)
                    },
                    'votes': r.votes,
                    'is_best_answer': r.is_best_answer,
                    'created_at': r.created_at.isoformat()
                }
                for r in replies
            ],
            'reply_count': replies.count()
        }
    
    @classmethod
    def list_discussions(
        cls,
        category: Optional[DiscussionCategory] = None,
        course_id: Optional[str] = None,
        tag: Optional[str] = None,
        search: Optional[str] = None,
        sort: str = 'recent',
        page: int = 1,
        page_size: int = 20
    ) -> Dict[str, Any]:
        """
        List discussions with filtering and pagination.
        """
        from apps.discussions.models import Discussion
        
        query = Discussion.objects.filter(is_hidden=False)
        
        if category:
            query = query.filter(category=category.value)
        if course_id:
            query = query.filter(course_id=course_id)
        if tag:
            query = query.filter(tags__name=tag.lower())
        if search:
            query = query.filter(
                Q(title__icontains=search) | Q(content__icontains=search)
            )
        
        # Sorting
        if sort == 'popular':
            query = query.order_by('-votes', '-views', '-created_at')
        elif sort == 'unanswered':
            query = query.filter(replies__isnull=True).order_by('-created_at')
        else:  # recent
            query = query.order_by('-created_at')
        
        query = query.select_related('author')
        
        total = query.count()
        offset = (page - 1) * page_size
        discussions = query[offset:offset + page_size]
        
        return {
            'discussions': [
                {
                    'id': str(d.id),
                    'title': d.title,
                    'category': d.category,
                    'author': d.author.username,
                    'votes': d.votes,
                    'views': d.views,
                    'reply_count': d.replies.count(),
                    'is_solved': d.is_solved,
                    'created_at': d.created_at.isoformat()
                }
                for d in discussions
            ],
            'total': total,
            'page': page,
            'total_pages': (total + page_size - 1) // page_size
        }
    
    # ==========================================================================
    # REPLIES
    # ==========================================================================
    
    @classmethod
    def add_reply(
        cls,
        user,
        discussion_id: str,
        content: str,
        parent_reply_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Add a reply to a discussion.
        """
        from apps.discussions.models import Discussion, Reply
        from apps.core.content_moderation import ContentModerationService, ContentType
        
        # Moderate content
        moderation = ContentModerationService.moderate_content(
            content=content,
            content_type=ContentType.DISCUSSION,
            user_id=str(user.id)
        )
        
        if moderation.result.value == 'rejected':
            return {
                'success': False,
                'error': 'Content violates community guidelines'
            }
        
        discussion = Discussion.objects.get(id=discussion_id)
        
        reply = Reply.objects.create(
            discussion=discussion,
            author=user,
            content=content,
            parent_id=parent_reply_id
        )
        
        # Award reputation
        cls._award_reputation(user, 'answer_posted')
        
        # Notify discussion author
        if discussion.author != user:
            cls._notify_reply(discussion, reply)
        
        return {
            'success': True,
            'reply_id': str(reply.id),
            'content': reply.content,
            'created_at': reply.created_at.isoformat()
        }
    
    @classmethod
    def mark_best_answer(cls, discussion_id: str, reply_id: str, user) -> Dict[str, Any]:
        """
        Mark a reply as the best answer.
        """
        from apps.discussions.models import Discussion, Reply
        
        discussion = Discussion.objects.get(id=discussion_id, author=user)
        
        # Unmark previous best answer
        Reply.objects.filter(discussion=discussion, is_best_answer=True).update(is_best_answer=False)
        
        # Mark new best answer
        reply = Reply.objects.get(id=reply_id, discussion=discussion)
        reply.is_best_answer = True
        reply.save()
        
        # Mark discussion as solved
        discussion.is_solved = True
        discussion.save()
        
        # Award reputation to reply author
        if reply.author != user:
            cls._award_reputation(reply.author, 'best_answer')
        
        return {'success': True, 'reply_id': str(reply.id)}
    
    # ==========================================================================
    # VOTING
    # ==========================================================================
    
    @classmethod
    def vote(
        cls,
        user,
        target_type: str,  # 'discussion' or 'reply'
        target_id: str,
        vote_type: VoteType
    ) -> Dict[str, Any]:
        """
        Vote on a discussion or reply.
        """
        from apps.discussions.models import Discussion, Reply, Vote
        
        # Get target
        if target_type == 'discussion':
            target = Discussion.objects.get(id=target_id)
        else:
            target = Reply.objects.get(id=target_id)
        
        # Prevent self-voting
        if target.author == user:
            return {'success': False, 'error': 'Cannot vote on your own content'}
        
        # Get or create vote
        existing_vote, created = Vote.objects.get_or_create(
            user=user,
            **({target_type: target}),
            defaults={'vote_type': vote_type.value}
        )
        
        if not created:
            if existing_vote.vote_type == vote_type.value:
                # Remove vote
                existing_vote.delete()
                vote_delta = -1 if vote_type == VoteType.UPVOTE else 1
            else:
                # Change vote
                existing_vote.vote_type = vote_type.value
                existing_vote.save()
                vote_delta = 2 if vote_type == VoteType.UPVOTE else -2
        else:
            vote_delta = 1 if vote_type == VoteType.UPVOTE else -1
        
        # Update target votes
        target.votes = F('votes') + vote_delta
        target.save()
        target.refresh_from_db()
        
        # Award reputation
        if vote_type == VoteType.UPVOTE:
            cls._award_reputation(target.author, 'upvote_received')
        else:
            cls._award_reputation(target.author, 'downvote_received')
        
        return {
            'success': True,
            'new_votes': target.votes
        }
    
    # ==========================================================================
    # TRENDING & FEATURED
    # ==========================================================================
    
    @classmethod
    def get_trending_discussions(cls, limit: int = 10) -> List[Dict[str, Any]]:
        """
        Get trending discussions.
        """
        cache_key = 'trending_discussions'
        cached = cache.get(cache_key)
        if cached:
            return cached
        
        from apps.discussions.models import Discussion
        
        week_ago = timezone.now() - timedelta(days=7)
        
        trending = Discussion.objects.filter(
            created_at__gte=week_ago,
            is_hidden=False
        ).annotate(
            score=F('votes') + F('views') / 10 + Count('replies') * 2
        ).order_by('-score')[:limit]
        
        result = [
            {
                'id': str(d.id),
                'title': d.title,
                'category': d.category,
                'author': d.author.username,
                'votes': d.votes,
                'views': d.views,
                'reply_count': d.replies.count()
            }
            for d in trending
        ]
        
        cache.set(cache_key, result, timeout=cls.CACHE_TIMEOUT)
        return result
    
    # ==========================================================================
    # REPUTATION
    # ==========================================================================
    
    @classmethod
    def _award_reputation(cls, user, action: str) -> None:
        """Award reputation points to a user."""
        points = cls.REPUTATION_POINTS.get(action, 0)
        if points:
            # In production, update UserProfile.reputation
            logger.info(f"Awarding {points} reputation to user {user.id} for {action}")
    
    @classmethod
    def _get_user_reputation(cls, user) -> int:
        """Get user's reputation score."""
        # In production, return from UserProfile
        return 100  # Default
    
    @classmethod
    def get_top_contributors(cls, days: int = 30, limit: int = 10) -> List[Dict[str, Any]]:
        """Get top contributors by reputation earned."""
        from apps.discussions.models import Discussion, Reply
        
        since = timezone.now() - timedelta(days=days)
        
        # This is a simplified version
        # In production, calculate from reputation history
        top_users = Discussion.objects.filter(
            created_at__gte=since
        ).values('author__username', 'author__id').annotate(
            posts=Count('id'),
            total_votes=Sum('votes')
        ).order_by('-total_votes')[:limit]
        
        return [
            {
                'username': u['author__username'],
                'posts': u['posts'],
                'votes_received': u['total_votes'] or 0
            }
            for u in top_users
        ]
    
    # ==========================================================================
    # NOTIFICATIONS
    # ==========================================================================
    
    @classmethod
    def _notify_reply(cls, discussion, reply) -> None:
        """Notify discussion author of new reply."""
        from apps.notifications.smart_notifications import (
            SmartNotificationService,
            NotificationType,
            NotificationPriority
        )
        
        SmartNotificationService.create_notification(
            user=discussion.author,
            title=f"New reply to: {discussion.title[:50]}",
            body=f"{reply.author.username} replied to your discussion",
            notification_type=NotificationType.ACTIVITY,
            priority=NotificationPriority.MEDIUM,
            action_url=f"/discussions/{discussion.id}#reply-{reply.id}"
        )

"""
Advanced AI Recommendation Engine for Learning Hub.

This module provides intelligent, personalized recommendations using:
1. Collaborative Filtering (user-based & item-based)
2. Content-Based Filtering
3. Hybrid Recommendations
4. Learning Path Optimization
5. Spaced Repetition Scheduling
"""

import logging
import json
from typing import List, Dict, Any, Optional
from datetime import timedelta
from collections import defaultdict

from django.db.models import Count, Avg, F, Q
from django.utils import timezone
from django.core.cache import cache

logger = logging.getLogger(__name__)


class RecommendationEngine:
    """
    Hybrid AI Recommendation Engine combining multiple strategies.
    
    Features:
    - User behavior analysis
    - Content similarity matching
    - Skill gap analysis
    - Learning path optimization
    - Trending content detection
    """
    
    CACHE_PREFIX = "rec:"
    CACHE_TTL = 1800  # 30 minutes
    
    @classmethod
    def get_personalized_courses(cls, user, limit: int = 10) -> List[Dict]:
        """
        Get personalized course recommendations for a user.
        
        Uses hybrid approach combining:
        - Collaborative filtering (users like you also liked)
        - Content-based filtering (similar to courses you've taken)
        - Skill gap analysis (what you should learn next)
        
        Args:
            user: User object
            limit: Number of recommendations
            
        Returns:
            List of recommended courses with scores
        """
        cache_key = f"{cls.CACHE_PREFIX}courses:{user.id}"
        cached = cache.get(cache_key)
        if cached:
            return cached[:limit]
        
        from apps.courses.models import Course, Enrollment, Category
        from apps.users.models import UserInterest
        
        # Get user's enrolled and completed courses
        enrolled_ids = list(Enrollment.objects.filter(
            user=user
        ).values_list('course_id', flat=True))
        
        recommendations = defaultdict(lambda: {'score': 0, 'reasons': []})
        
        # Strategy 1: Content-Based - Similar categories
        if enrolled_ids:
            user_categories = Category.objects.filter(
                courses__id__in=enrolled_ids
            ).distinct()
            
            similar_courses = Course.objects.filter(
                category__in=user_categories,
                is_published=True
            ).exclude(id__in=enrolled_ids).annotate(
                avg_rating=Avg('reviews__rating'),
                enrollment_count=Count('enrollments')
            )
            
            for course in similar_courses[:20]:
                recommendations[course.id]['course'] = course
                recommendations[course.id]['score'] += 30
                recommendations[course.id]['reasons'].append('Similar to courses you like')
        
        # Strategy 2: Collaborative - Users with similar enrollments
        similar_users = cls._find_similar_users(user, enrolled_ids)
        
        if similar_users:
            # N+1 FIX: Aggregate counts natively instead of looping Course.objects.get() 200+ times
            course_counts = Enrollment.objects.filter(
                user_id__in=similar_users[:10]
            ).exclude(course_id__in=enrolled_ids).values('course_id').annotate(count=Count('user_id'))
            
            course_id_to_count = {item['course_id']: item['count'] for item in course_counts}
            
            collaborative_courses = Course.objects.filter(
                id__in=course_id_to_count.keys(), 
                is_published=True
            )
            
            for course in collaborative_courses:
                count = course_id_to_count[course.id]
                recommendations[course.id]['course'] = course
                recommendations[course.id]['score'] += (20 * count) # Scale weight by similar user volume
                recommendations[course.id]['reasons'].append('Popular with similar learners')
        
        # Strategy 3: User Interests
        try:
            interests = list(UserInterest.objects.filter(user=user).values_list('topic', flat=True))
            if interests:
                # Merge up to top 3 interests into a single OR query
                from functools import reduce
                from operator import or_
                
                query = reduce(or_, (Q(title__icontains=i) | Q(description__icontains=i) for i in interests[:3]))
                interest_courses = Course.objects.filter(
                    query,
                    is_published=True
                ).exclude(id__in=enrolled_ids).distinct()[:10]
                
                for course in interest_courses:
                    recommendations[course.id]['course'] = course
                    recommendations[course.id]['score'] += 25
                    recommendations[course.id]['reasons'].append('Matches your interests')
        except Exception as e:
            logger.warning("Failed to fetch UserInterests for recommendations: %s", e)
        
        # Strategy 4: Trending Courses
        trending = cls._get_trending_courses(exclude_ids=enrolled_ids, limit=10)
        for course in trending:
            recommendations[course.id]['course'] = course
            recommendations[course.id]['score'] += 15
            recommendations[course.id]['reasons'].append('Trending now')
        
        # Strategy 5: Skill Gap Analysis
        skill_gaps = cls._analyze_skill_gaps(user)
        for gap_course_id, gap_score in skill_gaps.items():
            if gap_course_id in recommendations:
                recommendations[gap_course_id]['score'] += gap_score
                recommendations[gap_course_id]['reasons'].append('Fills skill gap')
        
        # Sort by score and format results
        sorted_recs = sorted(
            recommendations.values(),
            key=lambda x: x['score'],
            reverse=True
        )[:limit]
        
        result = []
        for rec in sorted_recs:
            course = rec.get('course')
            if course:
                result.append({
                    'id': str(course.id),
                    'title': course.title,
                    'slug': course.slug,
                    'thumbnail': course.thumbnail.url if course.thumbnail else None,
                    'price': float(course.price) if course.price else 0,
                    'instructor': course.instructor.display_name if course.instructor else None,
                    'rating': getattr(course, 'avg_rating', None),
                    'enrollment_count': getattr(course, 'enrollment_count', 0),
                    'recommendation_score': rec['score'],
                    'reasons': list(set(rec['reasons'])),
                })
        
        cache.set(cache_key, result, timeout=cls.CACHE_TTL)
        return result
    
    @classmethod
    def get_personalized_problems(cls, user, limit: int = 10) -> List[Dict]:
        """
        Get personalized DSA problem recommendations.
        
        Uses:
        - Skill level assessment
        - Weak topic detection
        - Progressive difficulty
        """
        from apps.dsa.models import Problem, Submission
        
        cache_key = f"{cls.CACHE_PREFIX}problems:{user.id}"
        cached = cache.get(cache_key)
        if cached:
            return cached[:limit]
        
        # Get user's solved problems
        solved_ids = list(Submission.objects.filter(
            user=user, status='AC'
        ).values_list('problem_id', flat=True).distinct())
        
        # Analyze user's performance by topic
        topic_performance = defaultdict(lambda: {'solved': 0, 'attempted': 0})
        
        submissions = Submission.objects.filter(user=user).select_related('problem')
        for sub in submissions:
            topic = sub.problem.topic
            if sub.status == 'AC':
                topic_performance[topic]['solved'] += 1
            topic_performance[topic]['attempted'] += 1
        
        # Find weak topics
        weak_topics = []
        for topic, stats in topic_performance.items():
            success_rate = stats['solved'] / max(stats['attempted'], 1)
            if success_rate < 0.5 and stats['attempted'] >= 2:
                weak_topics.append(topic)
        
        recommendations = []
        
        # Strategy 1: Problems from weak topics (easier ones)
        if weak_topics:
            weak_topic_problems = Problem.objects.filter(
                topic__in=weak_topics,
                difficulty='easy'
            ).exclude(id__in=solved_ids)[:5]
            
            for problem in weak_topic_problems:
                recommendations.append({
                    'problem': problem,
                    'score': 40,
                    'reason': f'Practice your weak topic: {problem.topic}'
                })
        
        # Strategy 2: Progressive Difficulty
        user_level = cls._calculate_user_skill_level(user)
        
        if user_level == 'beginner':
            difficulty_order = ['easy', 'medium']
        elif user_level == 'intermediate':
            difficulty_order = ['medium', 'easy', 'hard']
        else:
            difficulty_order = ['hard', 'medium']
        
        for difficulty in difficulty_order:
            problems = Problem.objects.filter(
                difficulty=difficulty,
                is_active=True
            ).exclude(id__in=solved_ids).order_by('?')[:3]
            
            for problem in problems:
                recommendations.append({
                    'problem': problem,
                    'score': 30,
                    'reason': f'Matches your skill level ({difficulty})'
                })
        
        # Strategy 3: Popular Problems
        popular = Problem.objects.filter(
            is_active=True
        ).exclude(id__in=solved_ids).annotate(
            submission_count=Count('submissions')
        ).order_by('-submission_count')[:5]
        
        for problem in popular:
            recommendations.append({
                'problem': problem,
                'score': 20,
                'reason': 'Popular problem'
            })
        
        # Deduplicate and sort
        seen_ids = set()
        result = []
        for rec in sorted(recommendations, key=lambda x: x['score'], reverse=True):
            problem = rec['problem']
            if problem.id not in seen_ids:
                seen_ids.add(problem.id)
                result.append({
                    'id': str(problem.id),
                    'title': problem.title,
                    'slug': problem.slug,
                    'difficulty': problem.difficulty,
                    'topic': problem.topic,
                    'acceptance_rate': getattr(problem, 'acceptance_rate', None),
                    'recommendation_score': rec['score'],
                    'reason': rec['reason'],
                })
        
        cache.set(cache_key, result[:limit], timeout=cls.CACHE_TTL)
        return result[:limit]
    
    @classmethod
    def get_learning_path(cls, user, goal: str = None) -> Dict:
        """
        Generate an optimized learning path for the user.
        
        Args:
            user: User object
            goal: Optional learning goal (e.g., "web development", "data science")
            
        Returns:
            Structured learning path with milestones
        """
        from apps.courses.models import Course, Enrollment
        
        path = {
            'goal': goal or 'General Skill Development',
            'duration_weeks': 0,
            'milestones': [],
            'current_progress': 0
        }
        
        # Get recommended courses
        recommendations = cls.get_personalized_courses(user, limit=10)
        
        # Filter by goal if specified
        if goal:
            recommendations = [
                r for r in recommendations 
                if goal.lower() in r['title'].lower() or 
                   goal.lower() in str(r.get('category', '')).lower()
            ]
        
        # Organize into milestones
        for idx, course in enumerate(recommendations[:5]):
            milestone = {
                'order': idx + 1,
                'title': f"Complete: {course['title']}",
                'course_id': course['id'],
                'course_title': course['title'],
                'estimated_hours': 20,  # Default estimate
                'skills_gained': [],  # Would be populated from course metadata
                'is_completed': False
            }
            path['milestones'].append(milestone)
            path['duration_weeks'] += 2  # Estimate 2 weeks per course
        
        # Calculate current progress
        completed = Enrollment.objects.filter(
            user=user, 
            progress_percentage=100
        ).count()
        total = len(path['milestones'])
        path['current_progress'] = int((completed / max(total, 1)) * 100)
        
        return path
    
    @classmethod
    def get_spaced_repetition_schedule(cls, user) -> List[Dict]:
        """
        Generate spaced repetition review schedule for learned content.
        
        Uses SM-2 algorithm intervals for optimal retention.
        """
        from apps.courses.models import LessonCompletion
        
        # SM-2 intervals (days)
        intervals = [1, 3, 7, 14, 30, 60]
        
        # Get completed lessons
        completions = LessonCompletion.objects.filter(
            user=user
        ).select_related('lesson').order_by('-completed_at')[:50]
        
        schedule = []
        today = timezone.now().date()
        
        for completion in completions:
            days_since = (today - completion.completed_at.date()).days
            
            # Find appropriate interval
            review_interval = None
            for interval in intervals:
                if days_since >= interval:
                    review_interval = interval
                    break
            
            if review_interval:
                review_date = completion.completed_at.date() + timedelta(days=review_interval)
                if review_date <= today:
                    schedule.append({
                        'lesson_id': str(completion.lesson.id),
                        'lesson_title': completion.lesson.title,
                        'course_title': completion.lesson.module.course.title if completion.lesson.module else None,
                        'completed_at': completion.completed_at.isoformat(),
                        'review_due': review_date.isoformat(),
                        'days_overdue': (today - review_date).days,
                        'priority': 'high' if (today - review_date).days > 7 else 'medium'
                    })
        
        # Sort by priority and overdue days
        schedule.sort(key=lambda x: (-x['days_overdue']))
        
        return schedule[:20]
    
    # =========================================================================
    # PRIVATE HELPER METHODS
    # =========================================================================
    
    @classmethod
    def _find_similar_users(cls, user, enrolled_ids: List) -> List:
        """Find users with similar course enrollments."""
        from apps.courses.models import Enrollment
        
        if not enrolled_ids:
            return []
        
        # Find users who enrolled in same courses
        similar = Enrollment.objects.filter(
            course_id__in=enrolled_ids
        ).exclude(user=user).values('user').annotate(
            common_courses=Count('course')
        ).filter(common_courses__gte=2).order_by('-common_courses')[:20]
        
        return [s['user'] for s in similar]
    
    @classmethod
    def _get_trending_courses(cls, exclude_ids: List, limit: int) -> List:
        """Get trending courses based on recent enrollments."""
        from apps.courses.models import Course
        
        week_ago = timezone.now() - timedelta(days=7)
        
        trending = Course.objects.filter(
            is_published=True
        ).exclude(id__in=exclude_ids).annotate(
            recent_enrollments=Count(
                'enrollments',
                filter=Q(enrollments__created_at__gte=week_ago)
            )
        ).filter(recent_enrollments__gt=0).order_by('-recent_enrollments')[:limit]
        
        return list(trending)
    
    @classmethod
    def _analyze_skill_gaps(cls, user) -> Dict[int, int]:
        """Analyze skill gaps based on learning goals and current progress."""
        # Returns course_id -> score mapping for gap-filling courses
        # Simplified implementation
        return {}
    
    @classmethod
    def _calculate_user_skill_level(cls, user) -> str:
        """Calculate user's skill level based on problems solved."""
        from apps.dsa.models import Submission
        
        stats = Submission.objects.filter(
            user=user, status='AC'
        ).values('problem__difficulty').annotate(count=Count('id'))
        
        difficulty_counts = {s['problem__difficulty']: s['count'] for s in stats}
        
        hard_count = difficulty_counts.get('hard', 0)
        medium_count = difficulty_counts.get('medium', 0)
        easy_count = difficulty_counts.get('easy', 0)
        
        if hard_count >= 10:
            return 'advanced'
        elif medium_count >= 10 or hard_count >= 3:
            return 'intermediate'
        else:
            return 'beginner'


class ContentSimilarityEngine:
    """
    Content-based similarity engine using TF-IDF and embeddings.
    """
    
    @classmethod
    def find_similar_courses(cls, course_id, limit: int = 5) -> List[Dict]:
        """Find courses similar to a given course."""
        from apps.courses.models import Course
        
        try:
            source = Course.objects.get(id=course_id)
        except Course.DoesNotExist:
            return []
        
        # Simple similarity based on category and tags
        similar = Course.objects.filter(
            category=source.category,
            is_published=True
        ).exclude(id=course_id).annotate(
            common_tags=Count('tags', filter=Q(tags__in=source.tags.all()))
        ).order_by('-common_tags', '-average_rating')[:limit]
        
        return [
            {
                'id': str(c.id),
                'title': c.title,
                'thumbnail': c.thumbnail.url if c.thumbnail else None,
                'similarity_score': getattr(c, 'common_tags', 0) * 10 + 50
            }
            for c in similar
        ]


class TrendingAnalyzer:
    """
    Analyze and detect trending content.
    """
    
    CACHE_KEY = "trending:courses"
    CACHE_TTL = 600  # 10 minutes
    
    @classmethod
    def get_trending(cls, category: str = None, limit: int = 10) -> List[Dict]:
        """Get trending content with optional category filter."""
        from apps.courses.models import Course
        
        cache_key = f"{cls.CACHE_KEY}:{category or 'all'}"
        cached = cache.get(cache_key)
        if cached:
            return cached[:limit]
        
        week_ago = timezone.now() - timedelta(days=7)
        
        queryset = Course.objects.filter(
            is_published=True
        ).annotate(
            recent_views=Count('views', filter=Q(views__created_at__gte=week_ago)),
            recent_enrollments=Count('enrollments', filter=Q(enrollments__created_at__gte=week_ago))
        )
        
        if category:
            queryset = queryset.filter(category__slug=category)
        
        # Calculate trend score
        trending = queryset.annotate(
            trend_score=F('recent_views') + F('recent_enrollments') * 5
        ).order_by('-trend_score')[:limit]
        
        result = [
            {
                'id': str(c.id),
                'title': c.title,
                'slug': c.slug,
                'thumbnail': c.thumbnail.url if c.thumbnail else None,
                'trend_score': getattr(c, 'trend_score', 0),
                'recent_enrollments': getattr(c, 'recent_enrollments', 0),
            }
            for c in trending
        ]
        
        cache.set(cache_key, result, timeout=cls.CACHE_TTL)
        return result

"""
Advanced Search and Discovery Service

Enterprise-grade search with:
1. Full-text search with relevance ranking
2. Faceted filtering
3. Autocomplete suggestions
4. Search analytics
5. Personalized results
6. Trending content detection
"""

import logging
import re
from datetime import timedelta
from typing import Dict, Any, List, Optional, Tuple
from enum import Enum
from collections import defaultdict

from django.utils import timezone
from django.db.models import Q, Count, Avg, F, Value
from django.db.models.functions import Coalesce
from django.core.cache import cache

logger = logging.getLogger(__name__)


class SearchType(Enum):
    """Types of searchable content."""
    COURSE = "course"
    LESSON = "lesson"
    INSTRUCTOR = "instructor"
    PROBLEM = "problem"
    DISCUSSION = "discussion"
    ALL = "all"


class SortOption(Enum):
    """Sort options for search results."""
    RELEVANCE = "relevance"
    POPULARITY = "popularity"
    RATING = "rating"
    NEWEST = "newest"
    PRICE_LOW = "price_low"
    PRICE_HIGH = "price_high"


class SearchService:
    """
    Advanced search and discovery service.
    """
    
    CACHE_TIMEOUT = 300  # 5 minutes
    AUTOCOMPLETE_CACHE_TIMEOUT = 3600  # 1 hour
    
    # ==========================================================================
    # MAIN SEARCH
    # ==========================================================================
    
    @classmethod
    def search(
        cls,
        query: str,
        user=None,
        search_type: SearchType = SearchType.ALL,
        filters: Optional[Dict] = None,
        sort: SortOption = SortOption.RELEVANCE,
        page: int = 1,
        page_size: int = 20
    ) -> Dict[str, Any]:
        """
        Perform comprehensive search across content.
        
        Args:
            query: Search query string
            user: Current user for personalization
            search_type: Type of content to search
            filters: Faceted filters (category, difficulty, price range, etc.)
            sort: Sort option
            page: Page number
            page_size: Results per page
            
        Returns:
            Search results with facets and metadata
        """
        # Normalize query
        normalized_query = cls._normalize_query(query)
        
        if not normalized_query:
            return cls._empty_result()
        
        # Log search for analytics
        cls._log_search(normalized_query, user, search_type)
        
        # Perform search based on type
        if search_type == SearchType.COURSE:
            results = cls._search_courses(normalized_query, filters, sort, page, page_size)
        elif search_type == SearchType.LESSON:
            results = cls._search_lessons(normalized_query, filters, sort, page, page_size)
        elif search_type == SearchType.INSTRUCTOR:
            results = cls._search_instructors(normalized_query, page, page_size)
        elif search_type == SearchType.PROBLEM:
            results = cls._search_problems(normalized_query, filters, sort, page, page_size)
        elif search_type == SearchType.DISCUSSION:
            results = cls._search_discussions(normalized_query, page, page_size)
        else:
            # ALL - aggregate results
            results = cls._search_all(normalized_query, filters, sort, page, page_size)
        
        # Apply personalization if user provided
        if user and user.is_authenticated:
            results = cls._personalize_results(results, user)
        
        return results
    
    @classmethod
    def _normalize_query(cls, query: str) -> str:
        """Normalize search query."""
        if not query:
            return ""
        
        # Remove extra spaces
        normalized = ' '.join(query.split())
        
        # Remove special characters (keep alphanumeric and spaces)
        normalized = re.sub(r'[^\w\s]', '', normalized)
        
        return normalized.lower().strip()
    
    @classmethod
    def _empty_result(cls) -> Dict[str, Any]:
        """Return empty search result."""
        return {
            'results': [],
            'total': 0,
            'page': 1,
            'total_pages': 0,
            'facets': {},
            'suggestions': []
        }
    
    # ==========================================================================
    # CONTENT-SPECIFIC SEARCH
    # ==========================================================================
    
    @classmethod
    def _search_courses(
        cls,
        query: str,
        filters: Optional[Dict],
        sort: SortOption,
        page: int,
        page_size: int
    ) -> Dict[str, Any]:
        """Search courses with full-text and filters."""
        from apps.courses.models import Course
        
        # Base query - search in title, description, tags
        base_q = Q(is_published=True) & (
            Q(title__icontains=query) |
            Q(description__icontains=query) |
            Q(tags__icontains=query)
        )
        
        queryset = Course.objects.filter(base_q)
        
        # Apply filters
        if filters:
            if 'category' in filters:
                queryset = queryset.filter(category_id=filters['category'])
            if 'difficulty' in filters:
                queryset = queryset.filter(difficulty=filters['difficulty'])
            if 'price_min' in filters:
                queryset = queryset.filter(price__gte=filters['price_min'])
            if 'price_max' in filters:
                queryset = queryset.filter(price__lte=filters['price_max'])
            if 'rating_min' in filters:
                queryset = queryset.annotate(
                    avg_rating=Avg('reviews__rating')
                ).filter(avg_rating__gte=filters['rating_min'])
            if 'language' in filters:
                queryset = queryset.filter(language=filters['language'])
        
        # Calculate relevance score (simplified)
        queryset = queryset.annotate(
            enrollment_count=Count('enrollments'),
            avg_rating=Coalesce(Avg('reviews__rating'), Value(0.0))
        )
        
        # Apply sorting
        if sort == SortOption.POPULARITY:
            queryset = queryset.order_by('-enrollment_count')
        elif sort == SortOption.RATING:
            queryset = queryset.order_by('-avg_rating')
        elif sort == SortOption.NEWEST:
            queryset = queryset.order_by('-created_at')
        elif sort == SortOption.PRICE_LOW:
            queryset = queryset.order_by('price')
        elif sort == SortOption.PRICE_HIGH:
            queryset = queryset.order_by('-price')
        else:  # RELEVANCE - title matches first
            queryset = queryset.order_by(
                # Exact title match first
                Q(title__iexact=query).desc(),
                '-enrollment_count',
                '-avg_rating'
            )
        
        # Pagination
        total = queryset.count()
        offset = (page - 1) * page_size
        courses = queryset[offset:offset + page_size]
        
        # Get facets
        facets = cls._get_course_facets(queryset)
        
        # Format results
        results = [
            {
                'id': str(c.id),
                'type': 'course',
                'title': c.title,
                'description': c.description[:200] if c.description else '',
                'thumbnail': c.thumbnail.url if c.thumbnail else None,
                'instructor': c.instructor.username if c.instructor else None,
                'price': float(c.price) if c.price else 0,
                'rating': round(c.avg_rating or 0, 1),
                'students': c.enrollment_count,
                'difficulty': c.difficulty,
                'category': c.category.name if c.category else None
            }
            for c in courses
        ]
        
        return {
            'results': results,
            'total': total,
            'page': page,
            'total_pages': (total + page_size - 1) // page_size,
            'facets': facets,
            'suggestions': []
        }
    
    @classmethod
    def _search_lessons(
        cls,
        query: str,
        filters: Optional[Dict],
        sort: SortOption,
        page: int,
        page_size: int
    ) -> Dict[str, Any]:
        """Search lessons within courses."""
        from apps.courses.models import Lesson
        
        queryset = Lesson.objects.filter(
            Q(title__icontains=query) |
            Q(content__icontains=query),
            course__is_published=True
        ).select_related('course')
        
        # Apply filters
        if filters:
            if 'course_id' in filters:
                queryset = queryset.filter(course_id=filters['course_id'])
        
        total = queryset.count()
        offset = (page - 1) * page_size
        lessons = queryset[offset:offset + page_size]
        
        results = [
            {
                'id': str(l.id),
                'type': 'lesson',
                'title': l.title,
                'course_title': l.course.title,
                'course_id': str(l.course.id),
                'duration_minutes': l.duration_minutes
            }
            for l in lessons
        ]
        
        return {
            'results': results,
            'total': total,
            'page': page,
            'total_pages': (total + page_size - 1) // page_size,
            'facets': {},
            'suggestions': []
        }
    
    @classmethod
    def _search_instructors(
        cls,
        query: str,
        page: int,
        page_size: int
    ) -> Dict[str, Any]:
        """Search instructors/tutors."""
        from apps.users.models import User
        
        queryset = User.objects.filter(
            Q(username__icontains=query) |
            Q(first_name__icontains=query) |
            Q(last_name__icontains=query) |
            Q(bio__icontains=query),
            is_instructor=True
        ).annotate(
            course_count=Count('taught_courses'),
            student_count=Count('taught_courses__enrollments')
        ).order_by('-student_count')
        
        total = queryset.count()
        offset = (page - 1) * page_size
        instructors = queryset[offset:offset + page_size]
        
        results = [
            {
                'id': str(i.id),
                'type': 'instructor',
                'name': f"{i.first_name} {i.last_name}".strip() or i.username,
                'username': i.username,
                'avatar': i.avatar.url if hasattr(i, 'avatar') and i.avatar else None,
                'bio': i.bio[:200] if hasattr(i, 'bio') and i.bio else '',
                'course_count': i.course_count,
                'student_count': i.student_count
            }
            for i in instructors
        ]
        
        return {
            'results': results,
            'total': total,
            'page': page,
            'total_pages': (total + page_size - 1) // page_size,
            'facets': {},
            'suggestions': []
        }
    
    @classmethod
    def _search_problems(
        cls,
        query: str,
        filters: Optional[Dict],
        sort: SortOption,
        page: int,
        page_size: int
    ) -> Dict[str, Any]:
        """Search DSA problems."""
        from apps.dsa.models import Problem
        
        queryset = Problem.objects.filter(
            Q(title__icontains=query) |
            Q(description__icontains=query) |
            Q(tags__icontains=query),
            is_active=True
        )
        
        # Apply filters
        if filters:
            if 'difficulty' in filters:
                queryset = queryset.filter(difficulty=filters['difficulty'])
            if 'category' in filters:
                queryset = queryset.filter(category=filters['category'])
        
        total = queryset.count()
        offset = (page - 1) * page_size
        problems = queryset[offset:offset + page_size]
        
        results = [
            {
                'id': str(p.id),
                'type': 'problem',
                'title': p.title,
                'difficulty': p.difficulty,
                'category': p.category,
                'acceptance_rate': getattr(p, 'acceptance_rate', 0)
            }
            for p in problems
        ]
        
        return {
            'results': results,
            'total': total,
            'page': page,
            'total_pages': (total + page_size - 1) // page_size,
            'facets': {},
            'suggestions': []
        }
    
    @classmethod
    def _search_discussions(
        cls,
        query: str,
        page: int,
        page_size: int
    ) -> Dict[str, Any]:
        """Search discussion threads."""
        from apps.discussions.models import Discussion
        
        queryset = Discussion.objects.filter(
            Q(title__icontains=query) |
            Q(content__icontains=query)
        ).select_related('author').order_by('-created_at')
        
        total = queryset.count()
        offset = (page - 1) * page_size
        discussions = queryset[offset:offset + page_size]
        
        results = [
            {
                'id': str(d.id),
                'type': 'discussion',
                'title': d.title,
                'author': d.author.username,
                'replies': getattr(d, 'reply_count', 0),
                'created_at': d.created_at.isoformat()
            }
            for d in discussions
        ]
        
        return {
            'results': results,
            'total': total,
            'page': page,
            'total_pages': (total + page_size - 1) // page_size,
            'facets': {},
            'suggestions': []
        }
    
    @classmethod
    def _search_all(
        cls,
        query: str,
        filters: Optional[Dict],
        sort: SortOption,
        page: int,
        page_size: int
    ) -> Dict[str, Any]:
        """Aggregate search across all content types."""
        # Get limited results from each type
        courses = cls._search_courses(query, filters, sort, 1, 5)
        problems = cls._search_problems(query, filters, sort, 1, 3)
        instructors = cls._search_instructors(query, 1, 3)
        
        # Combine results
        all_results = (
            courses['results'] + 
            problems['results'] + 
            instructors['results']
        )
        
        # Apply pagination to combined results
        total = len(all_results)
        offset = (page - 1) * page_size
        paginated = all_results[offset:offset + page_size]
        
        return {
            'results': paginated,
            'total': total,
            'page': page,
            'total_pages': (total + page_size - 1) // page_size,
            'facets': courses['facets'],
            'suggestions': [],
            'type_counts': {
                'courses': courses['total'],
                'problems': problems['total'],
                'instructors': instructors['total']
            }
        }
    
    @classmethod
    def _get_course_facets(cls, queryset) -> Dict[str, List]:
        """Generate facets for course filtering."""
        from apps.courses.models import Category
        
        # Category facet
        category_counts = queryset.values('category__name', 'category_id').annotate(
            count=Count('id')
        ).order_by('-count')[:10]
        
        # Difficulty facet
        difficulty_counts = queryset.values('difficulty').annotate(
            count=Count('id')
        ).order_by('-count')
        
        # Price range facet
        price_ranges = [
            {'label': 'Free', 'min': 0, 'max': 0},
            {'label': 'Under ₹500', 'min': 1, 'max': 500},
            {'label': '₹500 - ₹2000', 'min': 500, 'max': 2000},
            {'label': '₹2000 - ₹5000', 'min': 2000, 'max': 5000},
            {'label': 'Above ₹5000', 'min': 5000, 'max': 999999},
        ]
        
        return {
            'categories': list(category_counts),
            'difficulties': list(difficulty_counts),
            'price_ranges': price_ranges
        }
    
    @classmethod
    def _personalize_results(cls, results: Dict, user) -> Dict:
        """Personalize results based on user preferences."""
        # In production, this would use user's learning history
        # to boost relevant results
        return results
    
    # ==========================================================================
    # AUTOCOMPLETE
    # ==========================================================================
    
    @classmethod
    def autocomplete(cls, query: str, limit: int = 10) -> List[Dict[str, Any]]:
        """
        Get autocomplete suggestions.
        """
        if len(query) < 2:
            return []
        
        cache_key = f"autocomplete:{query.lower()}"
        cached = cache.get(cache_key)
        if cached:
            return cached
        
        suggestions = []
        
        # Course titles
        from apps.courses.models import Course
        courses = Course.objects.filter(
            title__icontains=query,
            is_published=True
        ).values('title')[:5]
        
        for c in courses:
            suggestions.append({
                'text': c['title'],
                'type': 'course'
            })
        
        # Popular search terms (from history)
        popular = cls._get_popular_searches(query, limit=3)
        for term in popular:
            suggestions.append({
                'text': term,
                'type': 'query'
            })
        
        result = suggestions[:limit]
        cache.set(cache_key, result, timeout=cls.AUTOCOMPLETE_CACHE_TIMEOUT)
        
        return result
    
    @classmethod
    def _get_popular_searches(cls, prefix: str, limit: int) -> List[str]:
        """Get popular search terms matching prefix."""
        cache_key = f"popular_searches:{prefix.lower()[:3]}"
        cached = cache.get(cache_key)
        
        if cached:
            return [s for s in cached if s.lower().startswith(prefix.lower())][:limit]
        
        # In production, query SearchLog model
        return []
    
    # ==========================================================================
    # TRENDING & DISCOVERY
    # ==========================================================================
    
    @classmethod
    def get_trending(cls, limit: int = 10) -> List[Dict[str, Any]]:
        """
        Get trending content based on recent activity.
        """
        cache_key = f"trending_content:{limit}"
        cached = cache.get(cache_key)
        if cached:
            return cached
        
        from apps.courses.models import Course, Enrollment
        
        week_ago = timezone.now() - timedelta(days=7)
        
        # Courses with most enrollments this week
        trending = Course.objects.filter(
            is_published=True
        ).annotate(
            recent_enrollments=Count(
                'enrollments',
                filter=Q(enrollments__created_at__gte=week_ago)
            )
        ).filter(
            recent_enrollments__gt=0
        ).order_by('-recent_enrollments')[:limit]
        
        result = [
            {
                'id': str(c.id),
                'title': c.title,
                'thumbnail': c.thumbnail.url if c.thumbnail else None,
                'enrollments_this_week': c.recent_enrollments,
                'type': 'course'
            }
            for c in trending
        ]
        
        cache.set(cache_key, result, timeout=cls.CACHE_TIMEOUT)
        return result
    
    @classmethod
    def get_for_you(cls, user, limit: int = 10) -> List[Dict[str, Any]]:
        """
        Get personalized recommendations for user.
        """
        from apps.dashboard.advanced_analytics import RecommendationEngine
        
        return RecommendationEngine.get_personalized_recommendations(user, limit)
    
    # ==========================================================================
    # ANALYTICS
    # ==========================================================================
    
    @classmethod
    def _log_search(cls, query: str, user, search_type: SearchType) -> None:
        """Log search for analytics."""
        # In production, save to SearchLog model
        logger.info(f"Search: '{query}' type={search_type.value} user={user}")
    
    @classmethod
    def get_search_analytics(cls, days: int = 7) -> Dict[str, Any]:
        """
        Get search analytics.
        """
        # In production, query SearchLog model
        return {
            'total_searches': 0,
            'unique_queries': 0,
            'top_queries': [],
            'zero_result_queries': [],
            'period_days': days
        }

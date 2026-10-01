"""
Search API views for global search functionality.
"""
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.core.cache import cache
from django.db.models import Q, Count, Avg
from apps.courses.models import Course, Category
from apps.users.models import User
from apps.ai_engine.recommendation_engine import RecommendationEngine
import logging

logger = logging.getLogger(__name__)

CACHE_TTL = 300  # 5 minutes


@api_view(['GET'])
@permission_classes([AllowAny])
def global_search(request):
    """
    Global search across courses, users, and content.
    
    Query params:
    - q: Search query
    - type: Filter by type (courses, users, all)
    - category: Filter by category slug
    - level: Filter by difficulty level
    - sort: Sort by (relevance, rating, newest, popular)
    """
    query = request.GET.get('q', '').strip()
    search_type = request.GET.get('type', 'all')
    category_slug = request.GET.get('category', '')
    level = request.GET.get('level', '')
    sort_by = request.GET.get('sort', 'relevance')
    
    if not query or len(query) < 2:
        return Response({
            'error': 'Search query must be at least 2 characters'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # Cache key
    cache_key = f"search:{query}:{search_type}:{category_slug}:{level}:{sort_by}"
    cached_result = cache.get(cache_key)
    if cached_result:
        return Response(cached_result)
    
    results = {
        'query': query,
        'courses': [],
        'instructors': [],
        'total_count': 0
    }
    
    # Search courses
    if search_type in ['all', 'courses']:
        courses = Course.objects.filter(
            is_published=True
        ).filter(
            Q(title__icontains=query) |
            Q(description__icontains=query) |
            Q(short_description__icontains=query) |
            Q(learning_objectives__icontains=query) |
            Q(category__name__icontains=query)
        ).distinct()
        
        # Apply filters
        if category_slug:
            courses = courses.filter(category__slug=category_slug)
        if level:
            courses = courses.filter(difficulty=level)
        
        # Apply sorting
        if sort_by == 'rating':
            courses = courses.order_by('-avg_rating')
        elif sort_by == 'newest':
            courses = courses.order_by('-created_at')
        elif sort_by == 'popular':
            courses = courses.order_by('-enrollment_count')
        
        # Limit results and prefetch relations
        courses = courses.select_related('instructor', 'category')[:20]
        
        results['courses'] = [{
            'id': c.id,
            'slug': c.slug,
            'title': c.title,
            'description': c.short_description or c.description[:200],
            'thumbnail': c.thumbnail.url if c.thumbnail else None,
            'instructor': {
                'id': c.instructor.id,
                'name': c.instructor.get_full_name() or c.instructor.username,
                'avatar': c.instructor.avatar.url if c.instructor.avatar else None
            },
            'category': c.category.name if c.category else None,
            'level': c.difficulty,
            'price': str(c.price),
            'rating': float(c.avg_rating),
            'enrollment_count': c.enrollment_count,
            'duration': c.duration_hours
        } for c in courses]
    
    # Search instructors
    if search_type in ['all', 'users']:
        instructors = User.objects.filter(
            role=User.Role.INSTRUCTOR
        ).filter(
            Q(username__icontains=query) |
            Q(display_name__icontains=query) |
            Q(email__icontains=query)
        )[:10]
        
        results['instructors'] = [{
            'id': u.id,
            'username': u.username,
            'name': u.get_full_name() or u.username,
            'avatar': u.avatar.url if u.avatar else None,
            'bio': u.bio[:200] if u.bio else '',
            'course_count': u.courses_taught.filter(is_published=True).count()
        } for u in instructors]
    
    results['total_count'] = len(results['courses']) + len(results['instructors'])
    
    # Cache results
    cache.set(cache_key, results, CACHE_TTL)
    
    return Response(results)


@api_view(['GET'])
@permission_classes([AllowAny])
def search_suggestions(request):
    """
    Auto-complete search suggestions.
    
    Query params:
    - q: Partial search query
    - limit: Number of suggestions (default 10)
    """
    query = request.GET.get('q', '').strip().lower()
    limit = int(request.GET.get('limit', 10))
    
    if not query or len(query) < 1:
        return Response({'suggestions': []})
    
    # Cache key
    cache_key = f"search_suggestions:{query}:{limit}"
    cached = cache.get(cache_key)
    if cached:
        return Response(cached)
    
    suggestions = []
    
    # Course title suggestions
    course_suggestions = Course.objects.filter(
        is_published=True,
        title__icontains=query
    ).values_list('title', flat=True)[:limit]
    
    for title in course_suggestions:
        suggestions.append({
            'type': 'course',
            'text': title,
            'highlight': title.replace(query, f'<strong>{query}</strong>')
        })
    
    # Category suggestions
    category_suggestions = Category.objects.filter(
        is_active=True,
        name__icontains=query
    ).values_list('name', flat=True)[:5]
    
    for name in category_suggestions:
        suggestions.append({
            'type': 'category',
            'text': name,
            'highlight': name.replace(query, f'<strong>{query}</strong>')
        })
    
    # Popular search terms (could be stored in database)
    popular_terms = [
        'Python programming',
        'Machine learning',
        'Web development',
        'Data science',
        'React',
        'Django',
        'Flutter'
    ]
    
    for term in popular_terms:
        if query in term.lower() and len(suggestions) < limit:
            suggestions.append({
                'type': 'popular',
                'text': term,
                'highlight': term.replace(query, f'<strong>{query}</strong>')
            })
    
    result = {'suggestions': suggestions[:limit]}
    cache.set(cache_key, result, 60)  # Cache for 1 minute
    
    return Response(result)


@api_view(['GET'])
@permission_classes([AllowAny])
def advanced_search(request):
    """
    Advanced search with multiple filters.
    
    Query params:
    - q: Search query
    - category: Category slug
    - level: Beginner, Intermediate, Advanced
    - price_min: Minimum price
    - price_max: Maximum price
    - rating: Minimum rating (1-5)
    - duration: Short (<5h), Medium (5-20h), Long (>20h)
    - has_certificate: true/false
    - sort: relevance, rating, newest, price_low, price_high, popular
    """
    query = request.GET.get('q', '').strip()
    
    # Base queryset
    courses = Course.objects.filter(is_published=True)
    
    # Text search
    if query:
        courses = courses.filter(
            Q(title__icontains=query) |
            Q(description__icontains=query) |
            Q(short_description__icontains=query)
        )
    
    # Category filter
    category = request.GET.get('category', '')
    if category:
        courses = courses.filter(category__slug=category)
    
    # Level filter
    level = request.GET.get('level', '')
    if level:
        courses = courses.filter(difficulty=level)
    
    # Price range
    price_min = request.GET.get('price_min')
    if price_min:
        courses = courses.filter(price__gte=price_min)
    
    price_max = request.GET.get('price_max')
    if price_max:
        courses = courses.filter(price__lte=price_max)
    
    # Rating filter
    rating = request.GET.get('rating')
    if rating:
        courses = courses.filter(avg_rating__gte=rating)
    
    # Certificate filter
    has_certificate = request.GET.get('has_certificate')
    if has_certificate == 'true':
        courses = courses.filter(certificates__isnull=False).distinct()
    elif has_certificate == 'false':
        courses = courses.filter(certificates__isnull=True).distinct()
    
    # Duration filter
    duration = request.GET.get('duration')
    if duration == 'short':
        courses = courses.filter(duration_hours__lt=5)  # < 5 hours
    elif duration == 'medium':
        courses = courses.filter(duration_hours__gte=5, duration_hours__lte=20)  # 5-20 hours
    elif duration == 'long':
        courses = courses.filter(duration_hours__gt=20)  # > 20 hours
    
    # Sorting
    sort = request.GET.get('sort', 'relevance')
    if sort == 'rating':
        courses = courses.order_by('-avg_rating')
    elif sort == 'newest':
        courses = courses.order_by('-created_at')
    elif sort == 'price_low':
        courses = courses.order_by('price')
    elif sort == 'price_high':
        courses = courses.order_by('-price')
    elif sort == 'popular':
        courses = courses.order_by('-enrollment_count')
    
    # Pagination
    page = int(request.GET.get('page', 1))
    per_page = int(request.GET.get('per_page', 20))
    start = (page - 1) * per_page
    end = start + per_page
    
    total_count = courses.count()
    courses = courses.select_related('instructor', 'category')[start:end]
    
    return Response({
        'query': query,
        'filters': {
            'category': category,
            'level': level,
            'price_min': price_min,
            'price_max': price_max,
            'rating': rating,
            'duration': duration,
            'has_certificate': has_certificate
        },
        'pagination': {
            'page': page,
            'per_page': per_page,
            'total_count': total_count,
            'total_pages': (total_count + per_page - 1) // per_page
        },
        'results': [{
            'id': c.id,
            'slug': c.slug,
            'title': c.title,
            'description': c.short_description or c.description[:200],
            'thumbnail': c.thumbnail.url if c.thumbnail else None,
            'instructor': c.instructor.get_full_name() or c.instructor.username,
            'category': c.category.name if c.category else None,
            'level': c.difficulty,
            'price': str(c.price),
            'rating': float(c.avg_rating),
            'review_count': c.review_count,
            'enrollment_count': c.enrollment_count,
            'duration': c.duration_hours,
            'created_at': c.created_at.isoformat()
        } for c in courses]
    })


@api_view(['GET'])
@permission_classes([AllowAny])
def trending_searches(request):
    """
    Get trending search terms and popular content.
    """
    cache_key = "trending_searches"
    cached = cache.get(cache_key)
    if cached:
        return Response(cached)
    
    # Get popular categories
    popular_categories = Category.objects.filter(
        is_active=True
    ).annotate(
        course_count=Count('courses')
    ).order_by('-course_count')[:10]
    
    # Get trending courses (most enrolled in last 7 days)
    from django.utils import timezone
    from datetime import timedelta
    
    last_week = timezone.now() - timedelta(days=7)
    trending_courses = Course.objects.filter(
        is_published=True,
        enrollments__created_at__gte=last_week
    ).annotate(
        recent_enrollments=Count('enrollments')
    ).order_by('-recent_enrollments')[:10]
    
    result = {
        'popular_searches': [
            'Python',
            'Machine Learning',
            'Web Development',
            'Data Science',
            'Mobile App Development',
            'React',
            'Django',
            'Flutter',
            'DevOps',
            'Cloud Computing'
        ],
        'popular_categories': [{
            'slug': cat.slug,
            'name': cat.name,
            'course_count': cat.course_count,
            'icon': cat.icon if hasattr(cat, 'icon') else None
        } for cat in popular_categories],
        'trending_courses': [{
            'id': c.id,
            'slug': c.slug,
            'title': c.title,
            'thumbnail': c.thumbnail.url if c.thumbnail else None,
            'instructor': c.instructor.get_full_name() or c.instructor.username,
            'recent_enrollments': getattr(c, 'recent_enrollments', 0)
        } for c in trending_courses],
        'new_courses': Course.objects.filter(
            is_published=True
        ).order_by('-created_at')[:5].values('id', 'slug', 'title', 'thumbnail')
    }
    
    cache.set(cache_key, result, 1800)  # Cache for 30 minutes
    
    return Response(result)

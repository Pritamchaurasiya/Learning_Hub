# Django Backend Query Optimization & N+1 Prevention Guide

## Overview
This guide provides comprehensive query optimization patterns to prevent N+1 queries and improve performance across the Learning Hub Django backend.

---

## 1. Common N+1 Query Patterns & Solutions

### Pattern 1: Related Object Access

#### ❌ BAD - N+1 Query
```python
# This causes N+1 queries
courses = Course.objects.all()
for course in courses:
    print(course.instructor.email)  # Query for each course!
    print(course.category.name)     # Another query for each course!
```

#### ✅ GOOD - Optimized with select_related
```python
# Single query with JOINs
courses = Course.objects.select_related('instructor', 'category').all()
for course in courses:
    print(course.instructor.email)  # No additional query
    print(course.category.name)     # No additional query
```

---

### Pattern 2: Reverse ForeignKey Relations

#### ❌ BAD - N+1 Query
```python
users = User.objects.all()
for user in users:
    enrollments = user.enrollments.all()  # Query for each user!
    print(len(enrollments))
```

#### ✅ GOOD - Optimized with prefetch_related
```python
users = User.objects.prefetch_related('enrollments').all()
for user in users:
    enrollments = user.enrollments.all()  # No additional query
    print(len(enrollments))
```

---

### Pattern 3: ManyToMany Relations

#### ❌ BAD - N+1 Query
```python
problems = Problem.objects.all()
for problem in problems:
    tags = problem.tags.all()  # Query for each problem!
    print([tag.name for tag in tags])
```

#### ✅ GOOD - Optimized with prefetch_related
```python
problems = Problem.objects.prefetch_related('tags').all()
for problem in problems:
    tags = problem.tags.all()  # No additional query
    print([tag.name for tag in tags])
```

---

### Pattern 4: Nested Relations

#### ❌ BAD - N+1 Query
```python
courses = Course.objects.prefetch_related('modules')
for course in courses:
    for module in course.modules.all():
        lessons = module.lessons.all()  # Query for each module!
```

#### ✅ GOOD - Optimized with Prefetch Object
```python
from django.db.models import Prefetch

courses = Course.objects.prefetch_related(
    Prefetch('modules', queryset=Module.objects.prefetch_related('lessons'))
)
for course in courses:
    for module in course.modules.all():
        lessons = module.lessons.all()  # No additional query
```

---

## 2. ViewSet Query Optimization Patterns

### User ViewSet
```python
class UserViewSet(viewsets.ModelViewSet):
    def get_queryset(self):
        queryset = User.objects.all()
        
        if self.action == 'list':
            # Optimize for list view
            queryset = queryset.select_related('xp_profile', 'streak_profile')
        
        elif self.action == 'retrieve':
            # Optimize for detail view
            queryset = queryset.select_related(
                'xp_profile', 
                'streak_profile'
            ).prefetch_related(
                'badges__badge',
                'enrollments__course',
                'organization_memberships__organization'
            )
        
        return queryset
```

### Course ViewSet
```python
class CourseViewSet(viewsets.ModelViewSet):
    def get_queryset(self):
        queryset = Course.objects.filter(is_published=True)
        
        if self.action == 'list':
            # Minimal data for list
            queryset = queryset.select_related(
                'instructor',
                'category'
            ).only(
                'id', 'title', 'slug', 'price', 'thumbnail',
                'instructor__username', 'category__name'
            )
        
        elif self.action == 'retrieve':
            # Full data for detail
            queryset = queryset.select_related(
                'instructor',
                'category'
            ).prefetch_related(
                Prefetch(
                    'modules',
                    queryset=Module.objects.prefetch_related('lessons').order_by('order')
                ),
                'reviews__user'
            )
        
        return queryset
```

### Problem (DSA) ViewSet
```python
class ProblemViewSet(viewsets.ReadOnlyModelViewSet):
    def get_queryset(self):
        queryset = Problem.objects.filter(is_active=True)
        
        if self.action == 'list':
            queryset = queryset.prefetch_related('tags').annotate(
                submission_count=Count('submissions'),
                acceptance_rate=Avg('submissions__status')
            )
        
        elif self.action == 'retrieve':
            user = self.request.user
            queryset = queryset.prefetch_related('tags', 'test_cases')
            
            if user.is_authenticated:
                # Prefetch user's submissions
                queryset = queryset.prefetch_related(
                    Prefetch(
                        'submissions',
                        queryset=Submission.objects.filter(user=user).order_by('-submitted_at')[:5],
                        to_attr='user_submissions'
                    )
                )
        
        return queryset
```

### Enrollment ViewSet
```python
class EnrollmentViewSet(viewsets.ModelViewSet):
    def get_queryset(self):
        queryset = Enrollment.objects.filter(user=self.request.user)
        
        # Always optimize enrollments
        queryset = queryset.select_related(
            'course__instructor',
            'course__category'
        ).prefetch_related(
            Prefetch(
                'course__modules',
                queryset=Module.objects.prefetch_related('lessons')
            )
        )
        
        return queryset
```

---

## 3. Serializer Optimization

### Use SerializerMethodField Sparingly
```python
# ❌ BAD - Causes queries in serializer
class CourseSerializer(serializers.ModelSerializer):
    enrolled_users = serializers.SerializerMethodField()
    
    def get_enrolled_users(self, obj):
        return obj.enrollments.count()  # Query for each course!

# ✅ GOOD - Annotate in view
class CourseViewSet(viewsets.ModelViewSet):
    def get_queryset(self):
        return Course.objects.annotate(
            enrolled_users_count=Count('enrollments')
        )

class CourseSerializer(serializers.ModelSerializer):
    enrolled_users = serializers.IntegerField(source='enrolled_users_count')
```

---

## 4. Specific Optimization Recipes

### Recipe 1: Leaderboard Query
```python
# Gamification leaderboard with user details
def get_leaderboard(limit=50):
    return UserXP.objects.select_related(
        'user',
        'user__streak_profile'
    ).annotate(
        badge_count=Count('user__badges')
    ).order_by('-total_xp')[:limit]
```

### Recipe 2: Course with Progress
```python
# Course list with user progress
def get_courses_with_progress(user):
    return Course.objects.filter(
        is_published=True
    ).select_related(
        'instructor',
        'category'
    ).prefetch_related(
        Prefetch(
            'enrollments',
            queryset=Enrollment.objects.filter(user=user),
            to_attr='user_enrollment'
        )
    )
```

### Recipe 3: User Dashboard Stats
```python
# User dashboard with all stats
def get_user_dashboard_data(user):
    from django.db.models import Prefetch, Count, Avg
    
    user_data = User.objects.filter(id=user.id).select_related(
        'xp_profile',
        'streak_profile'
    ).prefetch_related(
        Prefetch(
            'enrollments',
            queryset=Enrollment.objects.select_related('course').annotate(
                completed_lessons=Count('course__modules__lessons')
            )
        ),
        'badges__badge',
        Prefetch(
            'submissions',
            queryset=Submission.objects.select_related('problem').filter(
                status='AC'
            )[:10]
        )
    ).annotate(
        total_courses=Count('enrollments'),
        completed_courses=Count('enrollments', filter=Q(enrollments__completed_at__isnull=False))
    ).first()
    
    return user_data
```

### Recipe 4: Discussion Thread with Replies
```python
# Discussion threads with nested replies
def get_discussion_threads():
    from apps.discussions.models import DiscussionThread
    
    return DiscussionThread.objects.select_related(
        'author',
        'course'
    ).prefetch_related(
        Prefetch(
            'replies',
            queryset=DiscussionReply.objects.select_related('author').order_by('created_at')
        ),
        'tags'
    ).annotate(
        reply_count=Count('replies'),
        view_count=Count('views')
    )
```

---

## 5. Database-Level Optimizations

### Use only() for Minimal Fields
```python
# Fetch only required fields
courses = Course.objects.only(
    'id', 'title', 'slug', 'price', 'thumbnail'
).select_related('instructor').only(
    'instructor__username', 'instructor__avatar'
)
```

### Use defer() to Exclude Large Fields
```python
# Exclude large text fields
courses = Course.objects.defer(
    'description',
    'learning_objectives',
    'requirements'
).select_related('instructor')
```

### Use values() for Aggregations
```python
# Get only specific values without model instances
stats = Payment.objects.filter(
    status='completed'
).values('currency').annotate(
    total_revenue=Sum('amount'),
    payment_count=Count('id')
)
```

---

## 6. Caching Strategies

### View-Level Caching
```python
from django.views.decorators.cache import cache_page
from django.utils.decorators import method_decorator

class LeaderboardView(APIView):
    @method_decorator(cache_page(60))  # Cache for 1 minute
    def get(self, request):
        leaderboard = get_leaderboard()
        return Response(data=leaderboard)
```

### QuerySet Caching
```python
from django.core.cache import cache

def get_featured_courses():
    cache_key = 'featured_courses'
    courses = cache.get(cache_key)
    
    if courses is None:
        courses = list(Course.objects.filter(
            is_featured=True,
            is_published=True
        ).select_related('instructor', 'category')[:10])
        cache.set(cache_key, courses, 300)  # Cache for 5 minutes
    
    return courses
```

---

## 7. Performance Testing

### Django Debug Toolbar
```python
# Install and configure
# pip install django-debug-toolbar

# settings.py
if DEBUG:
    INSTALLED_APPS += ['debug_toolbar']
    MIDDLEWARE += ['debug_toolbar.middleware.DebugToolbarMiddleware']
    INTERNAL_IPS = ['127.0.0.1']
```

### Query Counter Decorator
```python
from django.db import connection
from django.test.utils import override_settings

def print_num_queries(func):
    def wrapper(*args, **kwargs):
        # Reset queries
        connection.queries_log.clear()
        
        result = func(*args, **kwargs)
        
        print(f"\n{func.__name__} executed {len(connection.queries)} queries")
        return result
    
    return wrapper

# Usage
@print_num_queries
def test_view():
    courses = Course.objects.all()
    for course in courses:
        print(course.instructor.name)
```

---

## 8. Implementation Checklist

### For Each ViewSet:
- [ ] Add `select_related()` for ForeignKey fields used in serializer
- [ ] Add `prefetch_related()` for reverse FK and M2M fields
- [ ] Use `only()` or `defer()` for list views with many fields
- [ ] Annotate counts/aggregates in queryset, not SerializerMethodField
- [ ] Different queryset optimization for list vs detail views
- [ ] Consider caching for frequently accessed data

### For Each Serializer:
- [ ] Minimize SerializerMethodField usage
- [ ] Use `source` parameter instead of methods when possible
- [ ] Create separate serializers for list and detail views
- [ ] Avoid nested serializers that cause additional queries

---

## 9. Before/After Examples

### User Profile Endpoint
```python
# ❌ BEFORE: 50+ queries
@api_view(['GET'])
def user_profile(request):
    user = request.user
    enrollments = user.enrollments.all()
    badges = user.badges.all()
    submissions = user.submissions.all()
    
    data = {
        'xp': user.xp_profile.total_xp,
        'streak': user.streak_profile.current_streak,
        'enrollments': len(enrollments),
        'badges': len(badges),
        'submissions': len(submissions)
    }
    return Response(data)

# ✅ AFTER: 1-2 queries
@api_view(['GET'])
def user_profile(request):
    user = User.objects.filter(id=request.user.id).select_related(
        'xp_profile',
        'streak_profile'
    ).prefetch_related(
        'enrollments',
        'badges',
        'submissions'
    ).annotate(
        enrollment_count=Count('enrollments'),
        badge_count=Count('badges'),
        submission_count=Count('submissions')
    ).first()
    
    data = {
        'xp': user.xp_profile.total_xp,
        'streak': user.streak_profile.current_streak,
        'enrollments': user.enrollment_count,
        'badges': user.badge_count,
        'submissions': user.submission_count
    }
    return Response(data)
```

---

## Summary

Key principles for query optimization:
1. ✅ **Use select_related()** for ForeignKey and OneToOne
2. ✅ **Use prefetch_related()** for reverse FK and ManyToMany
3. ✅ **Annotate in views**, not SerializerMethodField
4. ✅ **Different optimization** for list vs detail views
5. ✅ **Cache frequently** accessed data
6. ✅ **Test with debug toolbar** to verify optimization
7. ✅ **Monitor query count** in production

Expected Performance Improvement: **10-50x reduction in database queries**

---

**Document Version**: 1.0  
**Created**: 2026-10-19  
**Author**: Kiro AI Assistant

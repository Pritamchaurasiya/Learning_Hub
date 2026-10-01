from rest_framework.views import APIView
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework import status
from django.db.models import F, Q
from apps.core.responses import success_response, error_response
from .models import Course, Chapter, Lesson, Enrollment, LessonProgress, CourseReview, CourseBookmark
from .serializers import CourseListSerializer, CourseDetailSerializer, CourseReviewSerializer

class CourseListView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        queryset = Course.objects.filter(is_published=True).select_related('instructor')
        category = request.query_params.get('category')
        search = request.query_params.get('search') or request.query_params.get('q')
        level = request.query_params.get('level')

        if category and category != 'All':
            queryset = queryset.filter(category__iexact=category)
        if search:
            queryset = queryset.filter(title__icontains=search) | queryset.filter(description__icontains=search)
        if level and level != 'All Levels':
            queryset = queryset.filter(level__iexact=level)

        serializer = CourseListSerializer(queryset, many=True, context={'request': request})
        return success_response(data=serializer.data, meta={'count': len(serializer.data), 'total': len(serializer.data)})

class CourseDetailView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, pk):
        course = Course.objects.prefetch_related('chapters__lessons', 'reviews__user').filter(Q(pk=pk) | Q(slug=pk)).first()
        if not course:
            return error_response('Course not found', status_code=status.HTTP_404_NOT_FOUND)

        serializer = CourseDetailSerializer(course, context={'request': request})
        data = serializer.data

        # Check if user is enrolled
        if request.user.is_authenticated:
            enrollment = Enrollment.objects.filter(user=request.user, course=course).first()
            data['is_enrolled'] = bool(enrollment)
            data['progress'] = enrollment.progress if enrollment else 0.0
            data['is_bookmarked'] = CourseBookmark.objects.filter(user=request.user, course=course).exists()
        else:
            data['is_enrolled'] = False
            data['progress'] = 0.0
            data['is_bookmarked'] = False

        return success_response(data=data)

class EnrollCourseView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk=None):
        target_id = pk or request.data.get('courseId') or request.data.get('course_id') or request.data.get('courseSlug')
        if not target_id:
            return error_response('Course ID required', status_code=status.HTTP_400_BAD_REQUEST)
        course = Course.objects.filter(Q(pk=target_id) | Q(slug=target_id)).first()
        if not course:
            return error_response('Course not found', status_code=status.HTTP_404_NOT_FOUND)

        enrollment, created = Enrollment.objects.get_or_create(user=request.user, course=course)
        if created:
            Course.objects.filter(pk=target_id).update(student_count=F('student_count') + 1)
            course.refresh_from_db(fields=['student_count'])

        return success_response(
            data={'enrolled': True, 'courseId': str(course.id), 'progress': enrollment.progress},
            message='Enrolled in course successfully'
        )

class LessonProgressUpdateView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, lesson_id):
        try:
            lesson = Lesson.objects.select_related('chapter__course').get(pk=lesson_id)
        except Lesson.DoesNotExist:
            return error_response('Lesson not found', status_code=status.HTTP_404_NOT_FOUND)

        completed = request.data.get('completed', True)
        lp, _ = LessonProgress.objects.update_or_create(
            user=request.user,
            lesson=lesson,
            defaults={'completed': completed}
        )

        # Recalculate enrollment progress
        course = lesson.chapter.course
        total_lessons = Lesson.objects.filter(chapter__course=course).count()
        completed_lessons = LessonProgress.objects.filter(
            user=request.user,
            lesson__chapter__course=course,
            completed=True
        ).count()

        new_progress = round((completed_lessons / max(1, total_lessons)) * 100, 1)
        Enrollment.objects.filter(user=request.user, course=course).update(progress=new_progress)

        return success_response(
            data={'lessonId': lesson_id, 'completed': completed, 'courseProgress': new_progress},
            message='Lesson progress updated'
        )

    def put(self, request, lesson_id):
        return self.post(request, lesson_id)

class CourseReviewView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, pk):
        reviews = CourseReview.objects.filter(course_id=pk).select_related('user')
        return success_response(data=CourseReviewSerializer(reviews, many=True).data)

    def post(self, request, pk):
        if not request.user.is_authenticated:
            return error_response('Authentication required', status_code=status.HTTP_401_UNAUTHORIZED)
        try:
            course = Course.objects.get(pk=pk)
        except Course.DoesNotExist:
            return error_response('Course not found', status_code=status.HTTP_404_NOT_FOUND)

        rating = int(request.data.get('rating', 5))
        review_text = request.data.get('reviewText') or request.data.get('review_text', '')

        review = CourseReview.objects.create(
            user=request.user,
            course=course,
            rating=min(5, max(1, rating)),
            review_text=review_text
        )

        return success_response(
            data=CourseReviewSerializer(review).data,
            message='Review submitted successfully',
            status_code=status.HTTP_201_CREATED
        )

class CourseBookmarkView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        try:
            course = Course.objects.get(pk=pk)
        except Course.DoesNotExist:
            return error_response('Course not found', status_code=status.HTTP_404_NOT_FOUND)

        notes = request.data.get('notes', '')
        bookmark, created = CourseBookmark.objects.update_or_create(
            user=request.user,
            course=course,
            defaults={'notes': notes}
        )
        return success_response(data={'bookmark_id': str(bookmark.id), 'bookmarked': True}, message='Course bookmarked')

    def delete(self, request, pk):
        CourseBookmark.objects.filter(user=request.user, course_id=pk).delete()
        return success_response(data={'bookmarked': False}, message='Bookmark removed')

class CourseLessonsListView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, pk):
        try:
            course = Course.objects.prefetch_related('chapters__lessons').get(pk=pk)
        except Course.DoesNotExist:
            return error_response('Course not found', status_code=status.HTTP_404_NOT_FOUND)

        is_enrolled = False
        is_free_course = getattr(course, 'price', 0) == 0
        if request.user.is_authenticated:
            is_enrolled = Enrollment.objects.filter(user=request.user, course=course).exists()
            completed_lesson_ids = set(
                str(lid) for lid in LessonProgress.objects.filter(
                    user=request.user,
                    lesson__chapter__course=course,
                    completed=True
                ).values_list('lesson_id', flat=True)
            )

        can_access_full = is_free_course or is_enrolled or (request.user.is_authenticated and getattr(request.user, 'is_staff', False))

        chapters_data = []
        for chapter in course.chapters.all():
            lessons_data = []
            for lesson in chapter.lessons.all():
                is_preview = getattr(lesson, 'is_free_preview', False)
                video_url = lesson.video_url if (can_access_full or is_preview) else None
                duration = getattr(lesson, 'duration_minutes', 0) or 0
                lessons_data.append({
                    'id': str(lesson.id),
                    'title': lesson.title,
                    'duration': duration,
                    'duration_minutes': duration,
                    'video_url': video_url,
                    'is_preview': is_preview,
                    'is_free_preview': is_preview,
                    'is_completed': str(lesson.id) in completed_lesson_ids,
                    'order': lesson.order,
                })
            chapters_data.append({
                'id': str(chapter.id),
                'title': chapter.title,
                'order': chapter.order,
                'lessons': lessons_data,
            })

        return success_response(data=chapters_data)

class CourseProgressView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        course = Course.objects.filter(Q(pk=pk) | Q(slug=pk)).first()
        if not course:
            return error_response('Course not found', status_code=status.HTTP_404_NOT_FOUND)
        enrollment = Enrollment.objects.filter(user=request.user, course=course).first()
        total_lessons = Lesson.objects.filter(chapter__course=course).count()
        completed_lessons = LessonProgress.objects.filter(
            user=request.user,
            lesson__chapter__course=course,
            completed=True
        ).count()
        progress_pct = enrollment.progress if enrollment else 0.0

        return success_response(data={
            'progress': progress_pct,
            'progress_percent': progress_pct,
            'completed_lessons': completed_lessons,
            'total_lessons': total_lessons,
            'enrollment': {'progress': progress_pct}
        })

    def post(self, request, pk):
        course = Course.objects.filter(Q(pk=pk) | Q(slug=pk)).first()
        if not course:
            return error_response('Course not found', status_code=status.HTTP_404_NOT_FOUND)

        # SECURITY: Validate progress value
        try:
            progress_val = float(request.data.get('progress', 0.0))
        except (ValueError, TypeError):
            return error_response('Invalid progress value: must be a number', status_code=status.HTTP_400_BAD_REQUEST)

        if not (progress_val == progress_val):  # NaN check
            return error_response('Invalid progress value', status_code=status.HTTP_400_BAD_REQUEST)

        enrollment, _ = Enrollment.objects.get_or_create(user=request.user, course=course)

        # Compute server-side progress from actual lesson completions
        total_lessons = Lesson.objects.filter(chapter__course=course).count()
        completed_lessons = LessonProgress.objects.filter(
            user=request.user,
            lesson__chapter__course=course,
            completed=True
        ).count()
        server_progress = round((completed_lessons / max(1, total_lessons)) * 100, 1)

        # Client can only DECREASE progress or set to exact server-computed value
        if progress_val > server_progress and progress_val > enrollment.progress:
            return error_response(
                f'Cannot claim {progress_val}% progress. Server-computed is {server_progress}% based on completed lessons. Use lesson completion to increase progress.',
                status_code=status.HTTP_403_FORBIDDEN,
                code='PROGRESS_INFLATION_BLOCKED'
            )

        enrollment.progress = min(100.0, max(0.0, progress_val))
        enrollment.save()
        return success_response(
            data={
                'progress': enrollment.progress,
                'progress_percent': enrollment.progress,
                'completed_lessons': completed_lessons,
                'total_lessons': total_lessons,
                'server_computed': server_progress,
                'enrollment': {'progress': enrollment.progress}
            },
            message='Progress updated'
        )

class CourseCategoriesView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        cats = Course.objects.filter(is_published=True).values_list('category', flat=True).distinct()
        categories_list = [{'id': f'cat-{i}', 'name': c, 'slug': c.lower().replace(' ', '-'), 'course_count': Course.objects.filter(is_published=True, category=c).count()} for i, c in enumerate(cats) if c]
        return success_response(data=categories_list)

class CourseFeaturedView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        courses = Course.objects.filter(is_published=True).order_by('-rating', '-student_count')[:12]
        serializer = CourseListSerializer(courses, many=True, context={'request': request})
        return success_response(data=serializer.data, meta={'count': len(serializer.data)})

class CourseTrendingView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        courses = Course.objects.filter(is_published=True).order_by('-student_count', '-updated_at')[:12]
        serializer = CourseListSerializer(courses, many=True, context={'request': request})
        return success_response(data=serializer.data, meta={'count': len(serializer.data)})

class CourseSearchView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        q = request.query_params.get('q', '').strip()
        limit = min(50, max(1, int(request.query_params.get('limit', 20))))
        queryset = Course.objects.filter(is_published=True)
        if q:
            queryset = queryset.filter(Q(title__icontains=q) | Q(description__icontains=q))
        courses = queryset[:limit]
        serializer = CourseListSerializer(courses, many=True, context={'request': request})
        return success_response(data=serializer.data, meta={'count': len(serializer.data)})

class CourseCompleteView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        course_id = request.data.get('courseId') or request.data.get('course_id')
        if not course_id:
            return error_response('Course ID is required', status_code=status.HTTP_400_BAD_REQUEST)
        course = Course.objects.filter(Q(pk=course_id) | Q(slug=course_id)).first()
        if not course:
            return error_response('Course not found', status_code=status.HTTP_404_NOT_FOUND)

        from django.utils import timezone
        enrollment, _ = Enrollment.objects.get_or_create(user=request.user, course=course)
        enrollment.progress = 100.0
        enrollment.completed_at = timezone.now()
        enrollment.save(update_fields=['progress', 'completed_at'])

        # Mark all lessons completed for this user in this course
        lessons = Lesson.objects.filter(chapter__course=course)
        for lsn in lessons:
            LessonProgress.objects.update_or_create(user=request.user, lesson=lsn, defaults={'completed': True})

        # Award XP
        earned_xp = int(request.data.get('xp', 50))
        request.user.xp = (request.user.xp or 0) + earned_xp
        request.user.save(update_fields=['xp'])

        return success_response(
            data={'completed': True, 'courseId': course.id, 'xpAwarded': earned_xp, 'progress': 100.0},
            message='Course completed successfully'
        )

class UpdateStreakView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        request.user.streak = (request.user.streak or 0) + 1
        request.user.save(update_fields=['streak'])
        return success_response(data={'streak': request.user.streak}, message='Streak updated')


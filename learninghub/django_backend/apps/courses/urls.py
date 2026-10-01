from django.urls import path
from .views import (
    CourseListView, CourseDetailView, EnrollCourseView,
    LessonProgressUpdateView, CourseReviewView, CourseBookmarkView,
    CourseLessonsListView, CourseProgressView, CourseCategoriesView,
    CourseFeaturedView, CourseTrendingView, CourseSearchView,
    CourseCompleteView, UpdateStreakView
)

urlpatterns = [
    path('courses', CourseListView.as_view(), name='courses-list'),
    path('courses/', CourseListView.as_view(), name='courses-list-slash'),
    path('courses/categories', CourseCategoriesView.as_view(), name='courses-categories'),
    path('courses/categories/', CourseCategoriesView.as_view(), name='courses-categories-slash'),
    path('courses/featured', CourseFeaturedView.as_view(), name='courses-featured'),
    path('courses/featured/', CourseFeaturedView.as_view(), name='courses-featured-slash'),
    path('courses/trending', CourseTrendingView.as_view(), name='courses-trending'),
    path('courses/trending/', CourseTrendingView.as_view(), name='courses-trending-slash'),
    path('courses/search', CourseSearchView.as_view(), name='courses-search'),
    path('courses/search/', CourseSearchView.as_view(), name='courses-search-slash'),
    path('courses/enroll', EnrollCourseView.as_view(), name='courses-enroll-root'),
    path('courses/<str:pk>', CourseDetailView.as_view(), name='course-detail'),
    path('courses/<str:pk>/', CourseDetailView.as_view(), name='course-detail-slash'),
    path('courses/<str:pk>/enroll', EnrollCourseView.as_view(), name='course-enroll'),
    path('courses/<str:pk>/reviews', CourseReviewView.as_view(), name='course-review'),
    path('courses/<str:pk>/bookmark', CourseBookmarkView.as_view(), name='course-bookmark'),
    path('courses/<str:pk>/lessons', CourseLessonsListView.as_view(), name='course-lessons'),
    path('courses/<str:pk>/progress', CourseProgressView.as_view(), name='course-progress'),
    path('courses/<str:course_slug>/lessons/<str:lesson_id>/progress', LessonProgressUpdateView.as_view(), name='course-lesson-progress'),
    path('lessons/<str:lesson_id>/progress', LessonProgressUpdateView.as_view(), name='lesson-progress-update'),
    path('lessons/<str:lesson_id>/progress/', LessonProgressUpdateView.as_view(), name='lesson-progress-update-slash'),
    path('progress/complete-course', CourseCompleteView.as_view(), name='progress-complete-course'),
    path('progress/update-streak', UpdateStreakView.as_view(), name='progress-update-streak'),
]

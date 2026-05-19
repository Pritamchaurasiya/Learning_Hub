"""Admin configuration for analytics v2."""
from django.contrib import admin
from .models import TopicPerformance, ExamPerformance, PerformanceTrend, AIRecommendation


@admin.register(TopicPerformance)
class TopicPerformanceAdmin(admin.ModelAdmin):
    list_display = ('user', 'topic', 'accuracy', 'mastery_level', 'trend', 'total_attempts', 'last_attempted')
    list_filter = ('trend', 'topic__subject__exam')
    search_fields = ('user__email', 'topic__name')
    list_select_related = ('user', 'topic', 'topic__subject', 'topic__subject__exam')


@admin.register(ExamPerformance)
class ExamPerformanceAdmin(admin.ModelAdmin):
    list_display = ('user', 'exam', 'avg_percentage', 'best_percentage', 'total_tests_taken', 'percentile_rank')
    list_filter = ('exam',)
    search_fields = ('user__email', 'exam__name')
    list_select_related = ('user', 'exam')


@admin.register(PerformanceTrend)
class PerformanceTrendAdmin(admin.ModelAdmin):
    list_display = ('user', 'date', 'period', 'tests_taken', 'avg_percentage', 'streak_days')
    list_filter = ('period', 'exam')
    date_hierarchy = 'date'
    list_select_related = ('user',)


@admin.register(AIRecommendation)
class AIRecommendationAdmin(admin.ModelAdmin):
    list_display = ('user', 'recommendation_type', 'title', 'priority', 'is_actioned', 'is_dismissed', 'created_at')
    list_filter = ('recommendation_type', 'priority', 'is_actioned', 'is_dismissed')
    search_fields = ('user__email', 'title', 'description')
    list_select_related = ('user',)

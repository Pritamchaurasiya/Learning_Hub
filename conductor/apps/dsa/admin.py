from django.contrib import admin
from .models import Problem, TestCase, Submission


@admin.register(Problem)
class ProblemAdmin(admin.ModelAdmin):
    list_display = ['title', 'difficulty', 'points', 'is_active', 'created_at']
    list_filter = ['difficulty', 'is_active', 'created_at']
    search_fields = ['title', 'slug', 'description']
    prepopulated_fields = {'slug': ('title',)}


@admin.register(TestCase)
class TestCaseAdmin(admin.ModelAdmin):
    list_display = ['problem', 'is_hidden']
    list_filter = ['is_hidden']
    search_fields = ['problem__title', 'input_data']
    list_select_related = ['problem']


@admin.register(Submission)
class SubmissionAdmin(admin.ModelAdmin):
    list_display = ['user', 'problem', 'language', 'status', 'submitted_at']
    list_filter = ['status', 'language', 'submitted_at']
    search_fields = ['user__username', 'problem__title']
    list_select_related = ['user', 'problem']
    readonly_fields = ['submitted_at', 'runtime_ms', 'memory_kb']

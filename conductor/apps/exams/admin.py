"""Admin configuration for exam taxonomy."""
from django.contrib import admin
from .models import Country, Exam, Subject, Topic


@admin.register(Country)
class CountryAdmin(admin.ModelAdmin):
    list_display = ('code', 'name', 'timezone', 'currency', 'is_active', 'active_exam_count')
    list_filter = ('is_active',)
    search_fields = ('name', 'code')


class SubjectInline(admin.TabularInline):
    model = Subject
    extra = 0
    fields = ('code', 'name', 'weightage', 'expected_questions', 'is_active')


@admin.register(Exam)
class ExamAdmin(admin.ModelAdmin):
    list_display = ('code', 'name', 'country', 'is_active', 'is_featured', 'popularity_score', 'subject_count')
    list_filter = ('is_active', 'is_featured', 'country', 'frequency')
    search_fields = ('name', 'code', 'full_name')
    inlines = [SubjectInline]
    fieldsets = (
        ('Basic Info', {'fields': ('country', 'code', 'name', 'full_name', 'description')}),
        ('Pattern', {'fields': ('pattern', 'difficulty_distribution')}),
        ('Metadata', {'fields': ('official_website', 'conducting_body', 'frequency', 'next_exam_date')}),
        ('Status', {'fields': ('is_active', 'is_featured', 'popularity_score')}),
    )


class TopicInline(admin.TabularInline):
    model = Topic
    extra = 0
    fields = ('name', 'parent', 'question_count', 'avg_difficulty', 'is_active')


@admin.register(Subject)
class SubjectAdmin(admin.ModelAdmin):
    list_display = ('name', 'exam', 'weightage', 'expected_questions', 'is_active', 'topic_count')
    list_filter = ('is_active', 'exam')
    search_fields = ('name', 'code')
    inlines = [TopicInline]


@admin.register(Topic)
class TopicAdmin(admin.ModelAdmin):
    list_display = ('name', 'subject', 'parent', 'question_count', 'avg_difficulty', 'is_active')
    list_filter = ('is_active', 'subject')
    search_fields = ('name', 'description')
    list_select_related = ('subject',)

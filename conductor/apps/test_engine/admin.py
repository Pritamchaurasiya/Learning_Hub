"""Admin configuration for test engine."""
from django.contrib import admin
from .models import Question, Option, Test, TestQuestion, TestAttempt, AttemptAnswer


class OptionInline(admin.TabularInline):
    model = Option
    extra = 4
    fields = ('text', 'is_correct', 'explanation', 'order')


@admin.register(Question)
class QuestionAdmin(admin.ModelAdmin):
    list_display = ('text_short', 'question_type', 'topic', 'difficulty', 'is_ai_generated', 'is_verified', 'usage_count')
    list_filter = ('question_type', 'is_ai_generated', 'is_verified', 'bloom_level', 'topic__subject__exam')
    search_fields = ('text', 'tags')
    inlines = [OptionInline]
    readonly_fields = ('usage_count', 'correct_count', 'incorrect_count', 'avg_time_seconds')
    list_select_related = ('topic', 'topic__subject', 'topic__subject__exam')

    def text_short(self, obj):
        return obj.text[:80] + '...' if len(obj.text) > 80 else obj.text
    text_short.short_description = 'Question'


class TestQuestionInline(admin.TabularInline):
    model = TestQuestion
    extra = 0
    fields = ('question', 'order', 'marks')
    raw_id_fields = ('question',)


@admin.register(Test)
class TestAdmin(admin.ModelAdmin):
    list_display = ('title', 'exam', 'mode', 'difficulty', 'is_published', 'is_ai_generated', 'question_count', 'attempt_count')
    list_filter = ('mode', 'difficulty', 'is_published', 'is_ai_generated', 'is_featured', 'exam')
    search_fields = ('title', 'description')
    inlines = [TestQuestionInline]
    readonly_fields = ('attempt_count',)
    list_select_related = ('exam',)


@admin.register(TestAttempt)
class TestAttemptAdmin(admin.ModelAdmin):
    list_display = ('user', 'test', 'mode', 'status', 'percentage', 'passed', 'attempt_number', 'started_at')
    list_filter = ('status', 'mode', 'test__exam')
    search_fields = ('user__email', 'test__title')
    readonly_fields = ('session_token', 'autosave_data', 'autosave_version')
    list_select_related = ('user', 'test')
    date_hierarchy = 'started_at'


class AttemptAnswerInline(admin.TabularInline):
    model = AttemptAnswer
    extra = 0
    fields = ('question', 'is_correct', 'marks_obtained', 'time_spent_seconds', 'is_flagged')
    raw_id_fields = ('question',)


@admin.register(AttemptAnswer)
class AttemptAnswerAdmin(admin.ModelAdmin):
    list_display = ('attempt', 'question_short', 'is_correct', 'marks_obtained', 'time_spent_seconds')
    list_filter = ('is_correct', 'is_flagged')
    list_select_related = ('attempt', 'question')

    def question_short(self, obj):
        return obj.question.text[:50] + '...' if len(obj.question.text) > 50 else obj.question.text
    question_short.short_description = 'Question'

"""Admin configuration for test engine with authoritative scoring guards and autocomplete support."""
from django.contrib import admin
from .models import AttemptAnswer, Option, Question, Test, TestAttempt, TestQuestion


class OptionInline(admin.TabularInline):
    model = Option
    extra = 0
    fields = ('text', 'is_correct', 'explanation', 'order')


@admin.register(Question)
class QuestionAdmin(admin.ModelAdmin):
    list_display = (
        'text_short',
        'question_type',
        'topic',
        'difficulty',
        'is_ai_generated',
        'is_verified',
        'usage_count',
    )
    list_filter = ('question_type', 'is_ai_generated', 'is_verified', 'bloom_level', 'topic__subject__exam')
    search_fields = ('text', 'tags')
    inlines = [OptionInline]
    readonly_fields = ('usage_count', 'correct_count', 'incorrect_count', 'avg_time_seconds')
    list_select_related = ('topic', 'topic__subject', 'topic__subject__exam')
    autocomplete_fields = ['topic']
    actions = ['verify_questions', 'unverify_questions']

    def text_short(self, obj):
        return obj.text[:80] + '...' if len(obj.text) > 80 else obj.text
    text_short.short_description = 'Question'

    @admin.action(description="Mark selected questions as Verified")
    def verify_questions(self, request, queryset):
        count = queryset.update(is_verified=True)
        self.message_user(request, f"{count} questions marked as verified.")

    @admin.action(description="Mark selected questions as Unverified")
    def unverify_questions(self, request, queryset):
        count = queryset.update(is_verified=False)
        self.message_user(request, f"{count} questions marked as unverified.")


class TestQuestionInline(admin.TabularInline):
    model = TestQuestion
    extra = 0
    fields = ('question', 'order', 'marks')
    autocomplete_fields = ['question']


@admin.register(Test)
class TestAdmin(admin.ModelAdmin):
    list_display = (
        'title',
        'exam',
        'mode',
        'difficulty',
        'is_published',
        'is_ai_generated',
        'question_count',
        'attempt_count',
    )
    list_filter = ('mode', 'difficulty', 'is_published', 'is_ai_generated', 'is_featured', 'exam')
    search_fields = ('title', 'description')
    inlines = [TestQuestionInline]
    readonly_fields = ('attempt_count',)
    list_select_related = ('exam',)
    autocomplete_fields = ['exam']
    actions = ['publish_tests', 'unpublish_tests']

    @admin.action(description="Publish selected tests")
    def publish_tests(self, request, queryset):
        count = queryset.update(is_published=True)
        self.message_user(request, f"{count} tests published successfully.")

    @admin.action(description="Unpublish selected tests")
    def unpublish_tests(self, request, queryset):
        count = queryset.update(is_published=False)
        self.message_user(request, f"{count} tests unpublished.")


class AttemptAnswerInline(admin.TabularInline):
    model = AttemptAnswer
    extra = 0
    fields = ('question', 'is_correct', 'marks_obtained', 'time_spent_seconds', 'is_flagged')
    readonly_fields = ('question', 'is_correct', 'marks_obtained', 'time_spent_seconds', 'is_flagged')
    can_delete = False


@admin.register(TestAttempt)
class TestAttemptAdmin(admin.ModelAdmin):
    """
    TestAttempt Admin.
    Authoritative test scoring: scores and results are read-only to prevent unauthorized tampering.
    """

    list_display = ('user', 'test', 'mode', 'status', 'score', 'percentage', 'passed', 'attempt_number', 'started_at')
    list_filter = ('status', 'mode', 'test__exam')
    search_fields = ('user__email', 'test__title')
    readonly_fields = (
        'user',
        'test',
        'mode',
        'score',
        'total_marks',
        'percentage',
        'passed',
        'attempt_number',
        'started_at',
        'submitted_at',
        'session_token',
        'autosave_data',
        'autosave_version',
    )
    list_select_related = ('user', 'test')
    autocomplete_fields = ['user', 'test']
    date_hierarchy = 'started_at'
    inlines = [AttemptAnswerInline]


@admin.register(AttemptAnswer)
class AttemptAnswerAdmin(admin.ModelAdmin):
    list_display = ('attempt', 'question_short', 'is_correct', 'marks_obtained', 'time_spent_seconds')
    list_filter = ('is_correct', 'is_flagged')
    list_select_related = ('attempt', 'question')
    readonly_fields = ('attempt', 'question', 'is_correct', 'marks_obtained', 'time_spent_seconds')

    def question_short(self, obj):
        return obj.question.text[:50] + '...' if len(obj.question.text) > 50 else obj.question.text
    question_short.short_description = 'Question'

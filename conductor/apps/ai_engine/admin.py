"""
AI Engine and Cognitive Analytics administration.
"""

from django.contrib import admin
from .models import (
    Challenge,
    ChallengeParticipant,
    LearningInsight,
    ModuleProgress,
    QuizChoice,
    QuizQuestion,
    RemedialPlan,
    ResearchQuiz,
    SemanticCache,
)


class QuizChoiceInline(admin.TabularInline):
    model = QuizChoice
    extra = 0


@admin.register(QuizQuestion)
class QuizQuestionAdmin(admin.ModelAdmin):
    list_display = ["text", "quiz", "order"]
    search_fields = ["text", "quiz__title"]
    list_select_related = ["quiz"]
    inlines = [QuizChoiceInline]


class QuizQuestionInline(admin.TabularInline):
    model = QuizQuestion
    extra = 0


@admin.register(ResearchQuiz)
class ResearchQuizAdmin(admin.ModelAdmin):
    list_display = ["title", "module_slug", "xp_reward", "created_at"]
    search_fields = ["title", "module_slug"]
    inlines = [QuizQuestionInline]


@admin.register(ModuleProgress)
class ModuleProgressAdmin(admin.ModelAdmin):
    list_display = ["user", "module_slug", "is_completed", "quiz_passed", "completed_at"]
    list_filter = ["is_completed", "quiz_passed"]
    search_fields = ["user__email", "module_slug"]
    list_select_related = ["user"]
    autocomplete_fields = ["user"]


@admin.register(LearningInsight)
class LearningInsightAdmin(admin.ModelAdmin):
    list_display = ["user", "engagement_score", "consistency_score", "completion_rate", "burnout_risk", "created_at"]
    list_filter = ["preferred_time", "created_at"]
    search_fields = ["user__email", "user__username", "preferred_time"]
    list_select_related = ["user"]
    autocomplete_fields = ["user"]
    readonly_fields = ["created_at"]


@admin.register(RemedialPlan)
class RemedialPlanAdmin(admin.ModelAdmin):
    list_display = ["user", "module_slug", "is_resolved", "created_at"]
    list_filter = ["is_resolved", "created_at"]
    search_fields = ["user__email", "module_slug"]
    list_select_related = ["user"]
    autocomplete_fields = ["user"]


class ChallengeParticipantInline(admin.TabularInline):
    model = ChallengeParticipant
    extra = 0
    autocomplete_fields = ["user"]


@admin.register(Challenge)
class ChallengeAdmin(admin.ModelAdmin):
    list_display = ["title", "challenge_type", "difficulty", "xp_reward", "is_active", "starts_at", "ends_at"]
    list_filter = ["is_active", "challenge_type", "difficulty"]
    search_fields = ["title", "description"]
    inlines = [ChallengeParticipantInline]


@admin.register(SemanticCache)
class SemanticCacheAdmin(admin.ModelAdmin):
    list_display = ["id", "query_text_short", "created_at", "updated_at"]
    search_fields = ["query_text"]
    readonly_fields = ["query_text", "response_payload", "query_embedding", "created_at", "updated_at"]

    @admin.display(description="Query Text")
    def query_text_short(self, obj):
        return obj.query_text[:60] + "..." if len(obj.query_text) > 60 else obj.query_text

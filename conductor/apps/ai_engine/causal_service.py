import logging
from typing import Dict, Any, List
from django.db.models import Count, Q
from django.utils import timezone
from datetime import timedelta

from apps.users.models import User
from apps.courses.models import Course
from apps.ai_engine.models import ActivityLog, LearningInsight
from .causal_inference import CausalGraph, CausalDiscovery, InterventionEngine

logger = logging.getLogger(__name__)

class CausalAnalyticsService:
    """
    Production service bridging Django ORM ActivityLogs to the Causal Inference Engine.
    Discovers true causal drivers of student success (not just correlations).
    """

    @staticmethod
    def _build_student_dataset(days_back: int = 30) -> List[Dict[str, float]]:
        """
        Extracts a tabular matrix of causal variables per student from the ActivityLog.
        Variables: 'lessons_viewed', 'ai_questions_asked', 'code_submitted', 'course_completed'
        """
        start_date = timezone.now() - timedelta(days=days_back)
        
        # Aggregate raw metrics per user
        user_metrics = ActivityLog.objects.filter(timestamp__gte=start_date).values('user').annotate(
            lessons_viewed=Count('id', filter=Q(action=ActivityLog.ActionType.LESSON_VIEW)),
            ai_questions=Count('id', filter=Q(action=ActivityLog.ActionType.AI_QUESTION)),
            code_submissions=Count('id', filter=Q(action=ActivityLog.ActionType.CODE_SUBMIT)),
            course_completions=Count('id', filter=Q(action=ActivityLog.ActionType.COURSE_COMPLETE))
        )

        dataset = []
        for row in user_metrics:
            dataset.append({
                "lessons_viewed": float(row['lessons_viewed']),
                "ai_questions": float(row['ai_questions']),
                "code_submissions": float(row['code_submissions']),
                # Binarize outcome (1 if completed course, 0 if not)
                "course_completed": 1.0 if row['course_completions'] > 0 else 0.0
            })
            
        return dataset

    @classmethod
    def run_causal_discovery(cls, days_back: int = 30) -> Dict[str, Any]:
        """
        Executes the PC Algorithm to discover the causal DAG from actual platform engagement.
        Calculates the Average Treatment Effect (ATE) of key pedagogical interventions.
        """
        dataset = cls._build_student_dataset(days_back)
        if len(dataset) < 10:
            logger.warning("Insufficient data for Causal Discovery. Need >= 10 rows.")
            return {"status": "insufficient_data"}

        variables = ["lessons_viewed", "ai_questions", "code_submissions", "course_completed"]
        
        logger.info(f"Running PC Causal Discovery Algorithm on {len(dataset)} user timelines.")
        discovery = CausalDiscovery(alpha=0.05)
        graph = discovery.pc_algorithm(dataset, variables)

        # Build Intervention Engine to test Interventions (Do-Calculus)
        # We want to test: "What is the causal impact of asking an AI question on Course Completion?"
        engine = InterventionEngine(graph)
        
        # Calculate Average Treatment Effect for asking AI questions
        ate_ai_question = engine.average_treatment_effect("ai_questions", "course_completed", dataset)
        
        # Calculate ATE for writing code
        ate_code_submit = engine.average_treatment_effect("code_submissions", "course_completed", dataset)

        results = {
            "edges": [{"cause": e.cause, "effect": e.effect} for e in graph.edges],
            "ate_ai_question": ate_ai_question,
            "ate_code_submit": ate_code_submit,
            "sample_size": len(dataset)
        }
        
        cls._generate_insights_from_causal_graph(results)
        return results

    @classmethod
    def _generate_insights_from_causal_graph(cls, results: Dict[str, Any]):
        """
        Translates raw causal effects into user-facing / administrator-facing LearningInsights.
        """
        ate_ai = results.get("ate_ai_question", 0.0)
        
        if ate_ai > 0.1:
            # Significant positive causal impact discovered!
            # Generate a system-wide structural insight.
            # In a fully populated setup, we would link this to a Course instead of None
            insight, created = LearningInsight.objects.get_or_create(
                user=None, # System-wide insight
                insight_type=LearningInsight.InsightType.PLATFORM_TREND,
                content=f"Causal Discovery Engine detected that asking AI Tutor questions directly causes a {ate_ai * 100:.1f}% increase in course completion probability.",
                defaults={"confidence": min(0.99, ate_ai + 0.5), "action_taken": True}
            )
            if created:
                logger.info(f"Generated new Causal Insight: {insight.id}")

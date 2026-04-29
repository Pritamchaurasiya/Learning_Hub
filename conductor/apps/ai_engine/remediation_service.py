
import logging
import json
from .ai_client import AIClient
from .models import RemedialPlan

logger = logging.getLogger(__name__)

class RemediationService:
    """
    Service to analyze quiz failures and generate adaptive study paths.
    """
    
    @staticmethod
    def generate_remedial_plan(user, module_slug, quiz_title, wrong_answers_context):
        """
        Analyzes performance and creates a RemedialPlan.
        wrong_answers_context: List of strings (questions missed).
        """
        try:
            # Determine Student Level
            student_level = "Beginner"
            try:
                from apps.gamification.models import UserXP
                xp = UserXP.objects.filter(user=user).first()
                if xp:
                    if xp.level > 15:
                        student_level = "Advanced"
                    elif xp.level > 5:
                        student_level = "Intermediate"
            except Exception as e:
                logger.debug("Could not determine student level from XP: %s", e)

            # 1. Generate Plan using AI
            plan_data = AIClient.generate_remedial_plan(
                topic=f"{quiz_title} ({module_slug})",
                weak_concepts=wrong_answers_context,
                student_level=student_level
            )
            
            if not plan_data:
                return None

            # Compile into Markdown for Flutter rendering
            root_cause = plan_data.get('root_cause', 'Analysis unavailable')
            actions = plan_data.get('action_items', [])
            resources = plan_data.get('resources', [])
            
            md_content = f"### 🔍 Root Cause Analysis\n{root_cause}\n\n"
            
            if actions:
                md_content += "### 💡 Action Items\n"
                for i, action in enumerate(actions, 1):
                    # Handle both dictionary formats and strings if the AI deviates slightly
                    if isinstance(action, dict):
                        title = action.get('title', '')
                        desc = action.get('description', '')
                        md_content += f"{i}. **{title}**: {desc}\n"
                    else:
                        md_content += f"{i}. {action}\n"
                md_content += "\n"
                
            if resources:
                md_content += "### 📚 Suggested Resources\n"
                for res in resources:
                    md_content += f"- {res}\n"

            # 2. Save to DB
            plan = RemedialPlan.objects.create(
                user=user,
                module_slug=module_slug,
                root_cause_analysis=md_content,
                suggested_actions=actions
            )
            
            return plan
            
        except Exception as e:
            logger.error("Failed to generate remedial plan: %s", e)
            return None

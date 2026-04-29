
import logging
import json
import datetime
from typing import Dict, List, Any
from django.utils import timezone
from .ai_client import AIClient
from .models import LearningSchedule
from apps.courses.models import Enrollment

logger = logging.getLogger(__name__)

class StudyPlanAgent:
    """
    Autonomous Agent that designs personalized study schedules.
    Role: 'Academic Advisor' & 'Time Management Expert'
    """

    @classmethod
    def generate_weekly_plan(cls, user, goal: str = None) -> Dict[str, Any]:
        """
        Generates a 7-day study plan based on enrolled courses and user goals.
        """
        # 1. Gather Context
        enrollments = Enrollment.objects.filter(user=user).select_related('course')
        active_courses = [e.course.title for e in enrollments]
        
        if not active_courses:
            return {"error": "No active courses found. Enroll in a course first."}

        # 2. Construct Prompt for AI
        prompt = f"""
        Act as an expert Academic Advisor. generate a structured Weekly Study Plan for a student.
        
        Context:
        - Active Courses: {', '.join(active_courses)}
        - Student Goal: {goal or 'General Progress'}
        - Available Time: ~1 hour per day
        
        Format: JSON only.
        Structure:
        {{
            "goal_summary": "Focus on...",
            "schedule": {{
                "Monday": [{{"task": "Topic...", "duration_minutes": 30, "course": "Course Name"}}],
                "Tuesday": [...],
                ... (for all 7 days)
            }}
        }}
        """
        
        # 3. Invoke LLM
        try:
            response_text = AIClient.generate_content(prompt)
            # Simple cleanup if the model adds markdown code blocks
            clean_json = response_text.replace('```json', '').replace('```', '').strip()
            plan_data = json.loads(clean_json)
            
            # 4. Persistence
            today = timezone.localdate()
            start_of_week = today - datetime.timedelta(days=today.weekday())
            
            schedule, created = LearningSchedule.objects.update_or_create(
                user=user,
                week_start_date=start_of_week,
                defaults={
                    'days_json': plan_data.get('schedule', {}),
                    'goal': plan_data.get('goal_summary', 'Stay Consistent'),
                    'is_active': True
                }
            )
            
            return {
                "schedule_id": schedule.id,
                "week_start": start_of_week,
                "plan": plan_data
            }
            
        except Exception as e:
            logger.error(f"StudyPlanAgent failed: {e}")
            return {"error": "Failed to generate plan. AI unavailable."}

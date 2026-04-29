
import logging
import json
from apps.ai_engine.ai_client import AIClient
from apps.courses.models import Course
from apps.courses.services import CourseService
from apps.users.models import User

logger = logging.getLogger(__name__)


class ToolRegistry:
    """
    Registry for Agent Tools.
    allows dynamic registration and discovery of capabilities.
    """
    _tools = {}

    @classmethod
    def register(cls, name: str, description: str, params: dict):
        def decorator(func):
            cls._tools[name] = {
                'func': func,
                'description': description,
                'params': params
            }
            return func
        return decorator

    @classmethod
    def get_tool(cls, name: str):
        return cls._tools.get(name)

    @classmethod
    def get_schema(cls) -> str:
        """Return tool definitions for LLM."""
        schema = {
            k: {'desc': v['description'], 'params': v['params']}
            for k, v in cls._tools.items()
        }
        return json.dumps(schema, indent=2)


class ActionService:
    """
    Agentic AI Engine v2.
    Executes natural language commands using a dynamic tool registry.
    """

    @staticmethod
    def execute_command(user: User, command_text: str) -> dict:
        """
        Parses and executes a natural language command using AI Router.
        Dispatches to Celery for async processing.
        """
        from apps.ai_engine.tasks import perform_ai_action_task
        
        # Dispatch task
        task = perform_ai_action_task.delay(user.id, command_text)
        
        return {
            "status": "accepted",
            "message": "AI is processing your request...",
            "task_id": task.id,
            "type": "async_task_reference"
        }

    @staticmethod
    def _execute_command_sync(user: User, command_text: str) -> dict:
        """
        Internal: Synchronous execution logic (formerly execute_command).
        Now powered by the advanced ReAct AgenticLoop.
        """
        try:
            from apps.ai_engine.agentic_loop import AgenticLoop
            
            logger.info(f"Initiating AgenticLoop for user {user.username} with goal: {command_text}")
            
            # Initialize the ReAct loop
            agent = AgenticLoop(max_steps=5)
            
            # Run the autonomous reasoning loop
            result = agent.run(
                goal=command_text, 
                context=f"User: {user.username}, Role: Student",
                user=user
            )
            
            return {
                "status": "success" if result["success"] else "error",
                "message": result.get("final_observation", "Task completed."),
                "agent_data": result
            }

        except Exception as e:
            logger.error(f"Agent Execution Failed: {e}")
            return {"status": "error", "message": "System error processing command.", "details": str(e)}


# ==========================================================================
# TOOL DEFINITIONS
# ==========================================================================


@ToolRegistry.register(
    name="SEARCH_COURSE",
    description="Search for a course by title or topic.",
    params={"query": "string"}
)
def tool_search_course(query: str, **kwargs):
    courses = Course.objects.filter(title__icontains=query, is_published=True)[:3]
    return {
        "status": "success",
        "type": "search_results",
        "data": {"courses": [{"title": c.title, "slug": c.slug} for c in courses]}
    }


@ToolRegistry.register(
    name="ENROLL_COURSE",
    description="Enroll a user in a specific course.",
    params={"course_title": "string"}
)
def tool_enroll_course(course_title: str, user: User, **kwargs):
    course = Course.objects.filter(title__icontains=course_title, is_published=True).first()
    if not course:
        return {"status": "error", "message": f"Course '{course_title}' not found."}

    if course.is_free:
        CourseService.enroll_student(user, course)
        return {"status": "success", "message": f"Enrolled in {course.title} successfully!"}
    else:
        return {
            "status": "action_required",
            "message": f"Course {course.title} is paid. Please proceed to payment."
        }


@ToolRegistry.register(
    name="GET_STATS",
    description="Get user learning statistics and risk score.",
    params={}
)
def tool_get_stats(user: User, **kwargs):
    # Lazy import to avoid circular dependency
    from apps.dashboard.retention_service import RetentionService
    try:
        risk_data = RetentionService.calculate_risk_score(user)
        xp = getattr(user, 'xp_profile', None).total_xp if hasattr(user, 'xp_profile') else 0
        return {
            "status": "success",
            "type": "stats",
            "data": {
                "risk_score": risk_data.get('risk_score', 0),
                "xp": xp
            }
        }
    except ImportError:
        return {"status": "error", "message": "Stats service unavailable."}


@ToolRegistry.register(
    name="SHOW_CERTIFICATES",
    description="List all certificates earned by the user.",
    params={}
)
def tool_show_certificates(user: User, **kwargs):
    certs = user.certificates.all()
    if not certs:
        return {"status": "success", "message": "No certificates yet. Keep learning!"}
    return {
        "status": "success",
        "type": "certificates",
        "data": [{"course": c.course.title, "code": c.certificate_code} for c in certs]
    }


# ==========================================================================
# PHASE 13 — EXPANDED TOOLS
# ==========================================================================


@ToolRegistry.register(
    name="GET_RECOMMENDATIONS",
    description="Get AI-powered course recommendations based on user history.",
    params={}
)
def tool_get_recommendations(user: User, **kwargs):
    """Use AI to recommend courses based on user's enrollment history."""
    try:
        enrolled_courses = list(
            user.enrollments.select_related('course')
            .values_list('course__title', flat=True)[:10]
        )
        if not enrolled_courses:
            # Recommend popular courses instead
            popular = Course.objects.filter(is_published=True).order_by('-enrollment_count')[:5]
            return {
                "status": "success",
                "type": "recommendations",
                "data": [{"title": c.title, "slug": c.slug} for c in popular],
                "message": "Here are some popular courses to get you started!"
            }

        prompt = (
            f"User has studied: {', '.join(enrolled_courses)}. "
            f"Suggest 3 related topics they should explore next. "
            f"Return JSON array of strings."
        )
        raw = AIClient.generate_text(prompt)
        import json as json_mod
        suggestions = json_mod.loads(raw.strip().replace("```json", "").replace("```", ""))

        # Find matching courses
        from django.db.models import Q
        q = Q()
        for topic in suggestions[:3]:
            q |= Q(title__icontains=topic)
        matches = Course.objects.filter(q, is_published=True).exclude(
            id__in=user.enrollments.values_list('course_id', flat=True)
        )[:5]

        return {
            "status": "success",
            "type": "recommendations",
            "data": [{"title": c.title, "slug": c.slug} for c in matches],
            "ai_topics": suggestions[:3]
        }
    except Exception as e:
        logger.error(f"GET_RECOMMENDATIONS failed: {e}")
        return {"status": "error", "message": "Could not generate recommendations."}


@ToolRegistry.register(
    name="START_QUIZ",
    description="Start a quiz on a specific topic or course.",
    params={"topic": "string"}
)
def tool_start_quiz(topic: str, user: User, **kwargs):
    """Find a quiz matching the topic and return its details."""
    try:
        from apps.courses.models import Quiz
        quiz = Quiz.objects.filter(
            title__icontains=topic, is_published=True
        ).first()
        if quiz:
            return {
                "status": "success",
                "type": "quiz_launch",
                "data": {
                    "quiz_id": quiz.id,
                    "title": quiz.title,
                    "question_count": quiz.questions.count(),
                    "time_limit": quiz.time_limit_minutes,
                }
            }
        return {"status": "error", "message": f"No quiz found for '{topic}'."}
    except Exception as e:
        logger.error(f"START_QUIZ failed: {e}")
        return {"status": "error", "message": "Quiz service unavailable."}


@ToolRegistry.register(
    name="GET_SCHEDULE",
    description="Show upcoming live sessions and tutor bookings for the user.",
    params={}
)
def tool_get_schedule(user: User, **kwargs):
    """Fetch the user's upcoming live sessions and bookings."""
    try:
        from apps.live_sessions.models import LiveSession
        from apps.tutors.models import Booking
        from django.utils import timezone as tz

        now = tz.now()
        sessions = LiveSession.objects.filter(
            start_time__gte=now
        ).order_by('start_time')[:5]
        bookings = Booking.objects.filter(
            student=user, slot__start_time__gte=now
        ).select_related('tutor', 'slot').order_by('slot__start_time')[:5]

        return {
            "status": "success",
            "type": "schedule",
            "data": {
                "upcoming_sessions": [
                    {"title": s.title, "start": s.start_time.isoformat()}
                    for s in sessions
                ],
                "bookings": [
                    {
                        "tutor": b.tutor.user.get_full_name(),
                        "time": b.slot.start_time.isoformat()
                    }
                    for b in bookings
                ],
            }
        }
    except Exception as e:
        logger.error(f"GET_SCHEDULE failed: {e}")
        return {"status": "error", "message": "Schedule service unavailable."}


@ToolRegistry.register(
    name="ASK_QUESTION",
    description="Post a question to the community discussion forums.",
    params={"title": "string", "body": "string"}
)
def tool_ask_question(title: str, body: str, user: User, **kwargs):
    """Create a new discussion thread for the user."""
    try:
        from apps.discussions.models import DiscussionThread
        thread = DiscussionThread.objects.create(
            author=user,
            title=title,
            body=body,
        )
        return {
            "status": "success",
            "type": "thread_created",
            "data": {
                "thread_id": thread.id,
                "title": thread.title,
            },
            "message": f"Your question '{title}' has been posted!"
        }
    except Exception as e:
        logger.error(f"ASK_QUESTION failed: {e}")
        return {"status": "error", "message": "Could not post your question."}


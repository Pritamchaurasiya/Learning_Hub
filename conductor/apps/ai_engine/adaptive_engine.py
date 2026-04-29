"""
Adaptive Learning Path Engine

This module implements an intelligent, AI-powered learning path generator
that creates personalized curricula based on user skills, goals, and behavior.

Key Features:
1. Initial Assessment - Evaluate user's current skill level
2. Path Generation - Create personalized learning roadmap
3. Dynamic Adjustment - Continuously adapt based on performance
4. Gap Analysis - Identify and fill knowledge gaps
"""

import logging
import random
from datetime import timedelta, date
from typing import Dict, Any, List, Optional, Tuple
from dataclasses import dataclass
from enum import Enum

from django.utils import timezone
from django.db.models import Avg, Count, Q, F
from django.core.cache import cache

logger = logging.getLogger(__name__)


class SkillLevel(Enum):
    """User skill level categories."""
    NOVICE = 1
    BEGINNER = 2
    INTERMEDIATE = 3
    ADVANCED = 4
    EXPERT = 5


@dataclass
class LearningNode:
    """Represents a single node in the learning path."""
    lesson_id: int
    title: str
    estimated_minutes: int
    skill_area: str
    difficulty: int
    is_completed: bool = False
    is_optional: bool = False


@dataclass
class DailyPlan:
    """A single day's learning plan."""
    date: date
    nodes: List[LearningNode]
    total_minutes: int
    focus_area: str


class AdaptiveEngine:
    """
    Core engine for generating and managing adaptive learning paths.
    
    Architecture:
    - Uses a weighted graph approach for curriculum generation
    - Applies spaced repetition for knowledge retention
    - Integrates with AI for personalized recommendations
    """
    
    # Configuration constants
    DEFAULT_DAILY_MINUTES = 30
    MAX_DAILY_MINUTES = 120
    SPACED_REPETITION_INTERVALS = [1, 3, 7, 14, 30]  # Days
    
    def __init__(self, user):
        """Initialize with a specific user."""
        self.user = user
        self._skill_cache = None
        self._preferences = None
    
    # ==========================================================================
    # SKILL ASSESSMENT
    # ==========================================================================
    
    def assess_skill_level(self, category_id: Optional[int] = None) -> Dict[str, Any]:
        """
        Assess user's current skill level based on multiple signals.
        
        Signals used:
        1. Quiz performance (accuracy, speed)
        2. Code submission success rate
        3. Problem difficulty attempted
        4. Time to complete lessons
        
        Returns:
            Dict with overall_level, category_levels, strengths, weaknesses
        """
        from apps.courses.models import Enrollment, Lesson
        from apps.dsa.models import Submission
        from apps.ai_engine.models import ActivityLog
        
        cache_key = f"skill_assessment:{self.user.id}:{category_id}"
        cached = cache.get(cache_key)
        if cached:
            return cached
        
        # Get user's activity data
        activities = ActivityLog.objects.filter(user=self.user)
        
        # Quiz performance
        quiz_activities = activities.filter(action=ActivityLog.ActionType.QUIZ_COMPLETE)
        quiz_avg_score = quiz_activities.filter(
            metadata__has_key='score'
        ).aggregate(avg=Avg('metadata__score'))['avg'] or 0.5
        
        # Code submission success rate
        try:
            submissions = Submission.objects.filter(user=self.user)
            total_submissions = submissions.count()
            successful = submissions.filter(status='accepted').count()
            code_success_rate = successful / total_submissions if total_submissions > 0 else 0.5
        except Exception:
            code_success_rate = 0.5
        
        # Calculate overall level (1-5 scale)
        raw_score = (quiz_avg_score * 0.4 + code_success_rate * 0.6)
        overall_level = max(1, min(5, int(raw_score * 5) + 1))
        
        # Identify strengths and weaknesses
        strengths = []
        weaknesses = []
        
        # Analyze by topic
        topic_performance = self._analyze_topic_performance()
        for topic, score in topic_performance.items():
            if score >= 0.7:
                strengths.append(topic)
            elif score < 0.4:
                weaknesses.append(topic)
        
        result = {
            'overall_level': SkillLevel(overall_level).name,
            'overall_score': round(raw_score, 2),
            'quiz_performance': round(quiz_avg_score, 2),
            'code_success_rate': round(code_success_rate, 2),
            'strengths': strengths[:5],
            'weaknesses': weaknesses[:5],
            'recommended_difficulty': self._get_recommended_difficulty(overall_level),
            'assessed_at': timezone.now().isoformat()
        }
        
        cache.set(cache_key, result, timeout=3600)  # Cache for 1 hour
        return result
    
    def _analyze_topic_performance(self) -> Dict[str, float]:
        """Analyze performance by topic/category."""
        from apps.courses.models import Enrollment
        from apps.ai_engine.models import ActivityLog
        
        topic_scores = {}
        
        # Get completed lessons by category
        enrollments = Enrollment.objects.filter(
            user=self.user
        ).select_related('course__category')
        
        for enrollment in enrollments:
            category = enrollment.course.category
            if category:
                category_name = category.name
                # Use progress as proxy for performance
                score = enrollment.progress_percentage / 100
                if category_name in topic_scores:
                    topic_scores[category_name] = (topic_scores[category_name] + score) / 2
                else:
                    topic_scores[category_name] = score
        
        return topic_scores
    
    def _get_recommended_difficulty(self, level: int) -> str:
        """Map skill level to recommended difficulty."""
        if level <= 2:
            return 'beginner'
        elif level <= 3:
            return 'intermediate'
        else:
            return 'advanced'
    
    # ==========================================================================
    # PATH GENERATION
    # ==========================================================================
    
    def generate_learning_path(
        self,
        goal: str,
        target_weeks: int = 4,
        daily_minutes: int = DEFAULT_DAILY_MINUTES
    ) -> Dict[str, Any]:
        """
        Generate a personalized learning path towards a goal.
        
        Args:
            goal: Learning goal (e.g., "Master Python", "Learn Data Structures")
            target_weeks: Number of weeks to complete the path
            daily_minutes: Target daily learning time
            
        Returns:
            Dict with weekly_plans, milestones, estimated_completion
        """
        from apps.courses.models import Course, Lesson, Module
        from apps.ai_engine.models import LearningSchedule
        
        # Get skill assessment
        assessment = self.assess_skill_level()
        recommended_diff = assessment['recommended_difficulty']
        
        # Find relevant courses
        relevant_courses = Course.objects.filter(
            is_published=True,
            difficulty=recommended_diff
        ).filter(
            Q(title__icontains=goal) | 
            Q(description__icontains=goal) |
            Q(category__name__icontains=goal)
        )[:5]
        
        if not relevant_courses.exists():
            # Fallback to any course at appropriate difficulty
            relevant_courses = Course.objects.filter(
                is_published=True,
                difficulty=recommended_diff
            )[:3]
        
        # Build lesson sequence
        lessons = []
        for course in relevant_courses:
            course_lessons = Lesson.objects.filter(
                module__course=course
            ).order_by('module__order', 'order')
            
            for lesson in course_lessons:
                lessons.append(LearningNode(
                    lesson_id=lesson.id,
                    title=lesson.title,
                    estimated_minutes=lesson.duration_minutes or 15,
                    skill_area=course.category.name if course.category else 'General',
                    difficulty=self._difficulty_to_int(course.difficulty),
                    is_optional=lesson.is_pro_only
                ))
        
        # Distribute across weeks
        weekly_plans = self._distribute_lessons(lessons, target_weeks, daily_minutes)
        
        # Create milestones
        milestones = self._create_milestones(lessons, target_weeks)
        
        # Calculate estimated completion
        total_minutes = sum(node.estimated_minutes for node in lessons)
        total_days = (total_minutes / daily_minutes) if daily_minutes > 0 else target_weeks * 7
        
        # Save schedule
        today = timezone.now().date()
        start_of_week = today - timedelta(days=today.weekday())
        
        schedule, _ = LearningSchedule.objects.update_or_create(
            user=self.user,
            week_start_date=start_of_week,
            defaults={
                'days_json': self._weekly_plans_to_json(weekly_plans),
                'goal': goal,
                'is_active': True
            }
        )
        
        return {
            'schedule_id': str(schedule.id),
            'goal': goal,
            'skill_level': assessment['overall_level'],
            'weekly_plans': self._serialize_weekly_plans(weekly_plans),
            'milestones': milestones,
            'total_lessons': len(lessons),
            'total_hours': round(total_minutes / 60, 1),
            'estimated_completion_days': int(total_days),
            'recommended_daily_minutes': daily_minutes,
            'generated_at': timezone.now().isoformat()
        }
    
    def _difficulty_to_int(self, difficulty: str) -> int:
        """Convert difficulty string to integer."""
        mapping = {'beginner': 1, 'intermediate': 2, 'advanced': 3}
        return mapping.get(difficulty, 2)
    
    def _distribute_lessons(
        self,
        lessons: List[LearningNode],
        weeks: int,
        daily_minutes: int
    ) -> List[List[DailyPlan]]:
        """Distribute lessons across weeks with daily plans."""
        weekly_plans = []
        lesson_index = 0
        today = timezone.now().date()
        
        for week in range(weeks):
            week_start = today + timedelta(weeks=week)
            week_plans = []
            
            for day in range(7):  # Mon-Sun
                if lesson_index >= len(lessons):
                    break
                
                day_date = week_start + timedelta(days=day)
                day_lessons = []
                day_minutes = 0
                
                # Fill day up to daily_minutes target
                while lesson_index < len(lessons) and day_minutes < daily_minutes:
                    lesson = lessons[lesson_index]
                    if day_minutes + lesson.estimated_minutes <= daily_minutes * 1.2:
                        day_lessons.append(lesson)
                        day_minutes += lesson.estimated_minutes
                        lesson_index += 1
                    else:
                        break
                
                if day_lessons:
                    focus = day_lessons[0].skill_area if day_lessons else "General"
                    week_plans.append(DailyPlan(
                        date=day_date,
                        nodes=day_lessons,
                        total_minutes=day_minutes,
                        focus_area=focus
                    ))
            
            if week_plans:
                weekly_plans.append(week_plans)
        
        return weekly_plans
    
    def _create_milestones(
        self,
        lessons: List[LearningNode],
        weeks: int
    ) -> List[Dict[str, Any]]:
        """Create milestone checkpoints."""
        milestones = []
        total = len(lessons)
        
        if total == 0:
            return milestones
        
        # Create milestone at 25%, 50%, 75%, 100%
        percentages = [25, 50, 75, 100]
        for pct in percentages:
            milestone_index = int((pct / 100) * total) - 1
            if 0 <= milestone_index < total:
                milestones.append({
                    'percentage': pct,
                    'lesson_title': lessons[milestone_index].title,
                    'description': f"Complete {pct}% of your learning path",
                    'reward_xp': pct * 10
                })
        
        return milestones
    
    def _weekly_plans_to_json(self, weekly_plans: List[List[DailyPlan]]) -> Dict:
        """Convert weekly plans to JSON-serializable format."""
        result = {}
        days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
        
        for week_idx, week in enumerate(weekly_plans):
            for day_plan in week:
                day_name = days[day_plan.date.weekday()]
                key = f"Week{week_idx + 1}_{day_name}"
                result[key] = [
                    {
                        'lesson_id': node.lesson_id,
                        'title': node.title,
                        'duration': node.estimated_minutes,
                        'skill_area': node.skill_area
                    }
                    for node in day_plan.nodes
                ]
        
        return result
    
    def _serialize_weekly_plans(self, weekly_plans: List[List[DailyPlan]]) -> List[Dict]:
        """Serialize weekly plans for API response."""
        result = []
        
        for week_idx, week in enumerate(weekly_plans):
            week_data = {
                'week_number': week_idx + 1,
                'days': []
            }
            
            for day_plan in week:
                week_data['days'].append({
                    'date': day_plan.date.isoformat(),
                    'focus_area': day_plan.focus_area,
                    'total_minutes': day_plan.total_minutes,
                    'lessons': [
                        {
                            'id': node.lesson_id,
                            'title': node.title,
                            'minutes': node.estimated_minutes,
                            'skill_area': node.skill_area,
                            'completed': node.is_completed
                        }
                        for node in day_plan.nodes
                    ]
                })
            
            result.append(week_data)
        
        return result
    
    # ==========================================================================
    # DYNAMIC ADJUSTMENT
    # ==========================================================================
    
    def adjust_path(self, feedback: Dict[str, Any]) -> Dict[str, Any]:
        """
        Dynamically adjust the learning path based on user feedback/performance.
        
        Args:
            feedback: Dict containing:
                - lesson_id: ID of completed lesson
                - difficulty_rating: 1-5 (1=too easy, 5=too hard)
                - time_taken: Actual minutes spent
                - quiz_score: Optional quiz score
                
        Returns:
            Adjustment recommendations
        """
        lesson_id = feedback.get('lesson_id')
        difficulty_rating = feedback.get('difficulty_rating', 3)
        time_taken = feedback.get('time_taken', 0)
        quiz_score = feedback.get('quiz_score')
        
        adjustments = {
            'recommendations': [],
            'difficulty_change': 0,
            'pace_adjustment': 'maintain'
        }
        
        # Analyze difficulty perception
        if difficulty_rating <= 2:
            adjustments['difficulty_change'] = 1
            adjustments['recommendations'].append(
                "Content seems easy. Suggesting more challenging material."
            )
        elif difficulty_rating >= 4:
            adjustments['difficulty_change'] = -1
            adjustments['recommendations'].append(
                "Content seems difficult. Adding foundational lessons."
            )
        
        # Analyze pace
        if time_taken > 0:
            # Compare to estimated (assume 15 min default)
            expected = 15
            if time_taken < expected * 0.7:
                adjustments['pace_adjustment'] = 'increase'
                adjustments['recommendations'].append(
                    "You're learning quickly! Increasing daily content."
                )
            elif time_taken > expected * 1.5:
                adjustments['pace_adjustment'] = 'decrease'
                adjustments['recommendations'].append(
                    "Take your time. Reducing daily load for better retention."
                )
        
        # Quiz performance
        if quiz_score is not None:
            if quiz_score < 0.6:
                adjustments['recommendations'].append(
                    "Quiz score suggests review needed. Adding practice exercises."
                )
            elif quiz_score >= 0.9:
                adjustments['recommendations'].append(
                    "Excellent quiz performance! You're ready for advanced topics."
                )
        
        # Invalidate cache to apply changes
        cache.delete(f"skill_assessment:{self.user.id}:None")
        
        return adjustments
    
    # ==========================================================================
    # GAP ANALYSIS
    # ==========================================================================
    
    def identify_knowledge_gaps(self) -> List[Dict[str, Any]]:
        """
        Identify knowledge gaps based on performance patterns.
        
        Returns:
            List of gap objects with topic, severity, suggested_content
        """
        from apps.courses.models import Course, Lesson
        from apps.ai_engine.models import ActivityLog
        
        gaps = []
        
        # Get topics with low performance
        topic_performance = self._analyze_topic_performance()
        
        for topic, score in topic_performance.items():
            if score < 0.5:
                severity = 'high' if score < 0.3 else 'medium'
                
                # Find remedial content
                remedial_courses = Course.objects.filter(
                    Q(category__name__icontains=topic) | Q(title__icontains=topic),
                    difficulty='beginner',
                    is_published=True
                )[:3]
                
                gaps.append({
                    'topic': topic,
                    'current_score': round(score, 2),
                    'severity': severity,
                    'suggested_courses': [
                        {'id': str(c.id), 'title': c.title}
                        for c in remedial_courses
                    ],
                    'recommendation': f"Review fundamentals of {topic} to strengthen your foundation."
                })
        
        # Check for incomplete prerequisite chains
        # (Simplified: check for modules started but not finished)
        incomplete_modules = self._get_incomplete_modules()
        for module in incomplete_modules:
            gaps.append({
                'topic': module['title'],
                'current_score': module['completion_rate'],
                'severity': 'medium',
                'suggested_courses': [],
                'recommendation': f"Complete {module['title']} before moving to advanced topics."
            })
        
        return gaps
    
    def _get_incomplete_modules(self) -> List[Dict[str, Any]]:
        """Get modules that are started but not completed."""
        from apps.courses.models import Enrollment
        from apps.ai_engine.models import ActivityLog
        
        incomplete = []
        
        enrollments = Enrollment.objects.filter(
            user=self.user,
            progress_percentage__gt=0,
            progress_percentage__lt=80
        ).select_related('course')[:5]
        
        for enrollment in enrollments:
            incomplete.append({
                'title': enrollment.course.title,
                'completion_rate': enrollment.progress_percentage / 100
            })
        
        return incomplete
    
    # ==========================================================================
    # SPACED REPETITION
    # ==========================================================================
    
    def get_review_items(self) -> List[Dict[str, Any]]:
        """
        Get items due for spaced repetition review.
        
        Uses the Leitner system with intervals: 1, 3, 7, 14, 30 days.
        """
        from apps.ai_engine.models import ActivityLog
        
        now = timezone.now()
        review_items = []
        
        # Get completed lessons with their completion dates
        completed_lessons = ActivityLog.objects.filter(
            user=self.user,
            action=ActivityLog.ActionType.LESSON_COMPLETE
        ).values('object_id', 'created_at', 'metadata')
        
        for activity in completed_lessons:
            lesson_id = activity['object_id']
            completed_at = activity['created_at']
            review_count = activity.get('metadata', {}).get('review_count', 0)
            
            # Calculate next review date based on Leitner intervals
            interval_idx = min(review_count, len(self.SPACED_REPETITION_INTERVALS) - 1)
            interval_days = self.SPACED_REPETITION_INTERVALS[interval_idx]
            next_review = completed_at + timedelta(days=interval_days)
            
            if next_review <= now:
                review_items.append({
                    'lesson_id': lesson_id,
                    'days_overdue': (now - next_review).days,
                    'review_count': review_count,
                    'priority': 'high' if (now - next_review).days > 3 else 'normal'
                })
        
        # Sort by priority and days overdue
        review_items.sort(key=lambda x: (-1 if x['priority'] == 'high' else 0, -x['days_overdue']))
        
        return review_items[:10]  # Return top 10
    
    # ==========================================================================
    # AI INTEGRATION
    # ==========================================================================
    
    def get_ai_recommendations(self) -> Dict[str, Any]:
        """
        Get AI-powered personalized recommendations.
        
        Uses Gemini to analyze user patterns and suggest next steps.
        """
        from apps.ai_engine.ai_client import AIClient
        
        # Gather context
        assessment = self.assess_skill_level()
        gaps = self.identify_knowledge_gaps()
        
        prompt = f"""
Based on the following user learning profile, provide personalized recommendations:

Skill Level: {assessment['overall_level']}
Strengths: {', '.join(assessment['strengths']) or 'None identified'}
Weaknesses: {', '.join(assessment['weaknesses']) or 'None identified'}
Knowledge Gaps: {len(gaps)} areas need improvement

Provide:
1. Top 3 focus areas for this week
2. Motivational message based on their progress
3. One specific actionable tip
4. Estimated time to reach next skill level

Keep response concise and actionable.
"""
        
        try:
            ai_client = AIClient()
            response = ai_client.generate(prompt, max_tokens=500)
            
            # Phase 50: MBRL Prescriptive Analytics Hook
            optimal_next_lesson = None
            try:
                from apps.ai_engine.world_model_service import WorldModelService
                from apps.courses.models import Course
                
                # Retrieve the most recently active course to prescribe the next lesson
                from apps.courses.models import Enrollment
                latest_enrollment = Enrollment.objects.filter(user=self.user).order_by('-last_accessed').first()
                if latest_enrollment:
                    optimal_lesson = WorldModelService.get_optimal_next_lesson(self.user, latest_enrollment.course)
                    if optimal_lesson:
                        optimal_next_lesson = {
                            "id": optimal_lesson.id,
                            "title": optimal_lesson.title,
                            "reasoning": "Selected by Reinforcement Learning to maximize long-term knowledge retention."
                        }
            except Exception as e:
                logger.error(f"MBRL integration failed during recommendations: {e}")
            
            return {
                'ai_insights': response,
                'optimal_next_step': optimal_next_lesson,
                'generated_at': timezone.now().isoformat(),
                'based_on': {
                    'skill_level': assessment['overall_level'],
                    'gaps_count': len(gaps),
                    'prescriptive_ai_used': optimal_next_lesson is not None
                }
            }
        except Exception as e:
            logger.warning(f"AI recommendation failed: {e}")
            return {
                'ai_insights': "Keep learning consistently! Focus on your weakest areas.",
                'error': str(e),
                'fallback': True
            }

    def get_recommended_difficulty(self) -> str:
        """
        Get the recommended content difficulty for this user.
        
        Returns:
            'beginner', 'intermediate', or 'advanced'
        """
        assessment = self.assess_skill_level()
        return assessment.get('recommended_difficulty', 'intermediate')

    def get_concept_mastery(self) -> Dict[str, float]:
        """
        Get concept-level mastery scores for the user.
        
        Returns:
            Dict mapping concept/topic names to mastery scores (0-1)
        """
        topic_performance = self._analyze_topic_performance()
        
        # Normalize to 0-1 scale and add labels
        mastery = {}
        for topic, score in topic_performance.items():
            mastery[topic] = {
                'score': round(score, 2),
                'level': 'mastered' if score >= 0.8 else 'learning' if score >= 0.4 else 'needs_work'
            }
        
        return mastery


# ==========================================================================
# UTILITY FUNCTIONS
# ==========================================================================

def get_user_learning_path(user) -> Dict[str, Any]:
    """Convenience function to get current learning path for a user."""
    engine = AdaptiveEngine(user)
    
    from apps.ai_engine.models import LearningSchedule
    
    today = timezone.now().date()
    start_of_week = today - timedelta(days=today.weekday())
    
    schedule = LearningSchedule.objects.filter(
        user=user,
        week_start_date=start_of_week,
        is_active=True
    ).first()
    
    if schedule:
        return {
            'has_active_schedule': True,
            'schedule_id': str(schedule.id),
            'goal': schedule.goal,
            'week_start': start_of_week.isoformat(),
            'days_json': schedule.days_json
        }
    
    return {
        'has_active_schedule': False,
        'message': 'No active learning schedule. Generate one using the adaptive engine.'
    }


def generate_quick_path(user, goal: str) -> Dict[str, Any]:
    """Quick helper to generate a learning path."""
    engine = AdaptiveEngine(user)
    return engine.generate_learning_path(goal)

import math
import logging
from typing import List, Dict, Optional
from datetime import datetime, timedelta
from django.utils import timezone

logger = logging.getLogger(__name__)


class SmartScheduler:
    """
    Phase 56: Intelligent Study Scheduler.
    
    Uses the student's historical activity patterns to recommend optimal
    study times and session durations. Leverages temporal clustering to
    identify when the student is most productive and engaged.
    """
    
    # Optimal session configs
    MIN_SESSION_MINUTES = 15
    MAX_SESSION_MINUTES = 90
    POMODORO_MINUTES = 25
    BREAK_MINUTES = 5
    
    @classmethod
    def analyze_study_patterns(cls, activity_history: List[dict]) -> Dict:
        """
        Analyzes the student's historical activity to extract temporal patterns.
        
        Args:
            activity_history: List of activity dicts with 'timestamp' and 
                'session_duration_min' keys.
                
        Returns:
            Dict containing peak_hours, preferred_days, avg_session_duration,
            and recommended_schedule.
        """
        if not activity_history:
            return cls._get_default_schedule()
        
        # 1. Cluster by hour of day
        hour_counts = [0] * 24
        hour_durations = [0.0] * 24
        day_counts = [0] * 7
        total_duration = 0.0
        
        for act in activity_history:
            ts = act.get('timestamp', timezone.now())
            if isinstance(ts, str):
                ts = datetime.fromisoformat(ts)
            
            hour = ts.hour
            day = ts.weekday()
            duration = act.get('session_duration_min', 30)
            
            hour_counts[hour] += 1
            hour_durations[hour] += duration
            day_counts[day] += 1
            total_duration += duration
        
        # 2. Find peak hours (top 3 most active hours)
        indexed_hours = [(count, hour) for hour, count in enumerate(hour_counts)]
        indexed_hours.sort(reverse=True)
        peak_hours = [hour for _, hour in indexed_hours[:3] if _ > 0]
        
        # 3. Find preferred days
        day_names = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 
                     'Friday', 'Saturday', 'Sunday']
        indexed_days = [(count, day) for day, count in enumerate(day_counts)]
        indexed_days.sort(reverse=True)
        preferred_days = [day_names[day] for _, day in indexed_days[:3] if _ > 0]
        
        # 4. Average session duration
        num_sessions = len(activity_history)
        avg_duration = total_duration / num_sessions if num_sessions > 0 else 30
        
        # 5. Compute optimal session length using Ebbinghaus forgetting curve math
        # Optimal = clamp(avg * 1.15, MIN, MAX)
        optimal_duration = max(
            cls.MIN_SESSION_MINUTES,
            min(cls.MAX_SESSION_MINUTES, avg_duration * 1.15)
        )
        
        # 6. Generate weekly schedule
        schedule = cls._generate_weekly_schedule(
            peak_hours=peak_hours,
            preferred_days=preferred_days,
            session_duration=optimal_duration
        )
        
        return {
            'peak_hours': peak_hours,
            'preferred_days': preferred_days,
            'avg_session_duration_min': round(avg_duration, 1),
            'optimal_session_duration_min': round(optimal_duration, 1),
            'total_study_hours': round(total_duration / 60.0, 1),
            'num_sessions_analyzed': num_sessions,
            'recommended_schedule': schedule
        }
    
    @classmethod
    def _generate_weekly_schedule(
        cls,
        peak_hours: List[int],
        preferred_days: List[str],
        session_duration: float
    ) -> List[Dict]:
        """
        Generates a personalized weekly study schedule.
        """
        schedule = []
        
        if not peak_hours:
            peak_hours = [9, 14, 19]  # Default morning, afternoon, evening
        if not preferred_days:
            preferred_days = ['Monday', 'Wednesday', 'Friday']
        
        # Calculate Pomodoro blocks
        num_pomodoros = max(1, int(session_duration / (cls.POMODORO_MINUTES + cls.BREAK_MINUTES)))
        
        for day in preferred_days:
            for hour in peak_hours[:2]:  # Max 2 sessions per day
                schedule.append({
                    'day': day,
                    'start_time': f"{hour:02d}:00",
                    'end_time': f"{hour:02d}:{int(session_duration):02d}",
                    'duration_min': round(session_duration),
                    'pomodoro_blocks': num_pomodoros,
                    'focus_technique': 'Pomodoro' if session_duration > 30 else 'Deep Focus'
                })
        
        return schedule
    
    @classmethod
    def _get_default_schedule(cls) -> Dict:
        """Returns a sensible default schedule for new users."""
        return {
            'peak_hours': [9, 14, 19],
            'preferred_days': ['Monday', 'Wednesday', 'Friday', 'Saturday'],
            'avg_session_duration_min': 30.0,
            'optimal_session_duration_min': 30.0,
            'total_study_hours': 0.0,
            'num_sessions_analyzed': 0,
            'recommended_schedule': [
                {
                    'day': 'Monday', 'start_time': '09:00',
                    'end_time': '09:30', 'duration_min': 30,
                    'pomodoro_blocks': 1, 'focus_technique': 'Deep Focus'
                },
                {
                    'day': 'Wednesday', 'start_time': '14:00',
                    'end_time': '14:30', 'duration_min': 30,
                    'pomodoro_blocks': 1, 'focus_technique': 'Deep Focus'
                },
                {
                    'day': 'Friday', 'start_time': '19:00',
                    'end_time': '19:30', 'duration_min': 30,
                    'pomodoro_blocks': 1, 'focus_technique': 'Deep Focus'
                },
                {
                    'day': 'Saturday', 'start_time': '09:00',
                    'end_time': '10:30', 'duration_min': 90,
                    'pomodoro_blocks': 3, 'focus_technique': 'Pomodoro'
                }
            ]
        }
    
    @classmethod
    def get_spaced_repetition_schedule(
        cls,
        num_items: int,
        start_date: Optional[datetime] = None
    ) -> List[Dict]:
        """
        Generates an Ebbinghaus-based spaced repetition review schedule.
        
        Intervals follow the SuperMemo SM-2 algorithm approximation:
        Day 1, Day 3, Day 7, Day 14, Day 30, Day 60.
        """
        if start_date is None:
            start_date = timezone.now()
        
        intervals = [1, 3, 7, 14, 30, 60]  # Days
        
        schedule = []
        for i, interval in enumerate(intervals):
            review_date = start_date + timedelta(days=interval)
            schedule.append({
                'review_number': i + 1,
                'review_date': review_date.strftime('%Y-%m-%d'),
                'days_from_start': interval,
                'items_to_review': num_items,
                'estimated_retention': round(math.exp(-interval / (20 * (i + 1))), 3),
                'priority': 'high' if i < 3 else 'medium'
            })
        
        return schedule

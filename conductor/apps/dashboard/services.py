from django.db.models import Sum, Count, Avg
from apps.courses.models import Course, Enrollment

class InstructorService:
    """Service for aggregating instructor performance metrics."""

    @staticmethod
    def get_stats(instructor):
        """Get high-level statistics for an instructor (Cached 5m)."""
        from django.core.cache import cache
        
        cache_key = f"instructor_stats_{instructor.id}"
        cached_data = cache.get(cache_key)
        if cached_data:
            return cached_data

        from django.db.models import Sum, Count, Avg, F
        from django.db import models
        
        # 1. Total Courses
        courses = Course.objects.filter(instructor=instructor)
        total_courses = courses.count()

        # 2. Total Students (Distinct Users enrolled in instructor's courses)
        total_students = Enrollment.objects.filter(
            course__instructor=instructor
        ).values('user').distinct().count()

        # 3. Total Revenue (Estimated from Course Price * Enrollments)
        # We need to handle free courses and null prices.
        # Efficient: Sum(price * enrollment_count)
        revenue_data = courses.aggregate(
            total_revenue=Sum(F('price') * F('enrollment_count'), output_field=models.DecimalField())
        )
        total_revenue = revenue_data['total_revenue'] or 0
        
        # 4. Average Rating (of all courses)
        avg_rating_data = courses.aggregate(avg=Avg('avg_rating'))
        avg_rating = avg_rating_data['avg'] or 0.0

        data = {
            "total_courses": total_courses,
            "total_students": total_students,
            "total_revenue": total_revenue,
            "avg_rating": round(avg_rating, 2)
        }
        
        # Cache for 5 minutes
        cache.set(cache_key, data, 60 * 5)
        return data

    @staticmethod
    def get_course_performance(instructor):
        """Get breakdown of active courses."""
        courses = Course.objects.filter(instructor=instructor).annotate(
            student_count=Count('enrollments')
        ).order_by('-created_at')
        
        data = []
        for course in courses:
            # course.student_count is now available without extra query
            # Revenue estimation (student_count * price)
            revenue = course.student_count * (course.price or 0)
            
            data.append({
                "id": course.id,
                "title": course.title,
                "thumbnail": course.thumbnail.url if course.thumbnail else None,
                "students": course.student_count,
                "rating": course.avg_rating,
                "revenue": revenue
            })
        return data

    @staticmethod
    def get_revenue_chart(instructor):
        """
        Get real revenue data points aggregated by month.
        Efficiently queries the Payment model.
        """
        from datetime import datetime, timedelta
        from django.db.models.functions import TruncMonth
        from django.utils import timezone
        from apps.payments.models import Payment
        
        # 1. Date Range (Last 6 months)
        six_months_ago = timezone.now() - timedelta(days=180)
        
        # 2. Aggregate
        # Filter: User is instructor? No, Payment is linked to Course -> Course linked to Instructor
        # Payment -> Course -> Instructor
        
        metrics = Payment.objects.filter(
            course__instructor=instructor,
            status=Payment.Status.COMPLETED,
            created_at__gte=six_months_ago
        ).annotate(
            month=TruncMonth('created_at')
        ).values('month').annotate(
            total=Sum('amount')
        ).order_by('month')
        
        # 3. Format for Chart (FL Chart expects X, Y)
        # We map months to 1-12 index or similar
        chart_data = []
        for entry in metrics:
            month_idx = entry['month'].month
            total = float(entry['total'] or 0)
            chart_data.append({"x": month_idx, "y": total})
            
        return chart_data
        
    @staticmethod
    def get_drop_off_analysis(instructor, course_id=None):
        """
        Analyze where students stop watching videos.
        Returns heatmap data: {timestamp: count}
        """
        from apps.dashboard.models import VideoInteraction
        
        # Filter interactions for instructor's courses
        filters = {'lesson__module__course__instructor': instructor}
        if course_id:
            filters['lesson__module__course_id'] = course_id
            
        # Group by timestamp (rounded to nearest 10s)
        # SQLite doesn't support convenient math functions in annotation easily without func
        # So we fetch and process in Python for now (ok for MVP volume)
        interactions = VideoInteraction.objects.filter(**filters).values('video_timestamp', 'event_type')
        
        heatmap = {}
        bucket_size = 10 # seconds
        
        for i in interactions:
            if i['event_type'] in ['pause', 'seek']: # potential drop off
                ts = int(i['video_timestamp'] // bucket_size) * bucket_size
                heatmap[ts] = heatmap.get(ts, 0) + 1
                
        # Format for chart
        return [{"time": k, "drop_offs": v} for k, v in sorted(heatmap.items())]

    @staticmethod
    def get_learning_velocity(user):
        """
        Calculate XP Velocity and Burnout Risk.
        Returns {velocity: int, risk: str}
        """
        from django.utils import timezone
        
        # 1. Current Velocity (Weekly XP)
        current_velocity = 0
        if hasattr(user, 'xp_profile'):
            current_velocity = user.xp_profile.weekly_xp
            
        # 2. Average Velocity
        # Estimate: Total XP / Weeks Active
        days_active = (timezone.now() - user.created_at).days or 1
        weeks_active = max(1, days_active / 7)
        avg_velocity = (user.xp_profile.total_xp if hasattr(user, 'xp_profile') else 0) / weeks_active
        
        # 3. Burnout Detection
        risk = "Low"
        if avg_velocity > 100 and current_velocity < (avg_velocity * 0.5):
            risk = "High (Velocity Dropped > 50%)"
        elif avg_velocity > 100 and current_velocity < (avg_velocity * 0.8):
            risk = "Medium (Velocity Slowing)"
            
        return {
            "current_velocity_xp": current_velocity,
            "avg_weekly_velocity": round(avg_velocity, 2),
            "burnout_risk": risk
        }

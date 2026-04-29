# Adaptive Learning Engine 2.0
"""Intelligent personalized learning paths with real-time adaptation and ML insights"""

import asyncio
import logging
import json
import time
from typing import Dict, Any, List, Optional, Tuple
from dataclasses import dataclass, field
from enum import Enum
from datetime import datetime, timedelta
from django.utils import timezone
from django.apps import apps
from django.db.models import Q, Count, Avg, Prefetch, F
from django.core.cache import cache
from prometheus_client import Counter, Histogram, Gauge
import redis.asyncio as redis

try:
    import numpy as np
    from sklearn.cluster import KMeans
    from sklearn.preprocessing import StandardScaler
    import joblib
except ImportError:
    np = None
    KMeans = None
    StandardScaler = None
    joblib = None

logger = logging.getLogger(__name__)

# Adaptive Learning Metrics
try:
    ADAPTIVE_LEARNING_REQUESTS = Counter('adaptive_learning_requests_total', 'Adaptive learning requests', ['feature'])
    ADAPTIVE_LEARNING_LATENCY = Histogram('adaptive_learning_latency_seconds', 'Adaptive learning latency', ['feature'])
    LEARNING_PATH_GENERATED = Counter('learning_paths_generated_total', 'Learning paths generated')
    PERSONALIZATION_APPLIED = Counter('personalization_applied_total', 'Personalization applied', ['type'])
    ADAPTATION_EVENTS = Counter('adaptation_events_total', 'Adaptation events', ['reason'])
except ValueError:
    from prometheus_client import REGISTRY
    ADAPTIVE_LEARNING_REQUESTS = REGISTRY._names_to_collectors.get('adaptive_learning_requests_total')
    ADAPTIVE_LEARNING_LATENCY = REGISTRY._names_to_collectors.get('adaptive_learning_latency_seconds')
    LEARNING_PATH_GENERATED = REGISTRY._names_to_collectors.get('learning_paths_generated_total')
    PERSONALIZATION_APPLIED = REGISTRY._names_to_collectors.get('personalization_applied_total')
    ADAPTATION_EVENTS = REGISTRY._names_to_collectors.get('adaptation_events_total')

class LearningStyle(Enum):
    VISUAL = "visual"
    AUDITORY = "auditory"
    KINESTHETIC = "kinesthetic"
    READING = "reading"
    MIXED = "mixed"

class DifficultyLevel(Enum):
    BEGINNER = 1
    ELEMENTARY = 2
    INTERMEDIATE = 3
    ADVANCED = 4
    EXPERT = 5

class AdaptationReason(Enum):
    PERFORMANCE_DECLINE = "performance_decline"
    RAPID_PROGRESS = "rapid_progress"
    CHANGE_INTERESTS = "change_interests"
    TIME_CONSTRAINTS = "time_constraints"
    FEEDBACK_RECEIVED = "feedback_received"
    NEW_GOALS = "new_goals"

@dataclass
class LearningNode:
    """Represents a single node in the adaptive learning path."""
    id: str
    title: str
    content_type: str  # lesson, quiz, project, video, etc.
    difficulty: DifficultyLevel
    estimated_minutes: int
    prerequisites: List[str] = field(default_factory=list)
    learning_objectives: List[str] = field(default_factory=list)
    tags: List[str] = field(default_factory=list)
    is_completed: bool = False
    completion_score: Optional[float] = None
    time_spent: int = 0
    attempts: int = 0
    adaptation_score: float = 1.0

@dataclass
class AdaptivePath:
    """Represents an adaptive learning path."""
    user_id: int
    course_id: int
    nodes: List[LearningNode]
    current_node_index: int = 0
    total_estimated_minutes: int = 0
    difficulty_progression: List[DifficultyLevel] = field(default_factory=list)
    adaptation_history: List[Dict[str, Any]] = field(default_factory=list)
    created_at: datetime = field(default_factory=timezone.now)
    last_adapted: Optional[datetime] = None
    effectiveness_score: float = 0.0

@dataclass
class UserProfile:
    """Comprehensive user learning profile."""
    user_id: int
    learning_style: LearningStyle
    preferred_difficulty: DifficultyLevel
    time_availability: int  # minutes per day
    goals: List[str]
    interests: List[str]
    strengths: List[str]
    weaknesses: List[str]
    engagement_patterns: Dict[str, Any]
    performance_history: List[Dict[str, Any]]
    adaptation_preferences: Dict[str, Any]
    last_updated: datetime = field(default_factory=timezone.now)

class AdaptiveLearningEngine:
    """
    Advanced adaptive learning engine with real-time personalization.
    Uses machine learning for intelligent path generation and adaptation.
    """
    
    def __init__(self):
        self.redis_client: Optional[redis.Redis] = None
        self.scaler = StandardScaler() if StandardScaler else None
        self.kmeans_model = KMeans(n_clusters=5, random_state=42) if KMeans else None
        self._initialize_connections()
        self._load_ml_models()
    
    async def _initialize_connections(self):
        """Initialize Redis and database connections."""
        try:
            self.redis_client = redis.from_url(
                "redis://redis-service:6379/5",
                encoding="utf-8",
                decode_responses=True
            )
            await self.redis_client.ping()
            logger.info("Adaptive Learning Engine connected to Redis")
        except Exception as e:
            logger.error(f"Failed to connect to Redis: {e}")
    
    def _load_ml_models(self):
        """Load pre-trained ML models."""
        try:
            if not joblib:
                logger.warning("joblib not available, skipping model load")
                return
                
            # Load clustering model for user segmentation
            import os
            if os.path.exists('models/user_clustering_model.pkl'):
                self.kmeans_model = joblib.load('models/user_clustering_model.pkl')
            if os.path.exists('models/user_scaler.pkl'):
                self.scaler = joblib.load('models/user_scaler.pkl')
            logger.info("ML models loaded successfully")
        except Exception as e:
            logger.warning(f"Could not load ML models: {e}")
            # Use default models if libraries available
            if KMeans:
                self.kmeans_model = KMeans(n_clusters=5, random_state=42)
            if StandardScaler:
                self.scaler = StandardScaler()
    
    async def generate_adaptive_path(self, user_id: int, course_id: int, 
                                   goals: List[str] = None, 
                                   time_constraint: int = None) -> AdaptivePath:
        """
        Generate personalized adaptive learning path.
        """
        start_time = time.time()
        
        try:
            # Get user profile
            user_profile = await self._get_user_profile(user_id)
            
            # Get course content
            course_nodes = await self._get_course_content(course_id)
            
            # Generate initial path
            initial_path = await self._generate_initial_path(user_profile, course_nodes, goals, time_constraint)
            
            # Apply ML-based optimizations
            optimized_path = await self._optimize_path_with_ml(initial_path, user_profile)
            
            # Cache the path
            cache_key = f"adaptive_path:{user_id}:{course_id}"
            cache.set(cache_key, optimized_path, timeout=3600)  # 1 hour
            
            # Update metrics
            LEARNING_PATH_GENERATED.inc()
            ADAPTIVE_LEARNING_LATENCY.labels(feature='path_generation').observe(time.time() - start_time)
            
            return optimized_path
            
        except Exception as e:
            logger.error(f"Adaptive path generation error: {e}")
            raise
    
    async def adapt_learning_path(self, user_id: int, course_id: int, 
                                reason: AdaptationReason, 
                                performance_data: Dict[str, Any] = None) -> AdaptivePath:
        """
        Adapt learning path based on user performance and feedback.
        """
        start_time = time.time()
        
        try:
            # Get current path
            current_path = await self._get_current_path(user_id, course_id)
            if not current_path:
                # Generate new path if none exists
                return await self.generate_adaptive_path(user_id, course_id)
            
            # Analyze performance data
            analysis = await self._analyze_performance(current_path, performance_data)
            
            # Determine adaptation strategy
            adaptation_strategy = await self._determine_adaptation_strategy(reason, analysis)
            
            # Apply adaptations
            adapted_path = await self._apply_adaptations(current_path, adaptation_strategy)
            
            # Record adaptation
            await self._record_adaptation(user_id, course_id, reason, adaptation_strategy)
            
            # Update metrics
            ADAPTATION_EVENTS.labels(reason=reason.value).inc()
            ADAPTIVE_LEARNING_LATENCY.labels(feature='path_adaptation').observe(time.time() - start_time)
            
            return adapted_path
            
        except Exception as e:
            logger.error(f"Path adaptation error: {e}")
            raise
    
    async def _get_user_profile(self, user_id: int) -> UserProfile:
        """Get comprehensive user learning profile."""
        try:
            # Try cache first
            cache_key = f"user_profile:{user_id}"
            cached_profile = cache.get(cache_key)
            if cached_profile:
                return UserProfile(**cached_profile)
            
            # Get user data from database
            User = apps.get_model('users', 'User')
            Enrollment = apps.get_model('courses', 'Enrollment')
            ActivityLog = apps.get_model('ai_engine', 'ActivityLog')
            
            user = await User.objects.aget(id=user_id)
            
            # Get enrollment history
            enrollments = await Enrollment.objects.filter(user=user).prefetch_related('course').acount()
            
            # Get activity patterns
            activities = await ActivityLog.objects.filter(user=user).aaggregate(
                total_activities=Count('id'),
                avg_session_time=Avg('metadata__session_duration'),
                preferred_time=Avg('timestamp__hour')
            )
            
            # Analyze learning patterns
            learning_style = await self._detect_learning_style(user_id)
            preferred_difficulty = await self._assess_preferred_difficulty(user_id)
            time_availability = await self._estimate_time_availability(user_id)
            
            # Get goals and interests
            goals = await self._extract_user_goals(user_id)
            interests = await self._extract_user_interests(user_id)
            
            # Identify strengths and weaknesses
            strengths, weaknesses = await self._identify_strengths_weaknesses(user_id)
            
            # Create profile
            profile = UserProfile(
                user_id=user_id,
                learning_style=learning_style,
                preferred_difficulty=preferred_difficulty,
                time_availability=time_availability,
                goals=goals,
                interests=interests,
                strengths=strengths,
                weaknesses=weaknesses,
                engagement_patterns=activities,
                performance_history=await self._get_performance_history(user_id),
                adaptation_preferences=await self._get_adaptation_preferences(user_id)
            )
            
            # Cache profile
            cache.set(cache_key, profile.__dict__, timeout=1800)  # 30 minutes
            
            return profile
            
        except Exception as e:
            logger.error(f"User profile creation error: {e}")
            # Return default profile
            return UserProfile(
                user_id=user_id,
                learning_style=LearningStyle.MIXED,
                preferred_difficulty=DifficultyLevel.INTERMEDIATE,
                time_availability=60,  # 1 hour default
                goals=[],
                interests=[],
                strengths=[],
                weaknesses=[],
                engagement_patterns={},
                performance_history=[],
                adaptation_preferences={}
            )
    
    async def _detect_learning_style(self, user_id: int) -> LearningStyle:
        """Detect user's preferred learning style using ML."""
        try:
            from apps.ai_engine.models import ActivityLog
            
            # Get activity patterns
            video_activities = await ActivityLog.objects.filter(
                user_id=user_id, action='video_watched'
            ).acount()
            
            reading_activities = await ActivityLog.objects.filter(
                user_id=user_id, action='lesson_completed'
            ).acount()
            
            quiz_activities = await ActivityLog.objects.filter(
                user_id=user_id, action='quiz_attempted'
            ).acount()
            
            interactive_activities = await ActivityLog.objects.filter(
                user_id=user_id, action__in=['project_completed', 'lab_completed']
            ).acount()
            
            total = video_activities + reading_activities + quiz_activities + interactive_activities
            
            if total == 0:
                return LearningStyle.MIXED
            
            # Calculate percentages
            video_ratio = video_activities / total
            reading_ratio = reading_activities / total
            quiz_ratio = quiz_activities / total
            interactive_ratio = interactive_activities / total
            
            # Determine dominant style
            if video_ratio > 0.4:
                return LearningStyle.VISUAL
            elif reading_ratio > 0.4:
                return LearningStyle.READING
            elif interactive_ratio > 0.3:
                return LearningStyle.KINESTHETIC
            elif quiz_ratio > 0.3:
                return LearningStyle.AUDITORY
            else:
                return LearningStyle.MIXED
                
        except Exception as e:
            logger.error(f"Learning style detection error: {e}")
            return LearningStyle.MIXED
    
    async def _assess_preferred_difficulty(self, user_id: int) -> DifficultyLevel:
        """Assess user's preferred difficulty level."""
        try:
            from apps.ai_engine.models import UserProfile
            from apps.courses.models import Enrollment
            
            # Get user's completion rates by difficulty
            enrollments = await Enrollment.objects.filter(user_id=user_id).prefetch_related('course').acount()
            
            difficulty_scores = {level: [] for level in DifficultyLevel}
            
            for enrollment in enrollments:
                if hasattr(enrollment.course, 'difficulty'):
                    difficulty = DifficultyLevel(enrollment.course.difficulty)
                    completion_rate = enrollment.progress_percentage / 100
                    difficulty_scores[difficulty].append(completion_rate)
            
            # Calculate average success rate by difficulty
            avg_scores = {}
            for difficulty, scores in difficulty_scores.items():
                if scores:
                    avg_scores[difficulty] = sum(scores) / len(scores)
                else:
                    avg_scores[difficulty] = 0.5  # Default
            
            # Find difficulty with highest success rate
            best_difficulty = max(avg_scores, key=avg_scores.get)
            
            return best_difficulty
            
        except Exception as e:
            logger.error(f"Difficulty assessment error: {e}")
            return DifficultyLevel.INTERMEDIATE
    
    async def _estimate_time_availability(self, user_id: int) -> int:
        """Estimate user's daily time availability for learning."""
        try:
            from apps.ai_engine.models import ActivityLog
            
            # Get recent activity patterns
            recent_activities = await ActivityLog.objects.filter(
                user_id=user_id,
                timestamp__gte=timezone.now() - timedelta(days=30)
            ).aaggregate(
                avg_daily_time=Avg('metadata__session_duration'),
                total_sessions=Count('id')
            )
            
            avg_daily_time = recent_activities['avg_daily_time'] or 0
            
            # Convert to minutes and add buffer
            return int(avg_daily_time * 60) if avg_daily_time else 60
            
        except Exception as e:
            logger.error(f"Time availability estimation error: {e}")
            return 60  # Default 1 hour
    
    async def _extract_user_goals(self, user_id: int) -> List[str]:
        """Extract user's learning goals."""
        try:
            # Get from user profile or infer from behavior
            goals = []
            
            # Analyze course enrollments for goal patterns
            from apps.courses.models import Enrollment
            
            enrollments = await Enrollment.objects.filter(user_id=user_id).prefetch_related('course').acount()
            
            category_counts = {}
            for enrollment in enrollments:
                if hasattr(enrollment.course, 'category'):
                    category = enrollment.course.category.name
                    category_counts[category] = category_counts.get(category, 0) + 1
            
            # Convert category patterns to goals
            for category, count in category_counts.items():
                if count >= 2:  # Multiple courses in same category indicates goal
                    goals.append(f"master_{category.lower().replace(' ', '_')}")
            
            return goals or ["general_learning"]
            
        except Exception as e:
            logger.error(f"Goal extraction error: {e}")
            return ["general_learning"]
    
    async def _extract_user_interests(self, user_id: int) -> List[str]:
        """Extract user's interests from behavior."""
        try:
            interests = []
            
            # Get from course categories
            from apps.courses.models import Enrollment
            
            enrollments = await Enrollment.objects.filter(user_id=user_id).prefetch_related('course').acount()
            
            categories = set()
            for enrollment in enrollments:
                if hasattr(enrollment.course, 'category'):
                    categories.add(enrollment.course.category.name.lower())
            
            return list(categories)
            
        except Exception as e:
            logger.error(f"Interest extraction error: {e}")
            return []
    
    async def _identify_strengths_weaknesses(self, user_id: int) -> Tuple[List[str], List[str]]:
        """Identify user's strengths and weaknesses."""
        try:
            strengths = []
            weaknesses = []
            
            # Analyze quiz performance by topic
            from apps.ai_engine.models import ActivityLog
            
            quiz_activities = await ActivityLog.objects.filter(
                user_id=user_id, action='quiz_completed'
            ).values('metadata')
            
            topic_scores = {}
            for activity in quiz_activities:
                metadata = activity.get('metadata', {})
                topic = metadata.get('topic', 'general')
                score = metadata.get('score', 0)
                
                if topic not in topic_scores:
                    topic_scores[topic] = []
                topic_scores[topic].append(score)
            
            # Calculate averages and classify
            for topic, scores in topic_scores.items():
                if scores:
                    avg_score = sum(scores) / len(scores)
                    if avg_score >= 80:
                        strengths.append(topic)
                    elif avg_score < 60:
                        weaknesses.append(topic)
            
            return strengths, weaknesses
            
        except Exception as e:
            logger.error(f"Strengths/weaknesses identification error: {e}")
            return [], []
    
    async def _get_performance_history(self, user_id: int) -> List[Dict[str, Any]]:
        """Get user's performance history."""
        try:
            from apps.ai_engine.models import ActivityLog
            
            # Get recent performance data
            activities = await ActivityLog.objects.filter(
                user_id=user_id,
                action__in=['quiz_completed', 'lesson_completed', 'project_completed']
            ).order_by('-timestamp')[:50].values('action', 'timestamp', 'metadata')
            
            performance_history = []
            for activity in activities:
                performance_history.append({
                    'action': activity['action'],
                    'timestamp': activity['timestamp'].isoformat(),
                    'score': activity['metadata'].get('score', 0),
                    'duration': activity['metadata'].get('duration', 0),
                    'difficulty': activity['metadata'].get('difficulty', 3)
                })
            
            return performance_history
            
        except Exception as e:
            logger.error(f"Performance history retrieval error: {e}")
            return []
    
    async def _get_adaptation_preferences(self, user_id: int) -> Dict[str, Any]:
        """Get user's adaptation preferences."""
        try:
            # Default preferences
            preferences = {
                'adaptation_frequency': 'moderate',  # low, moderate, high
                'difficulty_adjustment': 'gradual',  # gradual, aggressive
                'content_variation': 'medium',  # low, medium, high
                'feedback_sensitivity': 'medium'  # low, medium, high
            }
            
            # Could be customized per user in future
            return preferences
            
        except Exception as e:
            logger.error(f"Adaptation preferences retrieval error: {e}")
            return {}
    
    async def _get_course_content(self, course_id: int) -> List[LearningNode]:
        """Get course content as learning nodes."""
        try:
            Course = apps.get_model('courses', 'Course')
            course = await Course.objects.aget(id=course_id)
            
            nodes = []
            
            # Get lessons
            if hasattr(course, 'lessons'):
                lessons = await course.lessons.all().aannotate(
                    avg_completion=Avg('enrollments__progress_percentage')
                ).acount()
                
                for lesson in lessons:
                    node = LearningNode(
                        id=f"lesson_{lesson.id}",
                        title=lesson.title,
                        content_type="lesson",
                        difficulty=DifficultyLevel.INTERMEDIATE,  # Could be per lesson
                        estimated_minutes=getattr(lesson, 'estimated_duration', 30),
                        prerequisites=getattr(lesson, 'prerequisites', []),
                        learning_objectives=getattr(lesson, 'objectives', []),
                        tags=getattr(lesson, 'tags', [])
                    )
                    nodes.append(node)
            
            # Get quizzes
            if hasattr(course, 'quizzes'):
                quizzes = await course.quizzes.all().acount()
                
                for quiz in quizzes:
                    node = LearningNode(
                        id=f"quiz_{quiz.id}",
                        title=quiz.title,
                        content_type="quiz",
                        difficulty=DifficultyLevel(quiz.difficulty_level if hasattr(quiz, 'difficulty_level') else 3),
                        estimated_minutes=getattr(quiz, 'time_limit', 20),
                        prerequisites=[],
                        learning_objectives=getattr(quiz, 'objectives', []),
                        tags=getattr(quiz, 'tags', [])
                    )
                    nodes.append(node)
            
            return nodes
            
        except Exception as e:
            logger.error(f"Course content retrieval error: {e}")
            return []
    
    async def _generate_initial_path(self, user_profile: UserProfile, 
                                   course_nodes: List[LearningNode],
                                   goals: List[str] = None,
                                   time_constraint: int = None) -> AdaptivePath:
        """Generate initial adaptive learning path."""
        try:
            # Filter nodes based on user profile
            filtered_nodes = await self._filter_nodes_by_profile(user_profile, course_nodes, goals)
            
            # Sort nodes by difficulty and prerequisites
            sorted_nodes = await self._sort_nodes_by_difficulty(filtered_nodes)
            
            # Create path
            path = AdaptivePath(
                user_id=user_profile.user_id,
                course_id=course_nodes[0].id.split('_')[1] if course_nodes else 0,
                nodes=sorted_nodes,
                total_estimated_minutes=sum(node.estimated_minutes for node in sorted_nodes),
                difficulty_progression=[node.difficulty for node in sorted_nodes]
            )
            
            return path
            
        except Exception as e:
            logger.error(f"Initial path generation error: {e}")
            raise
    
    async def _filter_nodes_by_profile(self, user_profile: UserProfile, 
                                    nodes: List[LearningNode],
                                    goals: List[str] = None) -> List[LearningNode]:
        """Filter learning nodes based on user profile."""
        filtered_nodes = []
        
        for node in nodes:
            # Filter by learning style
            if user_profile.learning_style == LearningStyle.VISUAL and node.content_type not in ['video', 'interactive']:
                continue
            elif user_profile.learning_style == LearningStyle.READING and node.content_type not in ['lesson', 'article']:
                continue
            elif user_profile.learning_style == LearningStyle.KINESTHETIC and node.content_type not in ['project', 'lab', 'interactive']:
                continue
            
            # Filter by difficulty preference
            difficulty_diff = abs(node.difficulty.value - user_profile.preferred_difficulty.value)
            if difficulty_diff > 1:  # Allow some flexibility
                continue
            
            # Filter by interests and goals
            if goals:
                if not any(goal in node.tags or goal in node.title.lower() for goal in goals):
                    continue
            
            # Filter by strengths and weaknesses
            if user_profile.weaknesses:
                # Avoid topics user struggles with initially
                if any(weakness in node.tags or weakness in node.title.lower() for weakness in user_profile.weaknesses):
                    node.difficulty = DifficultyLevel(max(1, node.difficulty.value - 1))  # Make easier
            
            filtered_nodes.append(node)
        
        return filtered_nodes
    
    async def _sort_nodes_by_difficulty(self, nodes: List[LearningNode]) -> List[LearningNode]:
        """Sort learning nodes by difficulty and prerequisites."""
        # Sort by difficulty first
        nodes.sort(key=lambda x: x.difficulty.value)
        
        # Then arrange by prerequisites (topological sort)
        sorted_nodes = []
        remaining_nodes = nodes.copy()
        
        while remaining_nodes:
            # Find nodes with no unmet prerequisites
            ready_nodes = [
                node for node in remaining_nodes
                if all(prereq in [n.id for n in sorted_nodes] for prereq in node.prerequisites)
            ]
            
            if not ready_nodes:
                # Circular dependency or missing prerequisites
                # Add remaining nodes as is
                sorted_nodes.extend(remaining_nodes)
                break
            
            # Add ready nodes (prefer easier ones first)
            ready_nodes.sort(key=lambda x: x.difficulty.value)
            sorted_nodes.extend(ready_nodes)
            
            # Remove processed nodes
            for node in ready_nodes:
                remaining_nodes.remove(node)
        
        return sorted_nodes
    
    async def _optimize_path_with_ml(self, path: AdaptivePath, user_profile: UserProfile) -> AdaptivePath:
        """Optimize learning path using ML insights."""
        try:
            # Apply clustering-based optimization
            if len(path.nodes) > 5:
                # Group similar nodes
                optimized_nodes = await self._cluster_similar_nodes(path.nodes)
                path.nodes = optimized_nodes
            
            # Apply time optimization
            if user_profile.time_availability:
                path.nodes = await self._optimize_for_time(path.nodes, user_profile.time_availability)
            
            # Apply learning style optimization
            path.nodes = await self._optimize_for_learning_style(path.nodes, user_profile.learning_style)
            
            # Recalculate estimated time
            path.total_estimated_minutes = sum(node.estimated_minutes for node in path.nodes)
            
            return path
            
        except Exception as e:
            logger.error(f"ML path optimization error: {e}")
            return path
    
    async def _cluster_similar_nodes(self, nodes: List[LearningNode]) -> List[LearningNode]:
        """Cluster similar learning nodes for better flow."""
        try:
            # Create feature vectors for clustering
            features = []
            for node in nodes:
                feature_vector = [
                    node.difficulty.value,
                    node.estimated_minutes,
                    len(node.prerequisites),
                    len(node.learning_objectives),
                    len(node.tags)
                ]
                features.append(feature_vector)
            
            if len(features) < 2:
                return nodes
            
            # Apply clustering
            features_array = np.array(features)
            features_scaled = self.scaler.fit_transform(features_array)
            
            cluster_labels = self.kmeans_model.fit_predict(features_scaled)
            
            # Group nodes by cluster
            clustered_nodes = {}
            for i, node in enumerate(nodes):
                cluster_id = cluster_labels[i]
                if cluster_id not in clustered_nodes:
                    clustered_nodes[cluster_id] = []
                clustered_nodes[cluster_id].append(node)
            
            # Sort clusters by average difficulty
            sorted_clusters = sorted(
                clustered_nodes.items(),
                key=lambda x: sum(node.difficulty.value for node in x[1]) / len(x[1])
            )
            
            # Flatten nodes maintaining cluster order
            optimized_nodes = []
            for cluster_id, cluster_nodes in sorted_clusters:
                # Sort nodes within cluster by prerequisites
                cluster_nodes_sorted = await self._sort_nodes_by_difficulty(cluster_nodes)
                optimized_nodes.extend(cluster_nodes_sorted)
            
            return optimized_nodes
            
        except Exception as e:
            logger.error(f"Node clustering error: {e}")
            return nodes
    
    async def _optimize_for_time(self, nodes: List[LearningNode], time_availability: int) -> List[LearningNode]:
        """Optimize path for user's time availability."""
        try:
            # Calculate sessions needed
            total_time = sum(node.estimated_minutes for node in nodes)
            sessions_needed = max(1, total_time // time_availability)
            
            # Group nodes into sessions
            optimized_nodes = []
            current_session_time = 0
            current_session_nodes = []
            
            for node in nodes:
                if current_session_time + node.estimated_minutes <= time_availability:
                    current_session_nodes.append(node)
                    current_session_time += node.estimated_minutes
                else:
                    # Add session break marker
                    if current_session_nodes:
                        optimized_nodes.extend(current_session_nodes)
                        # Add break node
                        break_node = LearningNode(
                            id=f"break_{len(optimized_nodes)}",
                            title="Session Break - Review Previous Material",
                            content_type="break",
                            difficulty=DifficultyLevel.INTERMEDIATE,
                            estimated_minutes=5,
                            prerequisites=[],
                            learning_objectives=["review_and_consolidate"],
                            tags=["review", "break"]
                        )
                        optimized_nodes.append(break_node)
                    
                    current_session_nodes = [node]
                    current_session_time = node.estimated_minutes
            
            # Add remaining nodes
            if current_session_nodes:
                optimized_nodes.extend(current_session_nodes)
            
            return optimized_nodes
            
        except Exception as e:
            logger.error(f"Time optimization error: {e}")
            return nodes
    
    async def _optimize_for_learning_style(self, nodes: List[LearningNode], learning_style: LearningStyle) -> List[LearningNode]:
        """Optimize path for user's learning style."""
        try:
            # Reorder nodes based on learning style preferences
            if learning_style == LearningStyle.VISUAL:
                # Prioritize video and interactive content
                nodes.sort(key=lambda x: 0 if x.content_type in ['video', 'interactive'] else 1)
            elif learning_style == LearningStyle.READING:
                # Prioritize lessons and articles
                nodes.sort(key=lambda x: 0 if x.content_type in ['lesson', 'article'] else 1)
            elif learning_style == LearningStyle.KINESTHETIC:
                # Prioritize projects and labs
                nodes.sort(key=lambda x: 0 if x.content_type in ['project', 'lab'] else 1)
            elif learning_style == LearningStyle.AUDITORY:
                # Prioritize audio content and discussions
                nodes.sort(key=lambda x: 0 if x.content_type in ['audio', 'discussion'] else 1)
            
            return nodes
            
        except Exception as e:
            logger.error(f"Learning style optimization error: {e}")
            return nodes
    
    async def _get_current_path(self, user_id: int, course_id: int) -> Optional[AdaptivePath]:
        """Get current adaptive learning path."""
        try:
            cache_key = f"adaptive_path:{user_id}:{course_id}"
            cached_path = cache.get(cache_key)
            
            if cached_path:
                return AdaptivePath(**cached_path)
            
            return None
            
        except Exception as e:
            logger.error(f"Current path retrieval error: {e}")
            return None
    
    async def _analyze_performance(self, path: AdaptivePath, performance_data: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze user performance data."""
        try:
            analysis = {
                'overall_performance': 0.0,
                'trend': 'stable',
                'strength_areas': [],
                'weakness_areas': [],
                'engagement_level': 'medium',
                'completion_rate': 0.0
            }
            
            if not performance_data:
                return analysis
            
            # Calculate overall performance
            scores = performance_data.get('recent_scores', [])
            if scores:
                analysis['overall_performance'] = sum(scores) / len(scores)
                
                # Determine trend
                if len(scores) >= 3:
                    recent_avg = sum(scores[-3:]) / 3
                    earlier_avg = sum(scores[:-3]) / len(scores[:-3])
                    if recent_avg > earlier_avg + 5:
                        analysis['trend'] = 'improving'
                    elif recent_avg < earlier_avg - 5:
                        analysis['trend'] = 'declining'
            
            # Calculate completion rate
            completed_nodes = sum(1 for node in path.nodes if node.is_completed)
            analysis['completion_rate'] = completed_nodes / len(path.nodes) if path.nodes else 0
            
            # Analyze engagement
            session_times = performance_data.get('session_times', [])
            if session_times:
                avg_session_time = sum(session_times) / len(session_times)
                if avg_session_time > 45:  # minutes
                    analysis['engagement_level'] = 'high'
                elif avg_session_time < 15:
                    analysis['engagement_level'] = 'low'
                else:
                    analysis['engagement_level'] = 'medium'
            
            return analysis
            
        except Exception as e:
            logger.error(f"Performance analysis error: {e}")
            return {}
    
    async def _determine_adaptation_strategy(self, reason: AdaptationReason, analysis: Dict[str, Any]) -> Dict[str, Any]:
        """Determine adaptation strategy based on reason and analysis."""
        try:
            strategy = {
                'type': 'minimal',
                'difficulty_adjustment': 0,
                'content_changes': [],
                'time_adjustments': []
            }
            
            if reason == AdaptationReason.PERFORMANCE_DECLINE:
                if analysis['overall_performance'] < 60:
                    strategy['type'] = 'significant'
                    strategy['difficulty_adjustment'] = -1  # Make easier
                    strategy['content_changes'].append('add_practice')
                elif analysis['overall_performance'] < 75:
                    strategy['type'] = 'moderate'
                    strategy['content_changes'].append('add_review')
            
            elif reason == AdaptationReason.RAPID_PROGRESS:
                if analysis['overall_performance'] > 90:
                    strategy['type'] = 'accelerate'
                    strategy['difficulty_adjustment'] = 1  # Make harder
                    strategy['content_changes'].append('skip_review')
            
            elif reason == AdaptationReason.TIME_CONSTRAINTS:
                strategy['type'] = 'time_optimize'
                strategy['time_adjustments'].append('shorten_sessions')
                strategy['content_changes'].append('focus_core')
            
            elif reason == AdaptationReason.CHANGE_INTERESTS:
                strategy['type'] = 'realign'
                strategy['content_changes'].append('update_topics')
            
            return strategy
            
        except Exception as e:
            logger.error(f"Adaptation strategy determination error: {e}")
            return {'type': 'minimal'}
    
    async def _apply_adaptations(self, path: AdaptivePath, strategy: Dict[str, Any]) -> AdaptivePath:
        """Apply adaptations to the learning path."""
        try:
            # Record adaptation
            path.adaptation_history.append({
                'timestamp': timezone.now().isoformat(),
                'strategy': strategy,
                'previous_effectiveness': path.effectiveness_score
            })
            
            # Apply difficulty adjustments
            if strategy.get('difficulty_adjustment', 0) != 0:
                adjustment = strategy['difficulty_adjustment']
                for node in path.nodes:
                    new_difficulty = node.difficulty.value + adjustment
                    new_difficulty = max(1, min(5, new_difficulty))
                    node.difficulty = DifficultyLevel(new_difficulty)
                    node.adaptation_score *= 0.9  # Reduce adaptation score
            
            # Apply content changes
            content_changes = strategy.get('content_changes', [])
            for change in content_changes:
                if change == 'add_practice':
                    path = await self._add_practice_nodes(path)
                elif change == 'add_review':
                    path = await self._add_review_nodes(path)
                elif change == 'skip_review':
                    path = await self._skip_review_nodes(path)
                elif change == 'focus_core':
                    path = await self._focus_on_core_content(path)
                elif change == 'update_topics':
                    path = await self._update_content_topics(path)
            
            # Apply time adjustments
            time_adjustments = strategy.get('time_adjustments', [])
            for adjustment in time_adjustments:
                if adjustment == 'shorten_sessions':
                    path = await self._shorten_sessions(path)
            
            # Update path metadata
            path.last_adapted = timezone.now()
            path.difficulty_progression = [node.difficulty for node in path.nodes]
            
            return path
            
        except Exception as e:
            logger.error(f"Adaptation application error: {e}")
            return path
    
    async def _add_practice_nodes(self, path: AdaptivePath) -> AdaptivePath:
        """Add practice nodes to the path."""
        try:
            # Find areas where user is struggling
            practice_nodes = []
            
            for i, node in enumerate(path.nodes):
                if not node.is_completed and node.completion_score and node.completion_score < 70:
                    # Add practice node before this node
                    practice_node = LearningNode(
                        id=f"practice_{node.id}",
                        title=f"Practice: {node.title}",
                        content_type="practice",
                        difficulty=DifficultyLevel(max(1, node.difficulty.value - 1)),
                        estimated_minutes=min(node.estimated_minutes, 15),
                        prerequisites=[],
                        learning_objectives=[f"practice_{obj}" for obj in node.learning_objectives],
                        tags=node.tags + ["practice"]
                    )
                    practice_nodes.append((i, practice_node))
            
            # Insert practice nodes
            for index, practice_node in reversed(practice_nodes):
                path.nodes.insert(index, practice_node)
            
            return path
            
        except Exception as e:
            logger.error(f"Practice nodes addition error: {e}")
            return path
    
    async def _add_review_nodes(self, path: AdaptivePath) -> AdaptivePath:
        """Add review nodes to the path."""
        try:
            # Add review nodes after every few completed nodes
            review_nodes = []
            
            completed_count = 0
            for i, node in enumerate(path.nodes):
                if node.is_completed:
                    completed_count += 1
                    
                    # Add review after every 3 completed nodes
                    if completed_count % 3 == 0:
                        review_node = LearningNode(
                            id=f"review_{i}",
                            title="Review and Consolidation",
                            content_type="review",
                            difficulty=DifficultyLevel.INTERMEDIATE,
                            estimated_minutes=10,
                            prerequisites=[],
                            learning_objectives=["review_previous_material"],
                            tags=["review", "consolidation"]
                        )
                        review_nodes.append((i + 1, review_node))
            
            # Insert review nodes
            for index, review_node in reversed(review_nodes):
                if index < len(path.nodes):
                    path.nodes.insert(index, review_node)
            
            return path
            
        except Exception as e:
            logger.error(f"Review nodes addition error: {e}")
            return path
    
    async def _skip_review_nodes(self, path: AdaptivePath) -> AdaptivePath:
        """Skip review nodes for fast learners."""
        try:
            # Remove review nodes
            path.nodes = [node for node in path.nodes if node.content_type != 'review']
            return path
            
        except Exception as e:
            logger.error(f"Review nodes skipping error: {e}")
            return path
    
    async def _focus_on_core_content(self, path: AdaptivePath) -> AdaptivePath:
        """Focus on core content by removing optional elements."""
        try:
            # Remove optional and supplementary content
            core_nodes = []
            
            for node in path.nodes:
                # Keep essential content types
                if node.content_type in ['lesson', 'quiz', 'project']:
                    core_nodes.append(node)
                # Keep short practice sessions
                elif node.content_type == 'practice' and node.estimated_minutes <= 15:
                    core_nodes.append(node)
            
            path.nodes = core_nodes
            return path
            
        except Exception as e:
            logger.error(f"Core content focus error: {e}")
            return path
    
    async def _update_content_topics(self, path: AdaptivePath) -> AdaptivePath:
        """Update content topics based on new interests."""
        try:
            # This would require access to user's new interests
            # For now, return path unchanged
            return path
            
        except Exception as e:
            logger.error(f"Content topics update error: {e}")
            return path
    
    async def _shorten_sessions(self, path: AdaptivePath) -> AdaptivePath:
        """Shorten session times for time constraints."""
        try:
            # Reduce estimated times for longer sessions
            for node in path.nodes:
                if node.estimated_minutes > 30:
                    node.estimated_minutes = int(node.estimated_minutes * 0.7)  # Reduce by 30%
                elif node.estimated_minutes > 15:
                    node.estimated_minutes = int(node.estimated_minutes * 0.8)  # Reduce by 20%
            
            return path
            
        except Exception as e:
            logger.error(f"Session shortening error: {e}")
            return path
    
    async def _record_adaptation(self, user_id: int, course_id: int, reason: AdaptationReason, strategy: Dict[str, Any]):
        """Record adaptation for analysis."""
        try:
            # Store in Redis for real-time monitoring
            if self.redis_client:
                adaptation_key = f"adaptation:{user_id}:{course_id}"
                adaptation_data = {
                    'timestamp': timezone.now().isoformat(),
                    'reason': reason.value,
                    'strategy': strategy,
                    'user_id': user_id,
                    'course_id': course_id
                }
                
                await self.redis_client.lpush(adaptation_key, json.dumps(adaptation_data))
                await self.redis_client.expire(adaptation_key, 86400)  # 24 hours
            
            # Could also store in database for long-term analysis
            
        except Exception as e:
            logger.error(f"Adaptation recording error: {e}")
    
    async def get_next_learning_node(self, user_id: int, course_id: int) -> Optional[LearningNode]:
        """Get the next learning node for the user."""
        try:
            # Get current path
            path = await self._get_current_path(user_id, course_id)
            if not path:
                return None
            
            # Find next uncompleted node
            for i, node in enumerate(path.nodes):
                if not node.is_completed:
                    return node
            
            return None  # All nodes completed
            
        except Exception as e:
            logger.error(f"Next node retrieval error: {e}")
            return None
    
    async def update_node_progress(self, user_id: int, course_id: int, node_id: str, 
                                 completion_data: Dict[str, Any]) -> bool:
        """Update progress for a learning node."""
        try:
            # Get current path
            path = await self._get_current_path(user_id, course_id)
            if not path:
                return False
            
            # Find and update the node
            for node in path.nodes:
                if node.id == node_id:
                    node.is_completed = completion_data.get('completed', False)
                    node.completion_score = completion_data.get('score', 0)
                    node.time_spent = completion_data.get('time_spent', 0)
                    node.attempts += 1
                    
                    # Update cache
                    cache_key = f"adaptive_path:{user_id}:{course_id}"
                    cache.set(cache_key, path.__dict__, timeout=3600)
                    
                    return True
            
            return False
            
        except Exception as e:
            logger.error(f"Node progress update error: {e}")
            return False
    
    async def get_learning_analytics(self, user_id: int, course_id: int) -> Dict[str, Any]:
        """Get comprehensive learning analytics."""
        try:
            # Get current path
            path = await self._get_current_path(user_id, course_id)
            if not path:
                return {}
            
            # Calculate analytics
            total_nodes = len(path.nodes)
            completed_nodes = sum(1 for node in path.nodes if node.is_completed)
            total_time_spent = sum(node.time_spent for node in path.nodes)
            total_attempts = sum(node.attempts for node in path.nodes)
            avg_completion_score = sum(node.completion_score or 0 for node in path.nodes if node.completion_score) / max(1, sum(1 for node in path.nodes if node.completion_score))
            
            analytics = {
                'progress_percentage': (completed_nodes / total_nodes * 100) if total_nodes > 0 else 0,
                'completed_nodes': completed_nodes,
                'total_nodes': total_nodes,
                'total_time_spent_minutes': total_time_spent,
                'total_attempts': total_attempts,
                'average_completion_score': avg_completion_score,
                'adaptations_count': len(path.adaptation_history),
                'effectiveness_score': path.effectiveness_score,
                'current_difficulty': path.nodes[path.current_node_index].difficulty.value if path.current_node_index < len(path.nodes) else None,
                'estimated_completion_time': sum(node.estimated_minutes for node in path.nodes[path.current_node_index:]),
                'learning_velocity': self._calculate_learning_velocity(path)
            }
            
            return analytics
            
        except Exception as e:
            logger.error(f"Learning analytics error: {e}")
            return {}
    
    def _calculate_learning_velocity(self, path: AdaptivePath) -> str:
        """Calculate learning velocity based on progress and time."""
        try:
            if not path.nodes:
                return "unknown"
            
            completed_nodes = [node for node in path.nodes if node.is_completed]
            if not completed_nodes:
                return "starting"
            
            # Calculate average time per node
            total_time = sum(node.time_spent for node in completed_nodes)
            avg_time_per_node = total_time / len(completed_nodes)
            
            # Determine velocity
            if avg_time_per_node < 20:  # Less than 20 minutes per node
                return "fast"
            elif avg_time_per_node < 45:  # Less than 45 minutes per node
                return "normal"
            else:
                return "slow"
                
        except Exception as e:
            logger.error(f"Learning velocity calculation error: {e}")
            return "unknown"

# Global adaptive learning engine instance
adaptive_learning_engine = AdaptiveLearningEngine()

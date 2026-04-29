"""
Curriculum Learning Module (Phase 33).
Learning from easy to hard examples for improved training.
"""
import logging
import random
import math
from typing import List, Dict, Any, Optional, Tuple, Callable
from dataclasses import dataclass, field
from enum import Enum

logger = logging.getLogger(__name__)


class DifficultyMeasure(Enum):
    """Different ways to measure sample difficulty."""
    LOSS_BASED = "loss"  # Higher loss = harder
    CONFIDENCE_BASED = "confidence"  # Lower confidence = harder
    CURRICULUM_SCORE = "curriculum"  # Predefined difficulty
    SELF_PACED = "self_paced"  # Self-paced learning


@dataclass
class CurriculumSample:
    """A sample with difficulty metadata."""
    id: str
    features: List[float]
    label: Any
    difficulty: float = 0.0  # 0 = easy, 1 = hard
    loss_history: List[float] = field(default_factory=list)
    selected_count: int = 0


class DifficultyEstimator:
    """Estimate sample difficulty."""
    
    def __init__(self, model: 'SimpleModel'):
        self.model = model
    
    def loss_based(self, samples: List[CurriculumSample]) -> None:
        """Estimate difficulty based on current loss."""
        for sample in samples:
            pred = self.model.predict(sample.features)
            loss = self._compute_loss(pred, sample.label)
            sample.difficulty = min(1.0, loss)
            sample.loss_history.append(loss)
    
    def confidence_based(self, samples: List[CurriculumSample]) -> None:
        """Estimate difficulty based on prediction confidence."""
        for sample in samples:
            probs = self.model.predict_proba(sample.features)
            confidence = max(probs)
            sample.difficulty = 1.0 - confidence
    
    def _compute_loss(self, pred: int, label: Any) -> float:
        """Compute loss for a prediction."""
        return 0.0 if pred == label else 1.0


class SimpleModel:
    """Simple model for curriculum learning demos."""
    
    def __init__(self, n_features: int, n_classes: int = 2):
        self.n_features = n_features
        self.n_classes = n_classes
        self.weights = [[random.gauss(0, 0.1) for _ in range(n_features)]
                        for _ in range(n_classes)]
    
    def predict_proba(self, features: List[float]) -> List[float]:
        logits = [sum(w * f for w, f in zip(self.weights[c], features))
                  for c in range(self.n_classes)]
        max_l = max(logits)
        exp_l = [math.exp(l - max_l) for l in logits]
        total = sum(exp_l)
        return [e / total for e in exp_l]
    
    def predict(self, features: List[float]) -> int:
        probs = self.predict_proba(features)
        return probs.index(max(probs))
    
    def train_step(self, sample: CurriculumSample, lr: float = 0.01) -> float:
        """Single training step, returns loss."""
        probs = self.predict_proba(sample.features)
        target = [1.0 if i == sample.label else 0.0 for i in range(self.n_classes)]
        
        loss = -sum(t * math.log(p + 1e-10) for t, p in zip(target, probs))
        
        for c in range(self.n_classes):
            error = target[c] - probs[c]
            for f in range(self.n_features):
                self.weights[c][f] += lr * error * sample.features[f]
        
        return loss


class CurriculumScheduler:
    """Schedules which samples to train on."""
    
    def __init__(self, strategy: str = "linear"):
        self.strategy = strategy
        self.current_epoch = 0
        self.max_epochs = 100
    
    def get_difficulty_threshold(self, epoch: int) -> float:
        """Get current difficulty threshold."""
        progress = min(1.0, epoch / self.max_epochs)
        
        if self.strategy == "linear":
            return progress
        elif self.strategy == "exponential":
            return 1.0 - math.exp(-3 * progress)
        elif self.strategy == "step":
            return min(1.0, (epoch // 10) * 0.2)
        else:
            return 1.0  # No curriculum
    
    def select_samples(self, samples: List[CurriculumSample], 
                       epoch: int, batch_size: int = 32) -> List[CurriculumSample]:
        """Select samples based on curriculum."""
        threshold = self.get_difficulty_threshold(epoch)
        
        # Filter by difficulty
        eligible = [s for s in samples if s.difficulty <= threshold]
        
        # If not enough, add some harder samples
        if len(eligible) < batch_size:
            remaining = [s for s in samples if s not in eligible]
            eligible.extend(sorted(remaining, key=lambda s: s.difficulty)[:batch_size - len(eligible)])
        
        # Sample batch
        if len(eligible) > batch_size:
            return random.sample(eligible, batch_size)
        return eligible


class SelfPacedLearner:
    """Self-paced learning with automatic pacing."""
    
    def __init__(self, model: SimpleModel, lambda_init: float = 0.1, growth_rate: float = 1.3):
        self.model = model
        self.lambda_val = lambda_init
        self.growth_rate = growth_rate
    
    def compute_weights(self, samples: List[CurriculumSample]) -> List[float]:
        """Compute sample weights based on self-paced criterion."""
        weights = []
        
        for sample in samples:
            probs = self.model.predict_proba(sample.features)
            target = [1.0 if i == sample.label else 0.0 for i in range(self.model.n_classes)]
            loss = -sum(t * math.log(p + 1e-10) for t, p in zip(target, probs))
            
            # Self-paced weight: 1 if loss < lambda, 0 otherwise
            weight = 1.0 if loss < self.lambda_val else 0.0
            weights.append(weight)
        
        return weights
    
    def train_epoch(self, samples: List[CurriculumSample]) -> float:
        """Train one epoch with self-pacing."""
        weights = self.compute_weights(samples)
        total_loss = 0.0
        n_trained = 0
        
        for sample, weight in zip(samples, weights):
            if weight > 0:
                loss = self.model.train_step(sample)
                total_loss += loss
                n_trained += 1
        
        # Increase lambda (allow harder samples)
        self.lambda_val *= self.growth_rate
        
        return total_loss / max(1, n_trained)


class AntiCurriculumLearner:
    """Anti-curriculum: hard samples first."""
    
    def __init__(self, model: SimpleModel):
        self.model = model
        self.estimator = DifficultyEstimator(model)
    
    def select_hard_samples(self, samples: List[CurriculumSample], 
                            k: int) -> List[CurriculumSample]:
        """Select hardest samples."""
        self.estimator.loss_based(samples)
        sorted_samples = sorted(samples, key=lambda s: s.difficulty, reverse=True)
        return sorted_samples[:k]


class CurriculumLearner:
    """Complete curriculum learning system."""
    
    def __init__(self, n_features: int = 4, n_classes: int = 2, 
                 strategy: str = "linear"):
        self.model = SimpleModel(n_features, n_classes)
        self.scheduler = CurriculumScheduler(strategy)
        self.estimator = DifficultyEstimator(self.model)
        self.strategy = strategy
        
        self.loss_history: List[float] = []
        self.accuracy_history: List[float] = []
    
    def initialize_difficulty(self, samples: List[CurriculumSample], 
                              method: str = "random"):
        """Initialize sample difficulties."""
        if method == "random":
            for s in samples:
                s.difficulty = random.random()
        elif method == "feature_norm":
            norms = [sum(f**2 for f in s.features)**0.5 for s in samples]
            max_norm = max(norms) if norms else 1
            for s, n in zip(samples, norms):
                s.difficulty = n / max_norm
    
    def train(self, samples: List[CurriculumSample], 
              n_epochs: int = 50, batch_size: int = 16) -> Dict[str, Any]:
        """Train with curriculum."""
        self.initialize_difficulty(samples, "feature_norm")
        self.scheduler.max_epochs = n_epochs
        
        for epoch in range(n_epochs):
            # Update difficulties
            self.estimator.loss_based(samples)
            
            # Select batch
            batch = self.scheduler.select_samples(samples, epoch, batch_size)
            
            # Train on batch
            epoch_loss = 0.0
            for sample in batch:
                loss = self.model.train_step(sample)
                epoch_loss += loss
                sample.selected_count += 1
            
            epoch_loss /= max(1, len(batch))
            self.loss_history.append(epoch_loss)
            
            # Compute accuracy
            correct = sum(1 for s in samples if self.model.predict(s.features) == s.label)
            acc = correct / len(samples)
            self.accuracy_history.append(acc)
        
        return {
            "final_loss": self.loss_history[-1] if self.loss_history else 0,
            "final_accuracy": self.accuracy_history[-1] if self.accuracy_history else 0,
            "epochs_trained": n_epochs
        }


class TransferCurriculum:
    """Curriculum transfer between tasks."""
    
    def __init__(self):
        self.difficulty_maps: Dict[str, Dict[str, float]] = {}
    
    def learn_curriculum(self, task_id: str, samples: List[CurriculumSample]):
        """Learn difficulty ordering from a task."""
        self.difficulty_maps[task_id] = {
            s.id: s.difficulty for s in samples
        }
    
    def transfer_curriculum(self, source_task: str, target_samples: List[CurriculumSample]):
        """Transfer difficulty estimates to new task."""
        if source_task not in self.difficulty_maps:
            return
        
        source_map = self.difficulty_maps[source_task]
        
        for sample in target_samples:
            if sample.id in source_map:
                sample.difficulty = source_map[sample.id]


# =============================================================================
# PHASE 8: USER CURRICULUM MANAGER FOR PRODUCTION
# =============================================================================

class UserCurriculumManager:
    """
    Manages personalized curriculum for individual users.
    Integrates with Django models to provide self-paced learning recommendations.
    """
    
    def __init__(self, user):
        """
        Initialize with a User instance.
        
        Args:
            user: Django User object
        """
        self.user = user
        self.difficulty_threshold = 0.5  # Start at medium difficulty
        self._load_user_progress()
    
    def _load_user_progress(self):
        """Load user's learning progress to calibrate curriculum."""
        try:
            from apps.progress.models import UserProgress, LessonProgress
            from .adaptive_engine import AdaptiveEngine
            
            engine = AdaptiveEngine(self.user)
            rec_diff = engine.get_recommended_difficulty()
            
            # Map difficulty to threshold
            diff_map = {'beginner': 0.3, 'intermediate': 0.5, 'advanced': 0.8}
            self.difficulty_threshold = diff_map.get(rec_diff, 0.5)
            
        except Exception as e:
            logger.debug(f"Curriculum loading fallback: {e}")
            self.difficulty_threshold = 0.5
    
    def get_next_lesson(self, course_id: int = None) -> Dict[str, Any]:
        """
        Get the next recommended lesson based on curriculum scheduling.
        
        Args:
            course_id: Optional specific course to get next lesson from
        
        Returns:
            Dict with lesson info and difficulty
        """
        try:
            from apps.courses.models import Course, Lesson
            from apps.progress.models import LessonProgress
            
            # Get enrolled courses
            if course_id:
                courses = Course.objects.filter(id=course_id)
            else:
                from apps.enrollments.models import Enrollment
                enrollment_ids = Enrollment.objects.filter(
                    user=self.user, 
                    is_active=True
                ).values_list('course_id', flat=True)
                courses = Course.objects.filter(id__in=enrollment_ids)
            
            # Find incomplete lessons
            candidates = []
            for course in courses:
                for module in course.modules.all().order_by('order'):
                    for lesson in module.lessons.all().order_by('order'):
                        # Check if completed
                        completed = LessonProgress.objects.filter(
                            user=self.user,
                            lesson=lesson,
                            is_completed=True
                        ).exists()
                        
                        if not completed:
                            # Estimate difficulty based on position
                            position_factor = (module.order * 10 + lesson.order) / 100
                            estimated_difficulty = min(1.0, position_factor)
                            
                            candidates.append({
                                'lesson_id': lesson.id,
                                'lesson_title': lesson.title,
                                'module_title': module.title,
                                'course_title': course.title,
                                'course_id': course.id,
                                'difficulty': estimated_difficulty,
                                'lesson_type': lesson.lesson_type
                            })
            
            if not candidates:
                return {
                    'status': 'all_complete',
                    'message': 'All lessons completed!'
                }
            
            # Filter by difficulty threshold
            eligible = [c for c in candidates if c['difficulty'] <= self.difficulty_threshold]
            
            # If none eligible, take easiest incomplete
            if not eligible:
                eligible = sorted(candidates, key=lambda x: x['difficulty'])[:1]
            
            # Return the first eligible (easiest within threshold)
            eligible.sort(key=lambda x: x['difficulty'])
            next_lesson = eligible[0]
            
            return {
                'status': 'success',
                'next_lesson': next_lesson,
                'difficulty_threshold': self.difficulty_threshold,
                'alternatives': eligible[1:4] if len(eligible) > 1 else []  # Up to 3 alternatives
            }
            
        except Exception as e:
            logger.error(f"Curriculum next lesson error: {e}")
            return {
                'status': 'error',
                'message': str(e)
            }
    
    def update_difficulty(self, lesson_id: int, performance: float):
        """
        Update difficulty threshold based on lesson performance.
        
        Args:
            lesson_id: The completed lesson ID
            performance: 0-1 score (quiz score, completion quality, etc.)
        """
        # Self-paced adjustment
        if performance >= 0.8:
            # Good performance → increase threshold (allow harder content)
            self.difficulty_threshold = min(1.0, self.difficulty_threshold + 0.05)
        elif performance < 0.5:
            # Poor performance → decrease threshold (show easier content)
            self.difficulty_threshold = max(0.2, self.difficulty_threshold - 0.1)
        
        # Persist to user profile if possible
        try:
            from .models import LearningInsight
            insight, _ = LearningInsight.objects.get_or_create(user=self.user)
            insight.current_skill_level = int(self.difficulty_threshold * 10)
            insight.save()
        except Exception:
            pass
    
    def get_curriculum_stats(self) -> Dict[str, Any]:
        """Get statistics about user's curriculum progress."""
        try:
            from apps.progress.models import LessonProgress
            from apps.enrollments.models import Enrollment
            
            total_enrolled = Enrollment.objects.filter(user=self.user, is_active=True).count()
            completed_lessons = LessonProgress.objects.filter(
                user=self.user,
                is_completed=True
            ).count()
            
            return {
                'difficulty_level': self.difficulty_threshold,
                'difficulty_label': self._difficulty_label(),
                'courses_enrolled': total_enrolled,
                'lessons_completed': completed_lessons
            }
        except Exception as e:
            return {
                'difficulty_level': self.difficulty_threshold,
                'difficulty_label': self._difficulty_label(),
                'error': str(e)
            }
    
    def _difficulty_label(self) -> str:
        """Convert threshold to human-readable label."""
        if self.difficulty_threshold < 0.35:
            return 'Beginner'
        elif self.difficulty_threshold < 0.65:
            return 'Intermediate'
        else:
            return 'Advanced'


def run_curriculum_experiment() -> Dict[str, Any]:
    """Run curriculum learning experiment."""
    print("=== Curriculum Learning Experiment ===")
    
    # Generate data with varying difficulty
    def generate_curriculum_data(n: int = 200) -> List[CurriculumSample]:
        samples = []
        for i in range(n):
            # Easy: clear separation, Hard: near boundary
            difficulty = random.random()
            noise = difficulty * 0.5
            
            if random.random() > 0.5:
                x1 = 1 + random.gauss(0, noise)
                x2 = 1 + random.gauss(0, noise)
                label = 1
            else:
                x1 = -1 + random.gauss(0, noise)
                x2 = -1 + random.gauss(0, noise)
                label = 0
            
            x3 = random.gauss(0, 1)
            x4 = random.gauss(0, 1)
            
            samples.append(CurriculumSample(
                f"s_{i}", [x1, x2, x3, x4], label, difficulty
            ))
        return samples
    
    # Compare strategies
    results = {}
    strategies = ["linear", "exponential", "none"]
    
    for strategy in strategies:
        data = generate_curriculum_data(200)
        learner = CurriculumLearner(n_features=4, n_classes=2, strategy=strategy)
        result = learner.train(data, n_epochs=30, batch_size=16)
        results[strategy] = result['final_accuracy']
        print(f"\n{strategy.capitalize()} Curriculum: Accuracy = {result['final_accuracy']:.3f}")
    
    # Self-paced learning
    print("\n2. Self-Paced Learning:")
    data = generate_curriculum_data(200)
    model = SimpleModel(4, 2)
    spl = SelfPacedLearner(model, lambda_init=0.5, growth_rate=1.2)
    
    for epoch in range(20):
        loss = spl.train_epoch(data)
    
    correct = sum(1 for s in data if model.predict(s.features) == s.label)
    spl_accuracy = correct / len(data)
    print(f"   Self-Paced Accuracy: {spl_accuracy:.3f}")
    
    return {
        "linear_accuracy": results.get("linear", 0),
        "exponential_accuracy": results.get("exponential", 0),
        "no_curriculum_accuracy": results.get("none", 0),
        "self_paced_accuracy": spl_accuracy
    }

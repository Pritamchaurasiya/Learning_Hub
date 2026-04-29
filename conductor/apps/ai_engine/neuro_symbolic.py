import math
import logging
from typing import List, Dict, Set, Tuple, Optional

logger = logging.getLogger(__name__)


class SymbolicLogicCore:
    """
    Phase 64: Symbolic Logic Rule Evaluator.
    
    Handles strict, hard-coded propositional logic that Machine Learning
    sometimes struggles to strictly obey (e.g., prerequisite chaining).
    "A student MUST NOT take Calculus without Algebra."
    """
    
    def __init__(self):
        # A mock directed acyclic graph (DAG) mapping course IDs to list of prerequisite course IDs
        self.prerequisites_dag = {
            'calculus_101': ['algebra_101', 'trigonometry_101'],
            'physics_101': ['calculus_101'],
            'machine_learning': ['calculus_101', 'statistics_101', 'python_101'],
            'deep_learning': ['machine_learning', 'linear_algebra'],
            'nlp_advanced': ['deep_learning']
        }
    
    def verify_prerequisites(self, completed_courses: Set[str], target_course: str) -> Dict:
        """Evaluates if the symbolic rule (has requirements) is met."""
        required = self.prerequisites_dag.get(target_course, [])
        missing = [req for req in required if req not in completed_courses]
        
        is_eligible = len(missing) == 0
        return {
            'eligible': is_eligible,
            'missing_prerequisites': missing,
            'reasoning': f"Meets all {len(required)} prerequisites." if is_eligible else f"Missing required foundational knowledge: {', '.join(missing)}"
        }
        

class NeuralEmbeddingCore:
    """
    Phase 64: Neural Embedding Evaluator.
    
    Handles probabilistic, continuous predictions based on latent vectors.
    (Mocking a fast dot-product embedding retrieval).
    """
    
    def __init__(self):
        # Random mock embeddings for demonstration [dim=4]
        self.course_embeddings = {
            'calculus_101': [0.8, -0.2, 0.4, 0.1],
            'algebra_101': [0.7, -0.1, 0.3, 0.2],
            'creative_writing': [-0.5, 0.9, -0.3, 0.8],
            'physics_101': [0.9, -0.4, 0.5, 0.2],
            'machine_learning': [0.6, 0.1, 0.8, 0.4]
        }
        
    def _cosine_similarity(self, a: List[float], b: List[float]) -> float:
        dot = sum(x*y for x, y in zip(a, b))
        mag_a = math.sqrt(sum(x*x for x in a))
        mag_b = math.sqrt(sum(x*x for x in b))
        if mag_a * mag_b == 0:
            return 0.0
        return dot / (mag_a * mag_b)
        
    def predict_affinity(self, student_embedding: List[float], target_course: str) -> float:
        """Returns probabilistic affinity bridging [0, 1]."""
        course_vec = self.course_embeddings.get(target_course)
        if not course_vec:
            return 0.5 # Unknown course fallback
            
        sim = self._cosine_similarity(student_embedding, course_vec)
        # Shift [-1, 1] to [0, 1]
        return (sim + 1.0) / 2.0


class NeuroSymbolicEngine:
    """
    Phase 64: Neuro-Symbolic AI Engine.
    
    This architecture unifies "System 1" (Fast, pattern-matching Neural Networks)
    with "System 2" (Slow, deliberate, rule-based Symbolic Logic).
    
    The ML model might predict a student will love 'Machine Learning' based 
    on their interest in 'Sci-Fi Books' (Neural approach). 
    However, the Symbolic Engine hard-vetoes the recommendation if the 
    student hasn't taken 'Calculus' (Symbolic approach).
    
    Output: A hybrid recommendation that is both highly personalized (Neural) 
    and perfectly logically sound (Symbolic).
    """
    
    def __init__(self):
        self.logic = SymbolicLogicCore()
        self.neural = NeuralEmbeddingCore()
        
    def generate_hybrid_recommendation(self, 
                                       student_id: str,
                                       student_embedding: List[float], 
                                       completed_courses: List[str], 
                                       candidate_courses: List[str]) -> Dict:
        """
        Filters and ranks candidates using Neuro-Symbolic integration.
        """
        completed_set = set(completed_courses)
        recommendations = []
        rejected = []
        
        for course in candidate_courses:
            # 1. System 2: Strict Symbolic Logic Gate
            logic_check = self.logic.verify_prerequisites(completed_set, course)
            
            if not logic_check['eligible']:
                rejected.append({
                    'course': course,
                    'reason': logic_check['reasoning'],
                    'missing': logic_check['missing_prerequisites']
                })
                continue
                
            # 2. System 1: Neural Probabilistic Affinity
            neural_affinity = self.neural.predict_affinity(student_embedding, course)
            
            # 3. Hybrid Synthesis
            recommendations.append({
                'course': course,
                'neural_affinity_score': round(neural_affinity, 4),
                'confidence': 'High' if neural_affinity > 0.8 else 'Medium' if neural_affinity > 0.6 else 'Low',
                'symbolic_validation': 'Passed (Dependencies met)'
            })
            
        # Sort allowed recommendations by Neural score descending
        recommendations.sort(key=lambda x: x['neural_affinity_score'], reverse=True)
        
        return {
            'student_id': student_id,
            'approved_recommendations': recommendations,
            'hard_rejected_by_logic': rejected
        }

"""
Explainability & Interpretability Module (Phase 22).
Provides tools for understanding AI model predictions.
"""
import logging
import random
from typing import List, Dict, Any, Optional, Callable
from dataclasses import dataclass
from abc import ABC, abstractmethod

logger = logging.getLogger(__name__)


@dataclass
class FeatureImportance:
    """Represents feature importance scores."""
    feature_name: str
    importance: float
    direction: str  # 'positive' or 'negative'


@dataclass
class Explanation:
    """Complete explanation for a prediction."""
    prediction: Any
    confidence: float
    feature_importances: List[FeatureImportance]
    reasoning: str
    counterfactuals: List[Dict[str, Any]]


class SHAPExplainer:
    """
    SHAP (SHapley Additive exPlanations) inspired explainer.
    Computes feature contributions using approximated Shapley values.
    """
    
    def __init__(self, model_fn: Optional[Callable] = None, n_samples: int = 100):
        self.model_fn = model_fn
        self.n_samples = n_samples
        self.background_data: List[Dict] = []
    
    def set_background(self, data: List[Dict]):
        """Set background dataset for computing expectations."""
        self.background_data = data
    
    def _approximate_shapley(
        self, 
        instance: Dict, 
        feature: str, 
        baseline: Dict
    ) -> float:
        """
        Approximate Shapley value for a single feature.
        Uses permutation sampling approach.
        """
        if self.model_fn is None:
            # Mock model - returns sum of feature values
            return instance.get(feature, 0) * 0.1
        
        contributions = []
        features = list(instance.keys())
        
        for _ in range(min(self.n_samples, 20)):
            # Random permutation of features
            perm = features[:]
            random.shuffle(perm)
            
            # Find position of target feature
            pos = perm.index(feature)
            
            # Create two instances: with and without target feature
            with_feature = baseline.copy()
            without_feature = baseline.copy()
            
            for i, f in enumerate(perm):
                if i < pos:
                    with_feature[f] = instance[f]
                    without_feature[f] = instance[f]
                elif i == pos:
                    with_feature[f] = instance[f]
                    # without_feature keeps baseline
            
            # Marginal contribution
            try:
                pred_with = self.model_fn(with_feature)
                pred_without = self.model_fn(without_feature)
                contribution = pred_with - pred_without
                contributions.append(contribution)
            except Exception:
                contributions.append(0)
        
        return sum(contributions) / len(contributions) if contributions else 0
    
    def explain(self, instance: Dict) -> List[FeatureImportance]:
        """Compute SHAP values for all features."""
        if not self.background_data:
            # Use zeros as baseline
            baseline = dict.fromkeys(instance.keys(), 0)
        else:
            # Use mean of background data
            baseline = {}
            for key in instance.keys():
                values = [d.get(key, 0) for d in self.background_data if isinstance(d.get(key, 0), (int, float))]
                baseline[key] = sum(values) / len(values) if values else 0
        
        importances = []
        for feature in instance.keys():
            shap_value = self._approximate_shapley(instance, feature, baseline)
            importances.append(FeatureImportance(
                feature_name=feature,
                importance=abs(shap_value),
                direction='positive' if shap_value > 0 else 'negative'
            ))
        
        # Sort by importance
        importances.sort(key=lambda x: x.importance, reverse=True)
        return importances


class AttentionVisualizer:
    """
    Visualize attention weights from transformer-like models.
    """
    
    def __init__(self):
        self.attention_cache: Dict[str, List[List[float]]] = {}
    
    def register_attention(self, layer_name: str, attention_weights: List[List[float]]):
        """Register attention weights from a layer."""
        self.attention_cache[layer_name] = attention_weights
    
    def get_token_importance(self, tokens: List[str], layer_name: str = "default") -> List[Dict[str, Any]]:
        """
        Get importance scores for each token based on attention.
        """
        if layer_name not in self.attention_cache:
            # Generate mock attention (uniform with some variance)
            n_tokens = len(tokens)
            mock_attention = [[1.0/n_tokens + random.gauss(0, 0.1) for _ in range(n_tokens)] 
                            for _ in range(n_tokens)]
            self.attention_cache[layer_name] = mock_attention
        
        attention = self.attention_cache[layer_name]
        
        # Aggregate attention across positions (column sum = how much each token is attended to)
        n_tokens = len(tokens)
        aggregated = [0.0] * n_tokens
        
        for row in attention:
            for col, weight in enumerate(row):
                if col < n_tokens:
                    aggregated[col] += weight
        
        # Normalize
        total = sum(aggregated) + 1e-8
        aggregated = [a / total for a in aggregated]
        
        return [
            {
                'token': tokens[i],
                'attention_score': aggregated[i],
                'relative_importance': 'high' if aggregated[i] > 1.0/n_tokens else 'normal'
            }
            for i in range(n_tokens)
        ]
    
    def get_attention_heatmap(self, layer_name: str = "default") -> Dict[str, Any]:
        """Get attention weights as a heatmap-ready format."""
        if layer_name not in self.attention_cache:
            return {'error': 'Layer not found'}
        
        attention = self.attention_cache[layer_name]
        return {
            'layer': layer_name,
            'shape': [len(attention), len(attention[0]) if attention else 0],
            'weights': attention
        }


class CounterfactualGenerator:
    """
    Generate counterfactual explanations.
    "What minimal changes would flip the prediction?"
    """
    
    def __init__(self, model_fn: Optional[Callable] = None):
        self.model_fn = model_fn
        self.feature_ranges: Dict[str, tuple] = {}
    
    def set_feature_ranges(self, ranges: Dict[str, tuple]):
        """Set valid ranges for features."""
        self.feature_ranges = ranges
    
    def _predict(self, instance: Dict) -> float:
        """Get prediction for an instance."""
        if self.model_fn:
            return self.model_fn(instance)
        # Mock: return sum of values
        return sum(v for v in instance.values() if isinstance(v, (int, float)))
    
    def generate(
        self, 
        instance: Dict, 
        target_class: Any = None,  # Reserved for future use
        n_counterfactuals: int = 3,
        max_changes: int = 2
    ) -> List[Dict[str, Any]]:
        """
        Generate counterfactual explanations.
        """
        original_pred = self._predict(instance)
        counterfactuals = []
        
        features = [k for k, v in instance.items() if isinstance(v, (int, float))]
        
        for _ in range(n_counterfactuals * 10):  # Generate candidates
            if len(counterfactuals) >= n_counterfactuals:
                break
            
            # Random subset of features to change
            n_changes = random.randint(1, min(max_changes, len(features)))
            features_to_change = random.sample(features, n_changes)
            
            cf = instance.copy()
            changes = []
            
            for feature in features_to_change:
                original_value = instance[feature]
                
                # Get range
                if feature in self.feature_ranges:
                    min_val, max_val = self.feature_ranges[feature]
                else:
                    min_val = original_value * 0.5
                    max_val = original_value * 1.5
                
                # Generate new value
                new_value = random.uniform(min_val, max_val)
                cf[feature] = new_value
                
                changes.append({
                    'feature': feature,
                    'from': original_value,
                    'to': round(new_value, 3)
                })
            
            # Check if prediction changed significantly
            cf_pred = self._predict(cf)
            pred_change = abs(cf_pred - original_pred)
            
            if pred_change > 0.1 * abs(original_pred):  # Significant change
                counterfactuals.append({
                    'original_prediction': original_pred,
                    'counterfactual_prediction': cf_pred,
                    'changes': changes,
                    'distance': sum(abs(c['to'] - c['from']) for c in changes)
                })
        
        # Sort by distance (prefer minimal changes)
        counterfactuals.sort(key=lambda x: x['distance'])
        return counterfactuals[:n_counterfactuals]


class ExplainabilityEngine:
    """
    Unified explainability engine combining multiple techniques.
    """
    
    def __init__(self, model_fn: Optional[Callable] = None):
        self.model_fn = model_fn
        self.shap = SHAPExplainer(model_fn)
        self.attention = AttentionVisualizer()
        self.counterfactual = CounterfactualGenerator(model_fn)
    
    def explain_prediction(
        self,
        instance: Dict,
        include_counterfactuals: bool = True
    ) -> Explanation:
        """
        Generate comprehensive explanation for a prediction.
        """
        # Get prediction
        if self.model_fn:
            prediction = self.model_fn(instance)
        else:
            prediction = sum(v for v in instance.values() if isinstance(v, (int, float)))
        
        # SHAP-like feature importance
        feature_importances = self.shap.explain(instance)
        
        # Generate counterfactuals
        counterfactuals = []
        if include_counterfactuals:
            counterfactuals = self.counterfactual.generate(instance)
        
        # Generate natural language reasoning
        top_features = feature_importances[:3]
        reasoning = self._generate_reasoning(prediction, top_features)
        
        return Explanation(
            prediction=prediction,
            confidence=0.85,  # Mock confidence
            feature_importances=feature_importances,
            reasoning=reasoning,
            counterfactuals=counterfactuals
        )
    
    def _generate_reasoning(
        self, 
        prediction: Any, 
        top_features: List[FeatureImportance]
    ) -> str:
        """Generate natural language explanation."""
        if not top_features:
            return "Prediction made based on input features."
        
        parts = []
        pred_str = f"{prediction:.3f}" if isinstance(prediction, float) else str(prediction)
        parts.append(f"The model predicted {pred_str}.")
        
        parts.append("Key factors:")
        for i, feat in enumerate(top_features, 1):
            direction = "increased" if feat.direction == 'positive' else "decreased"
            parts.append(f"  {i}. '{feat.feature_name}' {direction} the prediction (importance: {feat.importance:.3f})")
        
        return "\n".join(parts)
    
    def explain_text(self, text: str) -> Dict[str, Any]:
        """
        Explain a text-based prediction using attention.
        """
        tokens = text.split()
        
        # Get token importance via attention
        token_scores = self.attention.get_token_importance(tokens)
        
        return {
            'text': text,
            'tokens': tokens,
            'token_importance': token_scores,
            'summary': f"Most attended tokens: {', '.join([t['token'] for t in sorted(token_scores, key=lambda x: -x['attention_score'])[:3]])}"
        }

    # =========================================================================
    # PHASE 8: RECOMMENDATION EXPLANATION METHODS
    # =========================================================================

    def explain_course_recommendation(
        self,
        user_id: int,
        course_id: int,
        recommendation_score: float = 0.0
    ) -> Dict[str, Any]:
        """
        Generate human-readable explanation for a course recommendation.
        
        Args:
            user_id: The user ID receiving the recommendation
            course_id: The recommended course ID
            recommendation_score: The AI-generated score (0-1)
        
        Returns:
            Dict with reasoning, factors, and counterfactuals
        """
        try:
            from apps.users.models import User
            from apps.courses.models import Course
            from apps.progress.models import UserProgress
            
            user = User.objects.get(id=user_id)
            course = Course.objects.get(id=course_id)
            
            # Build feature vector for this recommendation
            features = self._build_recommendation_features(user, course)
            
            # Get feature importances
            feature_importances = self.shap.explain(features)
            
            # Generate counterfactuals
            counterfactuals = self.counterfactual.generate(features, n_counterfactuals=2)
            
            # Build explanation text
            top_factors = feature_importances[:3]
            explanation_parts = [
                f"**{course.title}** is recommended because:"
            ]
            
            for i, factor in enumerate(top_factors, 1):
                if factor.direction == 'positive':
                    explanation_parts.append(f"  {i}. High match on `{factor.feature_name}`")
                else:
                    explanation_parts.append(f"  {i}. Could improve your `{factor.feature_name}`")
            
            # Add counterfactual insight
            if counterfactuals:
                cf = counterfactuals[0]
                change = cf['changes'][0] if cf['changes'] else None
                if change:
                    explanation_parts.append(
                        f"\n💡 *Tip*: If you {self._format_change(change)}, this would change the recommendation."
                    )
            
            return {
                'course_id': course_id,
                'course_title': course.title,
                'recommendation_score': recommendation_score,
                'explanation': '\n'.join(explanation_parts),
                'feature_importances': [
                    {
                        'feature': f.feature_name,
                        'importance': round(f.importance, 3),
                        'direction': f.direction
                    }
                    for f in feature_importances[:5]
                ],
                'counterfactuals': [
                    {
                        'what_if': f"If you changed: {', '.join([c['feature'] for c in cf['changes']])}",
                        'new_score': round(cf.get('counterfactual_prediction', 0), 3)
                    }
                    for cf in counterfactuals
                ]
            }
            
        except Exception as e:
            logger.error(f"Explanation error: {e}")
            return {
                'course_id': course_id,
                'explanation': 'This course matches your learning profile.',
                'error': str(e)
            }

    def _build_recommendation_features(self, user, course) -> Dict[str, float]:
        """Build feature vector for a user-course pair."""
        features = {
            'difficulty_match': 0.5,
            'category_interest': 0.5,
            'prerequisite_completion': 0.5,
            'peer_popularity': 0.5,
            'time_fit': 0.5
        }
        
        try:
            from apps.progress.models import UserProgress
            from .adaptive_engine import AdaptiveEngine
            
            # Difficulty match
            engine = AdaptiveEngine(user)
            rec_diff = engine.get_recommended_difficulty()
            course_diff = getattr(course, 'difficulty', 'intermediate')
            
            diff_map = {'beginner': 0, 'intermediate': 1, 'advanced': 2}
            user_level = diff_map.get(rec_diff, 1)
            course_level = diff_map.get(course_diff, 1)
            features['difficulty_match'] = 1.0 - abs(user_level - course_level) * 0.3
            
            # Category interest (check past enrollments)
            if hasattr(course, 'category') and course.category:
                similar_courses = UserProgress.objects.filter(
                    user=user,
                    course__category=course.category
                ).count()
                features['category_interest'] = min(1.0, similar_courses * 0.2)
            
            # Peer popularity
            from apps.enrollments.models import Enrollment
            recent_enrollments = Enrollment.objects.filter(course=course).count()
            features['peer_popularity'] = min(1.0, recent_enrollments * 0.01)
            
        except Exception as e:
            logger.debug(f"Feature building fallback: {e}")
        
        return features

    def _format_change(self, change: Dict) -> str:
        """Format a counterfactual change as human-readable text."""
        feature = change.get('feature', 'something')
        from_val = change.get('from', 0)
        to_val = change.get('to', 0)
        
        if to_val > from_val:
            return f"increased your {feature}"
        else:
            return f"decreased your {feature}"




def demo_explainability():
    """Demonstrate explainability features."""
    # Simple model function
    def simple_model(x: Dict) -> float:
        return x.get('age', 0) * 0.5 + x.get('income', 0) * 0.001 - x.get('debt', 0) * 0.002
    
    engine = ExplainabilityEngine(simple_model)
    
    # Sample instance
    instance = {
        'age': 35,
        'income': 75000,
        'debt': 15000,
        'credit_score': 720
    }
    
    # Get explanation
    explanation = engine.explain_prediction(instance)
    
    print("=== Prediction Explanation ===")
    print(f"Prediction: {explanation.prediction}")
    print(f"Confidence: {explanation.confidence}")
    print(f"\nReasoning:\n{explanation.reasoning}")
    print(f"\nTop Counterfactuals:")
    for i, cf in enumerate(explanation.counterfactuals, 1):
        print(f"  {i}. Changes: {cf['changes']}, New prediction: {cf['counterfactual_prediction']:.2f}")
    
    return explanation

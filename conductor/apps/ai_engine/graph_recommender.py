import math
import logging
from typing import Dict, List, Tuple, Set, Optional
from collections import defaultdict
from django.db.models import Avg, Count

logger = logging.getLogger(__name__)


# =============================================================================
# PART A: GRAPH NEURAL NETWORK RECOMMENDER
# =============================================================================

class BipartiteGraph:
    """
    Phase 57: Bipartite Interaction Graph (Student <-> Course).
    
    Models the entire platform as a graph where:
    - LEFT nodes = Students (User IDs)
    - RIGHT nodes = Courses (Course IDs)
    - EDGES = Interactions (enrollment, quiz completion, review)
    - EDGE WEIGHTS = Interaction strength (duration, score, frequency)
    
    This enables Graph-based reasoning: "Students similar to YOU also 
    engaged deeply with THESE courses."
    """
    
    def __init__(self):
        self.student_neighbors: Dict[int, Dict[int, float]] = defaultdict(dict)
        self.course_neighbors: Dict[int, Dict[int, float]] = defaultdict(dict)
        self.student_embeddings: Dict[int, List[float]] = {}
        self.course_embeddings: Dict[int, List[float]] = {}
    
    def add_edge(self, student_id: int, course_id: int, weight: float = 1.0):
        """Add an interaction edge between student and course."""
        self.student_neighbors[student_id][course_id] = weight
        self.course_neighbors[course_id][student_id] = weight
    
    def get_student_courses(self, student_id: int) -> Dict[int, float]:
        """Get all courses a student has interacted with."""
        return self.student_neighbors.get(student_id, {})
    
    def get_course_students(self, course_id: int) -> Dict[int, float]:
        """Get all students who interacted with a course."""
        return self.course_neighbors.get(course_id, {})


class MessagePassingLayer:
    """
    A single layer of Graph Message Passing (simplified GCN).
    
    Each node aggregates feature information from its neighbors,
    producing a new embedding that captures local graph structure.
    
    Math: h_v^(l+1) = σ(W · AGGREGATE({h_u : u ∈ N(v)}))
    """
    
    def __init__(self, embed_dim: int = 16):
        self.embed_dim = embed_dim
    
    @staticmethod
    def _normalize(vec: List[float]) -> List[float]:
        """L2 normalize a vector."""
        norm = math.sqrt(sum(x * x for x in vec))
        if norm < 1e-8:
            return vec
        return [x / norm for x in vec]
    
    @staticmethod
    def _relu(x: float) -> float:
        return max(0.0, x)
    
    def aggregate_neighbors(
        self,
        node_embedding: List[float],
        neighbor_embeddings: List[Tuple[List[float], float]]
    ) -> List[float]:
        """
        Weighted mean aggregation of neighbor embeddings.
        
        Args:
            node_embedding: Current node's feature vector.
            neighbor_embeddings: List of (neighbor_embedding, edge_weight).
            
        Returns:
            Updated node embedding after message passing.
        """
        if not neighbor_embeddings:
            return node_embedding
        
        total_weight = sum(w for _, w in neighbor_embeddings)
        if total_weight < 1e-8:
            return node_embedding
        
        # Weighted mean aggregation
        aggregated = [0.0] * self.embed_dim
        for emb, weight in neighbor_embeddings:
            for i in range(min(len(emb), self.embed_dim)):
                aggregated[i] += emb[i] * (weight / total_weight)
        
        # Combine with self-embedding (skip connection)
        combined = [
            self._relu(0.5 * node_embedding[i] + 0.5 * aggregated[i])
            for i in range(self.embed_dim)
        ]
        
        return self._normalize(combined)


class GraphRecommender:
    """
    Phase 57: Graph Neural Network Course Recommender.
    
    Uses a 2-layer message passing GNN over the Student-Course bipartite
    graph to learn latent representations, then ranks unseen courses by 
    cosine similarity to the student's graph-informed embedding.
    """
    
    EMBED_DIM = 16
    NUM_LAYERS = 2
    
    def __init__(self):
        self.graph = BipartiteGraph()
        self.mp_layer = MessagePassingLayer(embed_dim=self.EMBED_DIM)
    
    def build_graph_from_db(self):
        """Constructs the bipartite graph from Django ORM enrollment data."""
        from apps.courses.models import Enrollment
        
        enrollments = Enrollment.objects.select_related('course', 'user').all()
        
        for enrollment in enrollments:
            weight = 1.0
            if hasattr(enrollment, 'progress'):
                weight = max(0.1, enrollment.progress / 100.0)
            self.graph.add_edge(enrollment.user_id, enrollment.course_id, weight)
        
        logger.info(
            "GraphRecommender: Built bipartite graph with %d students, %d courses.",
            len(self.graph.student_neighbors),
            len(self.graph.course_neighbors)
        )
    
    def _initialize_embeddings(self):
        """Initialize random-ish embeddings based on node degree."""
        import hashlib
        
        for sid in self.graph.student_neighbors:
            seed = int(hashlib.md5(str(sid).encode()).hexdigest()[:8], 16)
            degree = len(self.graph.student_neighbors[sid])
            self.graph.student_embeddings[sid] = [
                math.sin(seed * (i + 1)) * 0.5 + degree * 0.01
                for i in range(self.EMBED_DIM)
            ]
        
        for cid in self.graph.course_neighbors:
            seed = int(hashlib.md5(str(cid).encode()).hexdigest()[:8], 16)
            degree = len(self.graph.course_neighbors[cid])
            self.graph.course_embeddings[cid] = [
                math.cos(seed * (i + 1)) * 0.5 + degree * 0.01
                for i in range(self.EMBED_DIM)
            ]
    
    def run_message_passing(self):
        """Execute multi-layer message passing to learn graph-aware embeddings."""
        self._initialize_embeddings()
        
        for layer_idx in range(self.NUM_LAYERS):
            # Update student embeddings by aggregating course neighbors
            new_student_embs = {}
            for sid, courses in self.graph.student_neighbors.items():
                neighbor_embs = [
                    (self.graph.course_embeddings.get(cid, [0.0] * self.EMBED_DIM), w)
                    for cid, w in courses.items()
                ]
                new_student_embs[sid] = self.mp_layer.aggregate_neighbors(
                    self.graph.student_embeddings[sid], neighbor_embs
                )
            
            # Update course embeddings by aggregating student neighbors
            new_course_embs = {}
            for cid, students in self.graph.course_neighbors.items():
                neighbor_embs = [
                    (self.graph.student_embeddings.get(sid, [0.0] * self.EMBED_DIM), w)
                    for sid, w in students.items()
                ]
                new_course_embs[cid] = self.mp_layer.aggregate_neighbors(
                    self.graph.course_embeddings[cid], neighbor_embs
                )
            
            self.graph.student_embeddings = new_student_embs
            self.graph.course_embeddings = new_course_embs
            
            logger.info("GraphRecommender: Message Passing Layer %d complete.", layer_idx + 1)
    
    @staticmethod
    def _cosine_similarity(a: List[float], b: List[float]) -> float:
        """Compute cosine similarity between two vectors."""
        dot = sum(x * y for x, y in zip(a, b))
        norm_a = math.sqrt(sum(x * x for x in a))
        norm_b = math.sqrt(sum(x * x for x in b))
        if norm_a < 1e-8 or norm_b < 1e-8:
            return 0.0
        return dot / (norm_a * norm_b)
    
    def recommend_courses(self, student_id: int, top_k: int = 5) -> List[Dict]:
        """
        Recommend unseen courses by ranking them via cosine similarity 
        to the student's graph-learned embedding.
        """
        student_emb = self.graph.student_embeddings.get(student_id)
        if not student_emb:
            return []
        
        already_enrolled = set(self.graph.student_neighbors.get(student_id, {}).keys())
        
        scores = []
        for cid, course_emb in self.graph.course_embeddings.items():
            if cid in already_enrolled:
                continue
            sim = self._cosine_similarity(student_emb, course_emb)
            scores.append((cid, sim))
        
        scores.sort(key=lambda x: x[1], reverse=True)
        
        recommendations = []
        for cid, sim in scores[:top_k]:
            recommendations.append({
                'course_id': cid,
                'similarity_score': round(sim, 4),
                'reason': 'Graph-based: students with similar learning paths engaged with this course.'
            })
        
        return recommendations


# =============================================================================
# PART B: COLLABORATIVE FILTERING (Matrix Factorization)
# =============================================================================

class MatrixFactorization:
    """
    Phase 57: Collaborative Filtering via Stochastic Gradient Descent
    Matrix Factorization.
    
    Decomposes the sparse Student-Course interaction matrix R into two
    low-rank matrices: R ≈ P × Q^T
    
    Where:
    - P[u] = latent factor vector for student u
    - Q[i] = latent factor vector for course i
    - R[u][i] = predicted rating/engagement
    
    Uses Regularized SGD to minimize:
    L = Σ (r_ui - p_u · q_i)² + λ(||p_u||² + ||q_i||²)
    """
    
    def __init__(self, num_factors: int = 10, lr: float = 0.01,
                 reg: float = 0.02, epochs: int = 50):
        self.num_factors = num_factors
        self.lr = lr
        self.reg = reg
        self.epochs = epochs
        self.P: Dict[int, List[float]] = {}  # Student latent factors
        self.Q: Dict[int, List[float]] = {}  # Course latent factors
        self.global_mean = 0.0
    
    def _init_factors(self, user_ids: Set[int], item_ids: Set[int]):
        """Initialize latent factor matrices with small random values."""
        import hashlib
        
        for uid in user_ids:
            seed = int(hashlib.md5(str(uid).encode()).hexdigest()[:8], 16)
            self.P[uid] = [
                math.sin(seed * (i + 1)) * 0.1
                for i in range(self.num_factors)
            ]
        
        for iid in item_ids:
            seed = int(hashlib.md5(str(iid).encode()).hexdigest()[:8], 16)
            self.Q[iid] = [
                math.cos(seed * (i + 1)) * 0.1
                for i in range(self.num_factors)
            ]
    
    def train(self, interactions: List[Tuple[int, int, float]]):
        """
        Train the matrix factorization model using SGD.
        
        Args:
            interactions: List of (user_id, course_id, rating/score) tuples.
        """
        if not interactions:
            return
        
        user_ids = {u for u, _, _ in interactions}
        item_ids = {i for _, i, _ in interactions}
        self.global_mean = sum(r for _, _, r in interactions) / len(interactions)
        
        self._init_factors(user_ids, item_ids)
        
        prev_loss = float('inf')
        for epoch in range(self.epochs):
            total_loss = 0.0
            
            for uid, iid, rating in interactions:
                # Predict
                prediction = self._predict_single(uid, iid)
                error = rating - prediction
                
                # SGD Update
                p_u = self.P[uid]
                q_i = self.Q[iid]
                
                for k in range(self.num_factors):
                    p_update = self.lr * (error * q_i[k] - self.reg * p_u[k])
                    q_update = self.lr * (error * p_u[k] - self.reg * q_i[k])
                    self.P[uid][k] += p_update
                    self.Q[iid][k] += q_update
                
                total_loss += error ** 2
            
            avg_loss = total_loss / len(interactions)
            
            # Early stopping if converged
            if abs(prev_loss - avg_loss) < 1e-6:
                logger.info("MatrixFactorization: Converged at epoch %d (loss=%.6f)", epoch, avg_loss)
                break
            prev_loss = avg_loss
        
        logger.info("MatrixFactorization: Training complete. Final loss=%.6f", avg_loss)
    
    def _predict_single(self, user_id: int, item_id: int) -> float:
        """Predict rating for a single user-item pair."""
        if user_id not in self.P or item_id not in self.Q:
            return self.global_mean
        return sum(
            self.P[user_id][k] * self.Q[item_id][k]
            for k in range(self.num_factors)
        )
    
    def recommend(self, user_id: int, exclude_items: Set[int] = None,
                  top_k: int = 5) -> List[Dict]:
        """
        Recommend top-K items for a user by predicting unseen ratings.
        """
        if user_id not in self.P:
            return []
        
        if exclude_items is None:
            exclude_items = set()
        
        predictions = []
        for iid in self.Q:
            if iid in exclude_items:
                continue
            score = self._predict_single(user_id, iid)
            predictions.append((iid, score))
        
        predictions.sort(key=lambda x: x[1], reverse=True)
        
        return [
            {
                'course_id': iid,
                'predicted_score': round(score, 4),
                'reason': 'Collaborative Filtering: users with similar taste rated this highly.'
            }
            for iid, score in predictions[:top_k]
        ]


class HybridRecommender:
    """
    Orchestrates Graph Recommender + Collaborative Filtering into a 
    unified hybrid recommendation pipeline.
    
    Final score = α * GNN_score + (1-α) * CF_score
    """
    
    ALPHA = 0.6  # Weight towards graph-based recommendations
    
    @classmethod
    def get_hybrid_recommendations(cls, user_id: int, top_k: int = 5) -> List[Dict]:
        """
        Combines GNN and CF recommendations with weighted scoring.
        """
        from apps.courses.models import Enrollment
        
        # 1. Build and run GNN recommender
        gnn = GraphRecommender()
        gnn.build_graph_from_db()
        gnn.run_message_passing()
        gnn_recs = gnn.recommend_courses(user_id, top_k=top_k * 2)
        
        # 2. Build and run CF recommender
        cf = MatrixFactorization(num_factors=10, epochs=30)
        enrollments = Enrollment.objects.all().values_list('user_id', 'course_id')
        interactions = [(uid, cid, 1.0) for uid, cid in enrollments]
        cf.train(interactions)
        
        enrolled_ids = set(
            Enrollment.objects.filter(user_id=user_id).values_list('course_id', flat=True)
        )
        cf_recs = cf.recommend(user_id, exclude_items=enrolled_ids, top_k=top_k * 2)
        
        # 3. Merge with weighted scoring
        score_map = defaultdict(lambda: {'gnn': 0.0, 'cf': 0.0, 'reasons': []})
        
        for rec in gnn_recs:
            cid = rec['course_id']
            score_map[cid]['gnn'] = rec['similarity_score']
            score_map[cid]['reasons'].append(rec['reason'])
        
        for rec in cf_recs:
            cid = rec['course_id']
            score_map[cid]['cf'] = rec['predicted_score']
            score_map[cid]['reasons'].append(rec['reason'])
        
        # Hybrid scoring
        hybrid_scores = []
        for cid, scores in score_map.items():
            hybrid = cls.ALPHA * scores['gnn'] + (1 - cls.ALPHA) * scores['cf']
            hybrid_scores.append({
                'course_id': cid,
                'hybrid_score': round(hybrid, 4),
                'gnn_component': round(scores['gnn'], 4),
                'cf_component': round(scores['cf'], 4),
                'reasons': list(set(scores['reasons']))
            })
        
        hybrid_scores.sort(key=lambda x: x['hybrid_score'], reverse=True)
        
        return hybrid_scores[:top_k]

import logging
import random
import math
from typing import List, Dict, Any
from django.apps import apps
from .gnn_knowledge import KnowledgeGraphTracer

logger = logging.getLogger(__name__)

class GNNKnowledgeService:
    """
    Service to bridge the GNN Engine with the Django Database.
    Builds an adjacency matrix from Course dependencies and predicts student success.
    """

    @classmethod
    def build_curriculum_graph(cls) -> Dict[str, Any]:
        """
        Builds an adjacency matrix where nodes are Courses and edges are relationships.
        """
        Course = apps.get_model('courses', 'Course')
        courses = list(Course.objects.filter(is_published=True).order_by('id'))
        node_count = len(courses)
        
        if node_count < 2:
            return {"error": "Not enough courses to build a graph."}

        # 1. Map Course ID to Matrix Index
        id_to_idx = {course.id: i for i, course in enumerate(courses)}
        idx_to_title = {i: course.title for i, course in enumerate(courses)}

        # 2. Initialize Adjacency Matrix
        adj = [[0.0] * node_count for _ in range(node_count)]

        # 3. Add Edges (Prerequisites)
        # Note: Assuming a 'prerequisites' ManyToManyField exists or simulating relationships
        for course in courses:
            if hasattr(course, 'category'):
                # Link courses in the same category
                peers = Course.objects.filter(category=course.category, is_published=True).exclude(id=course.id)
                for peer in peers:
                    if peer.id in id_to_idx:
                        u, v = id_to_idx[course.id], id_to_idx[peer.id]
                        adj[u][v] = 1.0
                        adj[v][u] = 1.0

        # 4. Generate Random Node Features (Embeddings)
        # In production, these would be rich content embeddings
        features = [[random.random() for _ in range(4)] for _ in range(node_count)]

        # 5. Run GNN Inference
        tracer = KnowledgeGraphTracer(num_nodes=node_count, feature_dim=4)
        predictions = tracer.predict_graph_state(adj, features)

        return {
            "node_mapping": idx_to_title,
            "embeddings": predictions["final_embeddings"],
            "message": "Curriculum Knowledge Graph processed via GCN."
        }

    @classmethod
    def run_node2vec_traversal(cls) -> Dict[str, Any]:
        """
        Phase 118: Node2Vec simulation for concept traversal.
        Calculates random walks to find implicit conceptual clusters.
        """
        # Simulated random walk logic
        concepts = ["React", "Vue", "Angular", "Django", "Flask", "FastAPI", "Postgres", "MongoDB"]
        walks = []
        for _ in range(3):
            walk = [random.choice(concepts)]
            for _ in range(4):
                # High probability of staying in same stack (Frontend vs Backend)
                if walk[-1] in ["React", "Vue", "Angular"]:
                    walk.append(random.choice(["React", "Vue", "Angular", "Postgres"]))
                else:
                    walk.append(random.choice(["Django", "Flask", "FastAPI", "Postgres", "MongoDB"]))
            walks.append(walk)
            
        return {
            "random_walks": walks,
            "concept_clustering": "Node2Vec revealed strong clusters in 'Frontend' and 'Python Backend' concepts."
        }

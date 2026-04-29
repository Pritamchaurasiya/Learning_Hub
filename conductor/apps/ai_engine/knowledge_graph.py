"""
Cognitive Knowledge Graph (CKG).
Enables Multi-Hop Reasoning and Entity Relationship Mapping.
"""
import logging
import json
import os
from typing import List, Dict, Any, Tuple
from dataclasses import dataclass, field
from django.conf import settings

# Lightweight graph library
try:
    import networkx as nx
except ImportError:
    nx = None

logger = logging.getLogger(__name__)

@dataclass
class GraphNode:
    id: str
    type: str # e.g., 'Concept', 'Course', 'Author'
    metadata: Dict[str, Any] = field(default_factory=dict)

@dataclass
class GraphEdge:
    source: str
    target: str
    relation: str # e.g., 'prerequisite_for', 'part_of', 'related_to'
    weight: float = 1.0

class KnowledgeGraph:
    """
    Persistent Knowledge Graph using NetworkX.
    """
    def __init__(self, persist_path: str = "knowledge_graph.json"):
        self.persist_path = os.path.join(settings.BASE_DIR, "data", persist_path)
        self.graph = nx.DiGraph() if nx else None
        self._ensure_data_dir()
        self.load()

    def _ensure_data_dir(self):
        os.makedirs(os.path.dirname(self.persist_path), exist_ok=True)

    def add_node(self, node_id: str, node_type: str, metadata: Dict = None):
        if not self.graph: return
        self.graph.add_node(node_id, type=node_type, **(metadata or {}))

    def add_edge(self, source: str, target: str, relation: str, weight: float = 1.0):
        if not self.graph: return
        self.graph.add_edge(source, target, relation=relation, weight=weight)
        
    def find_related(self, node_id: str, max_hops: int = 1) -> List[Dict]:
        """
        Find related entities up to max_hops away.
        """
        if not self.graph or node_id not in self.graph:
            return []
            
        related = []
        # BFS traversal
        lengths = nx.single_source_shortest_path_length(self.graph, node_id, cutoff=max_hops)
        
        for neighbor, dist in lengths.items():
            if neighbor == node_id: continue
            node_data = self.graph.nodes[neighbor]
            related.append({
                "id": neighbor,
                "distance": dist,
                "type": node_data.get("type"),
                "metadata": node_data
            })
            
        return related

    def get_subgraph_context(self, entities: List[str]) -> str:
        """
        Get textual context from subgraph connecting entities.
        """
        if not self.graph: return ""
        
        context_lines = []
        found_entities = [e for e in entities if e in self.graph]
        
        if not found_entities:
            return ""

        # Find paths between entities or their neighbors
        for entity in found_entities:
            neighbors = list(self.graph.neighbors(entity))
            for n in neighbors:
                rel = self.graph[entity][n].get('relation', 'related to')
                context_lines.append(f"{entity} is {rel} {n}.")
                
        return "\n".join(context_lines)

    def save(self):
        """Save graph to disk."""
        if not self.graph: return
        data = nx.node_link_data(self.graph)
        try:
            with open(self.persist_path, 'w', encoding='utf-8') as f:
                json.dump(data, f)
        except Exception as e:
            logger.error(f"Failed to save KG: {e}")

    def load(self):
        """Load graph from disk."""
        if not self.graph: return
        if not os.path.exists(self.persist_path):
            return
            
        try:
            with open(self.persist_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
                self.graph = nx.node_link_graph(data)
        except Exception as e:
            logger.error(f"Failed to load KG: {e}")

    # =========================================================================
    # PHASE 3: VISUALIZATION & LEARNING PATH METHODS
    # =========================================================================

    def export_for_visualization(self, filter_type: str = None) -> Dict[str, Any]:
        """
        Export graph data in a format suitable for frontend visualization.
        
        Returns:
            {
                "nodes": [{"id": "...", "type": "...", "label": "...", ...}],
                "edges": [{"source": "...", "target": "...", "relation": "...", ...}],
                "stats": {"node_count": N, "edge_count": M}
            }
        """
        if not self.graph:
            return {"nodes": [], "edges": [], "stats": {"node_count": 0, "edge_count": 0}}
        
        nodes = []
        for node_id in self.graph.nodes():
            node_data = self.graph.nodes[node_id]
            node_type = node_data.get("type", "unknown")
            
            if filter_type and node_type != filter_type:
                continue
                
            nodes.append({
                "id": node_id,
                "type": node_type,
                "label": node_data.get("label", node_id),
                "metadata": {k: v for k, v in node_data.items() if k not in ["type", "label"]}
            })
        
        # Filter edges to only include visible nodes
        visible_node_ids = {n["id"] for n in nodes}
        edges = []
        for source, target, edge_data in self.graph.edges(data=True):
            if source in visible_node_ids and target in visible_node_ids:
                edges.append({
                    "source": source,
                    "target": target,
                    "relation": edge_data.get("relation", "related_to"),
                    "weight": edge_data.get("weight", 1.0)
                })
        
        return {
            "nodes": nodes,
            "edges": edges,
            "stats": {
                "node_count": len(nodes),
                "edge_count": len(edges)
            }
        }

    def get_learning_path(self, from_concept: str, to_concept: str) -> Dict[str, Any]:
        """
        Find the optimal learning path between two concepts.
        
        Returns:
            {
                "path": ["concept_a", "concept_b", "concept_c"],
                "steps": [{"from": "a", "to": "b", "relation": "prerequisite_for"}],
                "total_weight": 2.5
            }
        """
        if not self.graph:
            return {"path": [], "steps": [], "total_weight": 0, "error": "Graph not available"}
        
        if from_concept not in self.graph:
            return {"path": [], "steps": [], "total_weight": 0, "error": f"'{from_concept}' not found"}
        
        if to_concept not in self.graph:
            return {"path": [], "steps": [], "total_weight": 0, "error": f"'{to_concept}' not found"}
        
        try:
            # Use Dijkstra for weighted shortest path
            path = nx.dijkstra_path(self.graph, from_concept, to_concept, weight='weight')
            total_weight = nx.dijkstra_path_length(self.graph, from_concept, to_concept, weight='weight')
            
            steps = []
            for i in range(len(path) - 1):
                edge_data = self.graph.get_edge_data(path[i], path[i+1], {})
                steps.append({
                    "from": path[i],
                    "to": path[i+1],
                    "relation": edge_data.get("relation", "leads_to"),
                    "weight": edge_data.get("weight", 1.0)
                })
            
            return {
                "path": path,
                "steps": steps,
                "total_weight": round(total_weight, 2)
            }
        except nx.NetworkXNoPath:
            return {"path": [], "steps": [], "total_weight": 0, "error": "No path found"}
        except Exception as e:
            logger.error(f"Learning path error: {e}")
            return {"path": [], "steps": [], "total_weight": 0, "error": str(e)}

    def populate_from_courses(self) -> int:
        """
        Populate the knowledge graph from course/lesson data.
        
        Returns number of nodes added.
        """
        if not self.graph:
            return 0
        
        try:
            from apps.courses.models import Course, Module, Lesson, Category
            
            nodes_added = 0
            
            # Add categories
            for category in Category.objects.all():
                self.add_node(
                    f"cat_{category.id}",
                    "Category",
                    {"label": category.name, "slug": category.slug}
                )
                nodes_added += 1
            
            # Add courses
            for course in Course.objects.filter(is_published=True):
                course_id = f"course_{course.id}"
                self.add_node(
                    course_id,
                    "Course",
                    {"label": course.title, "slug": course.slug, "difficulty": course.difficulty}
                )
                nodes_added += 1
                
                # Link to category
                if course.category:
                    self.add_edge(f"cat_{course.category.id}", course_id, "contains", 0.5)
                
                # Add modules
                for module in course.modules.all():
                    module_id = f"module_{module.id}"
                    self.add_node(
                        module_id,
                        "Module",
                        {"label": module.title, "order": module.order}
                    )
                    nodes_added += 1
                    self.add_edge(course_id, module_id, "has_module", 0.3)
                    
                    # Add lessons
                    for lesson in module.lessons.all():
                        lesson_id = f"lesson_{lesson.id}"
                        self.add_node(
                            lesson_id,
                            "Lesson",
                            {"label": lesson.title, "lesson_type": lesson.lesson_type}
                        )
                        nodes_added += 1
                        self.add_edge(module_id, lesson_id, "has_lesson", 0.2)
            
            self.save()
            logger.info(f"Populated KG with {nodes_added} nodes from courses")
            return nodes_added
            
        except Exception as e:
            logger.error(f"Failed to populate KG from courses: {e}")
            return 0

    def get_prerequisites(self, concept_id: str) -> List[Dict[str, Any]]:
        """Get all prerequisites for a concept."""
        if not self.graph or concept_id not in self.graph:
            return []
        
        prerequisites = []
        for predecessor in self.graph.predecessors(concept_id):
            edge_data = self.graph.get_edge_data(predecessor, concept_id, {})
            if edge_data.get("relation") in ["prerequisite_for", "required_for"]:
                node_data = self.graph.nodes[predecessor]
                prerequisites.append({
                    "id": predecessor,
                    "label": node_data.get("label", predecessor),
                    "type": node_data.get("type")
                })
        
        return prerequisites



class Reasoner:
    """
    AI Reasoner that uses KnowledgeGraph.
    """
    def __init__(self):
        self.kg = KnowledgeGraph()
        
    def infer(self, concept_a: str, concept_b: str) -> str:
        """
        Infer relationship between two concepts.
        """
        if not self.kg.graph: return "KG not available."
        
        try:
            path = nx.shortest_path(self.kg.graph, concept_a, concept_b)
            # Construct explanation
            explanation = f"Connection found: " + " -> ".join(path)
            return explanation
        except nx.NetworkXNoPath:
            return f"No direct connection found between {concept_a} and {concept_b}."
        except Exception:
            return "Could not infer relationship."

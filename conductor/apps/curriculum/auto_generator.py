"""
Autonomous Curriculum Generator

Self-evolving syllabus system that:
1. Builds prerequisite graphs from content.
2. Detects knowledge gaps in learner profiles.
3. Auto-generates assessments.
"""

import logging
import uuid
from typing import Dict, List, Any, Set
from dataclasses import dataclass

logger = logging.getLogger(__name__)


@dataclass
class CurriculumNode:
    id: str
    title: str
    prerequisites: List[str]
    difficulty: int # 1-10
    estimated_duration_mins: int


class AutonomousCurriculumEngine:
    """
    Generates and evolves curricula based on content and learner data.
    """
    
    @classmethod
    def build_prerequisite_graph(cls, topics: List[Dict]) -> Dict[str, CurriculumNode]:
        """
        Construct a prerequisite graph from topic metadata.
        """
        graph = {}
        for topic in topics:
            node = CurriculumNode(
                id=topic.get("id", str(uuid.uuid4())),
                title=topic.get("title", "Untitled"),
                prerequisites=topic.get("prerequisites", []),
                difficulty=topic.get("difficulty", 5),
                estimated_duration_mins=topic.get("duration", 30)
            )
            graph[node.id] = node
        return graph

    @classmethod
    def detect_knowledge_gaps(cls, learner_completed: Set[str], graph: Dict[str, CurriculumNode]) -> List[str]:
        """
        Identify topics the learner attempted but missed prerequisites for.
        """
        gaps = []
        for topic_id in learner_completed:
            node = graph.get(topic_id)
            if node:
                for prereq in node.prerequisites:
                    if prereq not in learner_completed:
                        gaps.append(prereq)
        return list(set(gaps))

    @classmethod
    def generate_learning_path(cls, target_topic: str, graph: Dict[str, CurriculumNode], completed: Set[str]) -> List[str]:
        """
        Generate ordered path to reach target_topic.
        """
        path = []
        visited = set()
        
        def dfs(topic_id: str):
            if topic_id in visited or topic_id in completed:
                return
            visited.add(topic_id)
            
            node = graph.get(topic_id)
            if node:
                for prereq in node.prerequisites:
                    dfs(prereq)
                path.append(topic_id)
                
        dfs(target_topic)
        return path

    @classmethod
    def auto_generate_assessment(cls, topic: CurriculumNode) -> Dict[str, Any]:
        """
        Generate assessment skeleton for a topic.
        """
        return {
            "topic_id": topic.id,
            "title": f"Assessment: {topic.title}",
            "question_types": ["mcq", "short_answer", "coding"] if topic.difficulty > 5 else ["mcq", "short_answer"],
            "suggested_questions": max(3, topic.difficulty),
            "time_limit_mins": topic.estimated_duration_mins // 2
        }

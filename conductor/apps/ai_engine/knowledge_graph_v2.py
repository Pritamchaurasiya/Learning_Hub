"""
Knowledge Graph v2

Graph reasoning:
1. Entity linking.
2. Relation extraction.
3. Graph querying.
"""

import random
from typing import List, Dict, Tuple, Optional, Set
from dataclasses import dataclass


@dataclass
class Entity:
    id: str
    name: str
    type: str
    aliases: List[str] = None


@dataclass
class Relation:
    source: str
    target: str
    type: str
    weight: float = 1.0


@dataclass
class Triple:
    subject: Entity
    predicate: str
    object: Entity


class EntityLinker:
    """Link text mentions to entities."""
    def __init__(self):
        self.entities: Dict[str, Entity] = {}
        self.alias_map: Dict[str, str] = {}

    def add_entity(self, entity: Entity):
        self.entities[entity.id] = entity
        self.alias_map[entity.name.lower()] = entity.id
        if entity.aliases:
            for alias in entity.aliases:
                self.alias_map[alias.lower()] = entity.id

    def link(self, text: str) -> List[Tuple[str, Entity, int, int]]:
        mentions = []
        text_lower = text.lower()
        for alias, entity_id in self.alias_map.items():
            idx = text_lower.find(alias)
            if idx >= 0:
                mentions.append((alias, self.entities[entity_id], idx, idx + len(alias)))
        return mentions


class RelationExtractor:
    """Extract relations from text."""
    def __init__(self):
        self.patterns = {
            'is_a': ['is a', 'is an', 'are'],
            'part_of': ['part of', 'belongs to', 'member of'],
            'located_in': ['in', 'at', 'located in'],
            'created_by': ['by', 'created by', 'made by']
        }

    def extract(self, text: str, entities: List[Entity]) -> List[Relation]:
        relations = []
        text_lower = text.lower()
        for i, e1 in enumerate(entities):
            for e2 in entities[i+1:]:
                for rel_type, keywords in self.patterns.items():
                    for kw in keywords:
                        if kw in text_lower:
                            relations.append(Relation(e1.id, e2.id, rel_type, 0.7))
                            break
        return relations


class KnowledgeGraphV2:
    """Knowledge graph with querying."""
    def __init__(self):
        self.entities: Dict[str, Entity] = {}
        self.relations: List[Relation] = []
        self.adjacency: Dict[str, List[Tuple[str, str]]] = {}
        self.linker = EntityLinker()
        self.extractor = RelationExtractor()

    def add_entity(self, entity: Entity):
        self.entities[entity.id] = entity
        self.linker.add_entity(entity)
        if entity.id not in self.adjacency:
            self.adjacency[entity.id] = []

    def add_relation(self, relation: Relation):
        self.relations.append(relation)
        if relation.source not in self.adjacency:
            self.adjacency[relation.source] = []
        self.adjacency[relation.source].append((relation.target, relation.type))

    def query_neighbors(self, entity_id: str, rel_type: Optional[str] = None) -> List[Entity]:
        neighbors = []
        for target_id, rtype in self.adjacency.get(entity_id, []):
            if rel_type is None or rtype == rel_type:
                if target_id in self.entities:
                    neighbors.append(self.entities[target_id])
        return neighbors

    def find_path(self, source: str, target: str, max_depth: int = 5) -> List[str]:
        visited: Set[str] = set()
        queue = [(source, [source])]
        while queue:
            node, path = queue.pop(0)
            if node == target:
                return path
            if len(path) > max_depth or node in visited:
                continue
            visited.add(node)
            for neighbor, _ in self.adjacency.get(node, []):
                queue.append((neighbor, path + [neighbor]))
        return []

    def process_text(self, text: str) -> Dict:
        mentions = self.linker.link(text)
        entities = [m[1] for m in mentions]
        relations = self.extractor.extract(text, entities)
        return {'entities': entities, 'relations': relations, 'mentions': len(mentions)}

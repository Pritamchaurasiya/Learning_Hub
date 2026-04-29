"""
Episodic Memory

Long-term memory systems:
1. Memory storage and retrieval.
2. Temporal indexing.
3. Memory consolidation.
"""

import logging
import random
import math
import time
from typing import List, Dict, Tuple, Optional, Any
from dataclasses import dataclass, field
from collections import OrderedDict

logger = logging.getLogger(__name__)


@dataclass
class Episode:
    id: str
    content: Any
    timestamp: float
    importance: float
    embedding: Optional[List[float]] = None
    metadata: Dict[str, Any] = field(default_factory=dict)
    access_count: int = 0
    last_accessed: float = 0.0


class MemoryStore:
    """Persistent episodic memory storage."""
    def __init__(self, capacity: int = 10000, embedding_dim: int = 64):
        self.capacity = capacity
        self.embedding_dim = embedding_dim
        self.episodes: OrderedDict[str, Episode] = OrderedDict()

    def _compute_embedding(self, content: Any) -> List[float]:
        """Compute embedding for content."""
        text = str(content)
        emb = [0.0] * self.embedding_dim
        for i, char in enumerate(text):
            idx = ord(char) % self.embedding_dim
            emb[idx] += 1.0 / (i + 1)
        
        norm = math.sqrt(sum(e**2 for e in emb)) + 1e-8
        return [e / norm for e in emb]

    def store(self, episode_id: str, content: Any, importance: float = 0.5, 
              metadata: Optional[Dict] = None) -> Episode:
        """Store a new episode."""
        # Check capacity
        if len(self.episodes) >= self.capacity:
            self._evict()
        
        episode = Episode(
            id=episode_id,
            content=content,
            timestamp=time.time(),
            importance=importance,
            embedding=self._compute_embedding(content),
            metadata=metadata or {}
        )
        
        self.episodes[episode_id] = episode
        return episode

    def retrieve(self, episode_id: str) -> Optional[Episode]:
        """Retrieve episode by ID."""
        if episode_id in self.episodes:
            ep = self.episodes[episode_id]
            ep.access_count += 1
            ep.last_accessed = time.time()
            return ep
        return None

    def _evict(self):
        """Evict least important/accessed episode."""
        if not self.episodes:
            return
        
        # Score by importance * recency * access frequency
        now = time.time()
        scores = []
        for eid, ep in self.episodes.items():
            recency = 1.0 / (now - ep.timestamp + 1)
            access_score = math.log(ep.access_count + 1)
            score = ep.importance * recency * access_score
            scores.append((eid, score))
        
        # Evict lowest score
        scores.sort(key=lambda x: x[1])
        del self.episodes[scores[0][0]]

    def search_by_similarity(self, query: Any, k: int = 5) -> List[Episode]:
        """Find k most similar episodes."""
        query_emb = self._compute_embedding(query)
        
        scores = []
        for eid, ep in self.episodes.items():
            if ep.embedding:
                sim = sum(q * e for q, e in zip(query_emb, ep.embedding))
                scores.append((ep, sim))
        
        scores.sort(key=lambda x: -x[1])
        return [ep for ep, _ in scores[:k]]


class TemporalIndex:
    """Index episodes by time ranges."""
    def __init__(self):
        self.time_buckets: Dict[int, List[str]] = {}
        self.bucket_size = 3600  # 1 hour buckets

    def index(self, episode: Episode):
        """Index episode by timestamp."""
        bucket = int(episode.timestamp / self.bucket_size)
        if bucket not in self.time_buckets:
            self.time_buckets[bucket] = []
        self.time_buckets[bucket].append(episode.id)

    def query_range(self, start_time: float, end_time: float) -> List[str]:
        """Query episodes in time range."""
        start_bucket = int(start_time / self.bucket_size)
        end_bucket = int(end_time / self.bucket_size)
        
        results = []
        for bucket in range(start_bucket, end_bucket + 1):
            if bucket in self.time_buckets:
                results.extend(self.time_buckets[bucket])
        
        return results


class MemoryConsolidation:
    """Consolidate and compress memories."""
    def __init__(self, compression_ratio: float = 0.7):
        self.compression_ratio = compression_ratio

    def consolidate(self, episodes: List[Episode]) -> Episode:
        """Consolidate multiple episodes into one."""
        if not episodes:
            raise ValueError("No episodes to consolidate")
        
        # Combine contents
        combined_content = {
            'type': 'consolidated',
            'source_count': len(episodes),
            'summary': [str(ep.content)[:50] for ep in episodes]
        }
        
        # Average importance
        avg_importance = sum(ep.importance for ep in episodes) / len(episodes)
        
        # Earliest timestamp
        earliest = min(ep.timestamp for ep in episodes)
        
        return Episode(
            id=f"consolidated_{int(time.time())}",
            content=combined_content,
            timestamp=earliest,
            importance=avg_importance * 1.2,  # Boost importance
            metadata={'consolidated': True, 'source_ids': [ep.id for ep in episodes]}
        )

    def prune_similar(self, episodes: List[Episode], threshold: float = 0.9) -> List[Episode]:
        """Remove highly similar episodes."""
        if len(episodes) <= 1:
            return episodes
        
        kept = [episodes[0]]
        
        for ep in episodes[1:]:
            is_similar = False
            for kept_ep in kept:
                if ep.embedding and kept_ep.embedding:
                    sim = sum(a * b for a, b in zip(ep.embedding, kept_ep.embedding))
                    if sim > threshold:
                        is_similar = True
                        break
            
            if not is_similar:
                kept.append(ep)
        
        return kept


class EpisodicMemorySystem:
    """Complete episodic memory system."""
    def __init__(self, capacity: int = 10000):
        self.store = MemoryStore(capacity=capacity)
        self.temporal_index = TemporalIndex()
        self.consolidation = MemoryConsolidation()
        self.episode_counter = 0

    def remember(self, content: Any, importance: float = 0.5, 
                 metadata: Optional[Dict] = None) -> str:
        """Store a new memory."""
        self.episode_counter += 1
        episode_id = f"ep_{self.episode_counter}_{int(time.time())}"
        
        episode = self.store.store(episode_id, content, importance, metadata)
        self.temporal_index.index(episode)
        
        return episode_id

    def recall(self, query: Any, k: int = 5) -> List[Episode]:
        """Recall relevant memories."""
        return self.store.search_by_similarity(query, k)

    def recall_by_time(self, start_time: float, end_time: float) -> List[Episode]:
        """Recall memories from time range."""
        episode_ids = self.temporal_index.query_range(start_time, end_time)
        return [self.store.retrieve(eid) for eid in episode_ids if self.store.retrieve(eid)]

    def consolidate_old_memories(self, age_threshold: float = 86400):
        """Consolidate memories older than threshold."""
        now = time.time()
        old_episodes = [
            ep for ep in self.store.episodes.values()
            if now - ep.timestamp > age_threshold
        ]
        
        if len(old_episodes) < 3:
            return
        
        # Group and consolidate
        pruned = self.consolidation.prune_similar(old_episodes)
        if len(pruned) < len(old_episodes):
            consolidated = self.consolidation.consolidate(old_episodes)
            
            # Remove old, add consolidated
            for ep in old_episodes:
                del self.store.episodes[ep.id]
            
            self.store.episodes[consolidated.id] = consolidated

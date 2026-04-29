"""
Embedding Models

Dense retrieval embeddings:
1. Sentence embeddings.
2. Contrastive training.
3. Matryoshka representations.
"""

import logging
import random
import math
from typing import List, Dict, Tuple, Optional, Any
from dataclasses import dataclass

logger = logging.getLogger(__name__)


@dataclass
class EmbeddingResult:
    embedding: List[float]
    token_embeddings: Optional[List[List[float]]]
    attention_mask: Optional[List[int]]


class TokenEmbedder:
    """Token-level embeddings."""
    def __init__(self, vocab_size: int = 50000, hidden_dim: int = 768):
        self.vocab_size = vocab_size
        self.hidden_dim = hidden_dim
        # Simulated embedding table
        self.embeddings: Dict[int, List[float]] = {}

    def _get_token_embedding(self, token_id: int) -> List[float]:
        """Get embedding for token ID."""
        if token_id not in self.embeddings:
            self.embeddings[token_id] = [
                random.gauss(0, 0.1) for _ in range(self.hidden_dim)
            ]
        return self.embeddings[token_id]

    def embed(self, token_ids: List[int]) -> List[List[float]]:
        """Embed tokens."""
        return [self._get_token_embedding(tid) for tid in token_ids]


class SentenceEncoder:
    """Sentence-level encoder with pooling."""
    def __init__(self, hidden_dim: int = 768, n_layers: int = 6):
        self.hidden_dim = hidden_dim
        self.n_layers = n_layers
        self.token_embedder = TokenEmbedder(hidden_dim=hidden_dim)

    def _mean_pooling(
        self, 
        token_embeddings: List[List[float]], 
        attention_mask: List[int]
    ) -> List[float]:
        """Mean pooling over token embeddings."""
        pooled = [0.0] * self.hidden_dim
        count = sum(attention_mask)
        
        if count == 0:
            return pooled
        
        for emb, mask in zip(token_embeddings, attention_mask):
            if mask == 1:
                for i, e in enumerate(emb):
                    pooled[i] += e / count
        
        return pooled

    def _cls_pooling(self, token_embeddings: List[List[float]]) -> List[float]:
        """CLS token pooling."""
        if token_embeddings:
            return token_embeddings[0]
        return [0.0] * self.hidden_dim

    def _normalize(self, embedding: List[float]) -> List[float]:
        """L2 normalize embedding."""
        norm = math.sqrt(sum(e ** 2 for e in embedding)) + 1e-8
        return [e / norm for e in embedding]

    def encode(
        self, 
        text: str, 
        pooling: str = 'mean',
        normalize: bool = True
    ) -> EmbeddingResult:
        """Encode text to embedding."""
        # Tokenize (simplified)
        words = text.lower().split()
        token_ids = [hash(word) % 50000 for word in words]
        attention_mask = [1] * len(token_ids)
        
        # Get token embeddings
        token_embeddings = self.token_embedder.embed(token_ids)
        
        # Apply transformer layers (simplified)
        for _ in range(min(2, self.n_layers)):
            # Self-attention simulation
            for i in range(len(token_embeddings)):
                token_embeddings[i] = [
                    e * 0.9 + random.gauss(0, 0.05) 
                    for e in token_embeddings[i]
                ]
        
        # Pooling
        if pooling == 'mean':
            embedding = self._mean_pooling(token_embeddings, attention_mask)
        else:
            embedding = self._cls_pooling(token_embeddings)
        
        # Normalize
        if normalize:
            embedding = self._normalize(embedding)
        
        return EmbeddingResult(
            embedding=embedding,
            token_embeddings=token_embeddings,
            attention_mask=attention_mask
        )


class ContrastiveTrainer:
    """Contrastive learning for embeddings."""
    def __init__(self, temperature: float = 0.05):
        self.temperature = temperature

    def info_nce_loss(
        self, 
        anchor: List[float], 
        positive: List[float], 
        negatives: List[List[float]]
    ) -> float:
        """Compute InfoNCE loss."""
        # Positive similarity
        pos_sim = sum(a * p for a, p in zip(anchor, positive)) / self.temperature
        
        # Negative similarities
        neg_sims = []
        for neg in negatives:
            sim = sum(a * n for a, n in zip(anchor, neg)) / self.temperature
            neg_sims.append(sim)
        
        # Log-sum-exp for denominator
        all_sims = [pos_sim] + neg_sims
        max_sim = max(all_sims)
        log_sum_exp = max_sim + math.log(sum(math.exp(s - max_sim) for s in all_sims))
        
        # Loss
        loss = log_sum_exp - pos_sim
        return loss

    def hard_negative_mining(
        self, 
        anchor: List[float], 
        candidates: List[List[float]], 
        n_hard: int = 5
    ) -> List[List[float]]:
        """Select hard negatives."""
        # Compute similarities
        scored = []
        for cand in candidates:
            sim = sum(a * c for a, c in zip(anchor, cand))
            scored.append((cand, sim))
        
        # Sort by similarity (descending) - hardest first
        scored.sort(key=lambda x: -x[1])
        
        return [cand for cand, _ in scored[:n_hard]]


class MatryoshkaEmbedder:
    """Matryoshka representation learning."""
    def __init__(self, full_dim: int = 768, dimensions: List[int] = None):
        self.full_dim = full_dim
        self.dimensions = dimensions or [64, 128, 256, 512, 768]
        self.encoder = SentenceEncoder(hidden_dim=full_dim)

    def embed(
        self, 
        text: str, 
        dim: Optional[int] = None
    ) -> EmbeddingResult:
        """Embed with optional dimension truncation."""
        result = self.encoder.encode(text)
        
        if dim and dim in self.dimensions:
            # Truncate to specified dimension
            result.embedding = result.embedding[:dim]
            # Re-normalize
            norm = math.sqrt(sum(e ** 2 for e in result.embedding)) + 1e-8
            result.embedding = [e / norm for e in result.embedding]
        
        return result

    def embed_multi_scale(self, text: str) -> Dict[int, List[float]]:
        """Embed at multiple scales."""
        full_result = self.encoder.encode(text)
        
        embeddings = {}
        for dim in self.dimensions:
            truncated = full_result.embedding[:dim]
            # Normalize
            norm = math.sqrt(sum(e ** 2 for e in truncated)) + 1e-8
            embeddings[dim] = [e / norm for e in truncated]
        
        return embeddings


class EmbeddingModel:
    """Complete embedding model."""
    def __init__(self, hidden_dim: int = 768, use_matryoshka: bool = True):
        self.hidden_dim = hidden_dim
        self.use_matryoshka = use_matryoshka
        
        if use_matryoshka:
            self.embedder = MatryoshkaEmbedder(full_dim=hidden_dim)
        else:
            self.embedder = SentenceEncoder(hidden_dim=hidden_dim)
        
        self.trainer = ContrastiveTrainer()

    def encode(
        self, 
        texts: List[str], 
        dim: Optional[int] = None
    ) -> List[List[float]]:
        """Encode multiple texts."""
        results = []
        for text in texts:
            if isinstance(self.embedder, MatryoshkaEmbedder):
                result = self.embedder.embed(text, dim)
            else:
                result = self.embedder.encode(text)
            results.append(result.embedding)
        return results

    def similarity(self, text1: str, text2: str) -> float:
        """Compute similarity between texts."""
        emb1 = self.encode([text1])[0]
        emb2 = self.encode([text2])[0]
        return sum(a * b for a, b in zip(emb1, emb2))

    def semantic_search(
        self, 
        query: str, 
        documents: List[str], 
        top_k: int = 5
    ) -> List[Tuple[int, float]]:
        """Semantic search over documents."""
        query_emb = self.encode([query])[0]
        doc_embs = self.encode(documents)
        
        # Compute similarities
        scores = []
        for i, doc_emb in enumerate(doc_embs):
            sim = sum(q * d for q, d in zip(query_emb, doc_emb))
            scores.append((i, sim))
        
        # Sort by score
        scores.sort(key=lambda x: -x[1])
        return scores[:top_k]

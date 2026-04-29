"""
Reranking Models

Cross-encoder reranking:
1. Pairwise scoring.
2. Listwise ranking.
3. Diversified reranking.
"""

import logging
import random
import math
from typing import List, Dict, Tuple, Optional, Any
from dataclasses import dataclass

logger = logging.getLogger(__name__)


@dataclass
class RankingCandidate:
    id: str
    text: str
    initial_score: float
    rerank_score: float = 0.0
    features: Optional[List[float]] = None


@dataclass
class RerankResult:
    candidates: List[RankingCandidate]
    query: str
    method: str


class CrossEncoder:
    """Cross-encoder for pairwise scoring."""
    def __init__(self, hidden_dim: int = 768):
        self.hidden_dim = hidden_dim

    def _encode_pair(self, query: str, document: str) -> List[float]:
        """Encode query-document pair."""
        combined = f"{query} [SEP] {document}"
        
        # Simple hash-based encoding
        embedding = [0.0] * self.hidden_dim
        for i, char in enumerate(combined):
            idx = ord(char) % self.hidden_dim
            embedding[idx] += 1.0 / (i + 1)
        
        # Normalize
        norm = math.sqrt(sum(e ** 2 for e in embedding)) + 1e-8
        return [e / norm for e in embedding]

    def score(self, query: str, document: str) -> float:
        """Score query-document pair."""
        encoding = self._encode_pair(query, document)
        
        # Compute relevance score
        # Simple weighted sum (in practice, MLP head)
        score = sum(encoding[:32]) / 32  # Use first 32 dims
        
        # Sigmoid for probability
        return 1 / (1 + math.exp(-score * 5))

    def score_batch(
        self, 
        query: str, 
        documents: List[str]
    ) -> List[float]:
        """Score multiple documents."""
        return [self.score(query, doc) for doc in documents]


class PairwiseRanker:
    """Pairwise comparison ranking."""
    def __init__(self):
        self.cross_encoder = CrossEncoder()

    def compare(
        self, 
        query: str, 
        doc_a: str, 
        doc_b: str
    ) -> int:
        """Compare two documents. Returns 1 if A > B, -1 if B > A, 0 if tie."""
        score_a = self.cross_encoder.score(query, doc_a)
        score_b = self.cross_encoder.score(query, doc_b)
        
        if abs(score_a - score_b) < 0.05:  # Tie threshold
            return 0
        return 1 if score_a > score_b else -1

    def rank_pairwise(
        self, 
        query: str, 
        documents: List[str]
    ) -> List[Tuple[int, float]]:
        """Rank documents using pairwise comparisons."""
        n = len(documents)
        wins = [0] * n
        
        for i in range(n):
            for j in range(i + 1, n):
                result = self.compare(query, documents[i], documents[j])
                if result == 1:
                    wins[i] += 1
                elif result == -1:
                    wins[j] += 1
        
        # Sort by wins
        indexed = [(i, wins[i]) for i in range(n)]
        indexed.sort(key=lambda x: -x[1])
        
        return indexed


class ListwiseRanker:
    """Listwise ranking with attention."""
    def __init__(self, hidden_dim: int = 256):
        self.hidden_dim = hidden_dim
        self.cross_encoder = CrossEncoder(hidden_dim=hidden_dim)

    def _compute_attention(
        self, 
        query_encoding: List[float], 
        doc_encodings: List[List[float]]
    ) -> List[float]:
        """Compute attention scores over documents."""
        scores = []
        for doc_enc in doc_encodings:
            score = sum(q * d for q, d in zip(query_encoding[:64], doc_enc[:64]))
            scores.append(score)
        
        # Softmax
        max_score = max(scores) if scores else 0
        exp_scores = [math.exp(s - max_score) for s in scores]
        sum_exp = sum(exp_scores)
        
        return [e / sum_exp for e in exp_scores]

    def rank(
        self, 
        query: str, 
        documents: List[str]
    ) -> List[Tuple[int, float]]:
        """Rank documents with listwise model."""
        # Encode query
        query_enc = [0.0] * self.hidden_dim
        for i, char in enumerate(query):
            idx = ord(char) % self.hidden_dim
            query_enc[idx] += 1.0 / (i + 1)
        
        # Encode documents
        doc_encs = []
        for doc in documents:
            enc = [0.0] * self.hidden_dim
            for i, char in enumerate(doc):
                idx = ord(char) % self.hidden_dim
                enc[idx] += 1.0 / (i + 1)
            doc_encs.append(enc)
        
        # Compute attention-based ranking
        scores = self._compute_attention(query_enc, doc_encs)
        
        # Cross-encoder refinement
        ce_scores = self.cross_encoder.score_batch(query, documents)
        
        # Combine scores
        final_scores = [
            0.7 * ce + 0.3 * attn 
            for ce, attn in zip(ce_scores, scores)
        ]
        
        # Sort
        indexed = [(i, final_scores[i]) for i in range(len(documents))]
        indexed.sort(key=lambda x: -x[1])
        
        return indexed


class DiversifiedReranker:
    """Rerank with diversity (MMR)."""
    def __init__(self, lambda_param: float = 0.7):
        self.lambda_param = lambda_param
        self.cross_encoder = CrossEncoder()

    def _document_similarity(self, doc1: str, doc2: str) -> float:
        """Compute document-document similarity."""
        words1 = set(doc1.lower().split())
        words2 = set(doc2.lower().split())
        
        intersection = len(words1 & words2)
        union = len(words1 | words2)
        
        return intersection / union if union > 0 else 0

    def rerank_mmr(
        self, 
        query: str, 
        documents: List[str], 
        top_k: int = 10
    ) -> List[Tuple[int, float]]:
        """Maximal Marginal Relevance reranking."""
        if not documents:
            return []
        
        # Compute relevance scores
        relevance_scores = self.cross_encoder.score_batch(query, documents)
        
        selected = []
        remaining = list(range(len(documents)))
        
        while len(selected) < top_k and remaining:
            best_idx = -1
            best_score = float('-inf')
            
            for idx in remaining:
                # Relevance term
                rel_score = relevance_scores[idx]
                
                # Diversity term (max similarity to selected)
                if selected:
                    max_sim = max(
                        self._document_similarity(documents[idx], documents[s])
                        for s in selected
                    )
                else:
                    max_sim = 0
                
                # MMR score
                mmr_score = (
                    self.lambda_param * rel_score - 
                    (1 - self.lambda_param) * max_sim
                )
                
                if mmr_score > best_score:
                    best_score = mmr_score
                    best_idx = idx
            
            if best_idx >= 0:
                selected.append(best_idx)
                remaining.remove(best_idx)
        
        return [(idx, relevance_scores[idx]) for idx in selected]


class Reranker:
    """Complete reranking system."""
    def __init__(self, method: str = 'cross_encoder'):
        self.method = method
        self.cross_encoder = CrossEncoder()
        self.pairwise = PairwiseRanker()
        self.listwise = ListwiseRanker()
        self.diversified = DiversifiedReranker()

    def rerank(
        self, 
        query: str, 
        candidates: List[RankingCandidate],
        diversify: bool = False,
        top_k: int = 10
    ) -> RerankResult:
        """Rerank candidates."""
        documents = [c.text for c in candidates]
        
        if diversify:
            rankings = self.diversified.rerank_mmr(query, documents, top_k)
            method = 'mmr'
        elif self.method == 'pairwise':
            rankings = self.pairwise.rank_pairwise(query, documents)[:top_k]
            method = 'pairwise'
        elif self.method == 'listwise':
            rankings = self.listwise.rank(query, documents)[:top_k]
            method = 'listwise'
        else:
            scores = self.cross_encoder.score_batch(query, documents)
            rankings = sorted(enumerate(scores), key=lambda x: -x[1])[:top_k]
            method = 'cross_encoder'
        
        # Update candidate scores
        reranked_candidates = []
        for idx, score in rankings:
            candidate = candidates[idx]
            candidate.rerank_score = score
            reranked_candidates.append(candidate)
        
        return RerankResult(
            candidates=reranked_candidates,
            query=query,
            method=method
        )

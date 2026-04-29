"""
Hybrid Search

BM25 + Dense fusion:
1. Sparse retrieval.
2. Dense retrieval.
3. Score fusion.
"""

import math
import random
from typing import List, Dict, Tuple, Optional
from dataclasses import dataclass
from collections import Counter


@dataclass
class SearchResult:
    doc_id: str
    text: str
    bm25_score: float
    dense_score: float
    fused_score: float


class BM25:
    """BM25 sparse retrieval."""
    def __init__(self, k1: float = 1.5, b: float = 0.75):
        self.k1 = k1
        self.b = b
        self.docs: Dict[str, List[str]] = {}
        self.doc_lens: Dict[str, int] = {}
        self.avg_len: float = 0
        self.idf: Dict[str, float] = {}

    def add_doc(self, doc_id: str, text: str):
        tokens = text.lower().split()
        self.docs[doc_id] = tokens
        self.doc_lens[doc_id] = len(tokens)
        self._update_idf()

    def _update_idf(self):
        N = len(self.docs)
        self.avg_len = sum(self.doc_lens.values()) / N if N else 0
        df: Dict[str, int] = Counter()
        for tokens in self.docs.values():
            for t in set(tokens):
                df[t] += 1
        for term, count in df.items():
            self.idf[term] = math.log((N - count + 0.5) / (count + 0.5) + 1)

    def search(self, query: str, top_k: int = 10) -> List[Tuple[str, float]]:
        query_terms = query.lower().split()
        scores = []
        for doc_id, tokens in self.docs.items():
            tf = Counter(tokens)
            score = 0
            doc_len = self.doc_lens[doc_id]
            for term in query_terms:
                if term in tf:
                    freq = tf[term]
                    idf = self.idf.get(term, 0)
                    numerator = freq * (self.k1 + 1)
                    denominator = freq + self.k1 * (1 - self.b + self.b * doc_len / self.avg_len)
                    score += idf * numerator / denominator
            scores.append((doc_id, score))
        scores.sort(key=lambda x: -x[1])
        return scores[:top_k]


class DenseRetriever:
    """Dense embedding retrieval."""
    def __init__(self, dim: int = 128):
        self.dim = dim
        self.docs: Dict[str, List[float]] = {}

    def _embed(self, text: str) -> List[float]:
        emb = [0.0] * self.dim
        for i, c in enumerate(text.lower()):
            emb[ord(c) % self.dim] += 1.0 / (i + 1)
        norm = math.sqrt(sum(e*e for e in emb)) + 1e-8
        return [e / norm for e in emb]

    def add_doc(self, doc_id: str, text: str):
        self.docs[doc_id] = self._embed(text)

    def search(self, query: str, top_k: int = 10) -> List[Tuple[str, float]]:
        q_emb = self._embed(query)
        scores = []
        for doc_id, d_emb in self.docs.items():
            sim = sum(q * d for q, d in zip(q_emb, d_emb))
            scores.append((doc_id, sim))
        scores.sort(key=lambda x: -x[1])
        return scores[:top_k]


class HybridSearch:
    """Hybrid BM25 + Dense search."""
    def __init__(self, alpha: float = 0.5):
        self.alpha = alpha
        self.bm25 = BM25()
        self.dense = DenseRetriever()
        self.texts: Dict[str, str] = {}

    def add_document(self, doc_id: str, text: str):
        self.texts[doc_id] = text
        self.bm25.add_doc(doc_id, text)
        self.dense.add_doc(doc_id, text)

    def search(self, query: str, top_k: int = 10) -> List[SearchResult]:
        bm25_results = dict(self.bm25.search(query, top_k * 2))
        dense_results = dict(self.dense.search(query, top_k * 2))
        
        all_docs = set(bm25_results.keys()) | set(dense_results.keys())
        results = []
        for doc_id in all_docs:
            bm25_s = bm25_results.get(doc_id, 0)
            dense_s = dense_results.get(doc_id, 0)
            fused = self.alpha * bm25_s + (1 - self.alpha) * dense_s
            results.append(SearchResult(doc_id, self.texts.get(doc_id, ''), bm25_s, dense_s, fused))
        
        results.sort(key=lambda r: -r.fused_score)
        return results[:top_k]

    def rewrite_query(self, query: str) -> str:
        # Simple expansion
        expansions = {'find': 'search locate', 'get': 'retrieve obtain'}
        for word, expansion in expansions.items():
            if word in query.lower():
                return query + ' ' + expansion
        return query

"""
Retrieval-Augmented Generation (RAG)

Knowledge retrieval for LLM augmentation:
1. Vector store for document embeddings (Persistent).
2. Semantic search and retrieval using AIClient embeddings.
3. Context injection into prompts.
"""

import logging
import json
import os
import math
from typing import List, Dict, Tuple, Optional
from dataclasses import dataclass, asdict
from apps.ai_engine.ai_client import AIClient
from django.conf import settings

logger = logging.getLogger(__name__)


@dataclass
class Document:
    id: str
    content: str
    embedding: List[float]
    metadata: Dict


class VectorStore:
    """Persistent vector store for document embeddings."""
    def __init__(self, dim: int = 384, persist_path: str = "vector_store.json"):
        self.dim = dim
        self.persist_path = os.path.join(settings.BASE_DIR, "data", persist_path)
        self.documents: Dict[str, Document] = {}
        self._ensure_data_dir()
        self.load()

    def _ensure_data_dir(self):
        os.makedirs(os.path.dirname(self.persist_path), exist_ok=True)

    def _cosine_similarity(self, a: List[float], b: List[float]) -> float:
        if not a or not b:
            return 0.0
        dot = sum(ai * bi for ai, bi in zip(a, b))
        norm_a = math.sqrt(sum(ai**2 for ai in a)) + 1e-8
        norm_b = math.sqrt(sum(bi**2 for bi in b)) + 1e-8
        return dot / (norm_a * norm_b)

    def add(self, doc_id: str, content: str, embedding: List[float], metadata: Optional[Dict] = None):
        """Add document to store and save."""
        self.documents[doc_id] = Document(
            id=doc_id,
            content=content,
            embedding=embedding,
            metadata=metadata or {}
        )
        self.save()

    def search(self, query_embedding: List[float], top_k: int = 5) -> List[Tuple[Document, float]]:
        """Search for most similar documents."""
        if not self.documents:
            return []
            
        scores = []
        for doc in self.documents.values():
            sim = self._cosine_similarity(query_embedding, doc.embedding)
            scores.append((doc, sim))
        
        # Sort by similarity descending
        scores.sort(key=lambda x: -x[1])
        return scores[:top_k]

    def save(self):
        """Save store to disk."""
        data = {
            doc_id: asdict(doc) 
            for doc_id, doc in self.documents.items()
        }
        try:
            with open(self.persist_path, 'w', encoding='utf-8') as f:
                json.dump(data, f)
        except Exception as e:
            logger.error(f"Failed to save vector store: {e}")

    def load(self):
        """Load store from disk."""
        if not os.path.exists(self.persist_path):
            return
            
        try:
            with open(self.persist_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
                for doc_id, doc_data in data.items():
                    self.documents[doc_id] = Document(**doc_data)
        except Exception as e:
            logger.error(f"Failed to load vector store: {e}")


class SemanticSearch:
    """Semantic search over document corpus using AIClient."""
    def __init__(self):
        # AIClient uses all-MiniLM-L6-v2 which creates 384-dim embeddings
        self.vector_store = VectorStore(dim=384)

    def index_document(self, content: str, metadata: Optional[Dict] = None) -> str:
        """Index a document using real embeddings."""
        doc_id = f"doc_{len(self.vector_store.documents)}"
        
        # enhanced: Use real embeddings from AIClient
        try:
            embedding = AIClient.generate_embedding(content)
        except Exception as e:
            logger.error(f"Embedding generation failed: {e}")
            embedding = [0.0] * 384  # Fallback zero vector
            
        self.vector_store.add(doc_id, content, embedding, metadata)
        return doc_id

    def search(self, query: str, top_k: int = 5) -> List[Tuple[str, float]]:
        """Search for relevant documents."""
        try:
            query_embedding = AIClient.generate_embedding(query)
        except Exception as e:
            logger.error(f"Query embedding failed: {e}")
            return []
            
        results = self.vector_store.search(query_embedding, top_k)
        return [(doc.content, score) for doc, score in results]


class RAGPipeline:
    """Complete RAG pipeline with real AI integration."""
    def __init__(self):
        self.search = SemanticSearch()
        self.context_window = 3

    def add_knowledge(self, documents: List[str]):
        """Add documents to knowledge base."""
        for doc in documents:
            self.search.index_document(doc)

    def retrieve_context(self, query: str) -> str:
        """Retrieve relevant context for query (Hybrid: Vector + Graph)."""
        # 1. Vector Search
        results = self.search.search(query, self.context_window)
        
        context_parts = []
        for content, score in results:
            if score > 0.3:
                context_parts.append(f"[Document Source]: {content}")
        
        # 2. Graph Search (Entity Extraction Heuristic)
        # In a real system, use NER model. Here, simple keyword match
        try:
            from apps.ai_engine.knowledge_graph import KnowledgeGraph
            kg = KnowledgeGraph()
            
            # Simple entity extraction (heuristic)
            words = query.split()
            potential_entities = [w for w in words if len(w) > 4] # Naive
            
            kg_context = kg.get_subgraph_context(potential_entities)
            if kg_context:
                context_parts.append(f"[Knowledge Graph]:\n{kg_context}")
                
        except Exception as e:
            logger.warning(f"KG Retrieval failed: {e}")
        
        return "\n\n".join(context_parts)

    def augmented_prompt(self, query: str) -> str:
        """Create augmented prompt with retrieved context."""
        context = self.retrieve_context(query)
        
        if context:
            return f"""Context information is below.
---------------------
{context}
---------------------
Given the context information and not prior knowledge, answer the query.
Query: {query}
Answer:"""
        else:
            return query  # Fallback to direct query if no context

    def generate(self, query: str) -> str:
        """Generate response using Gemini with RAG."""
        prompt = self.augmented_prompt(query)
        
        try:
            # Reusing generate_dsa_chat_response logic but for general queries
            response = AIClient.generate_dsa_chat_response(prompt.split('Query:')[0], query)
            return response
        except Exception as e:
            logger.error(f"Generation failed: {e}")
            return "I encountered an error generating the response."

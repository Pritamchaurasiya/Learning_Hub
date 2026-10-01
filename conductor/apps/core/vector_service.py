
import os
import logging
from typing import List
from django.conf import settings
from google import genai
from google.genai import types

logger = logging.getLogger(__name__)

class VectorService:
    """
    Service for Vector Embeddings and Semantic Search.
    Uses Google Gemini 'text-embedding-004' model.
    """
    _client = None

    @classmethod
    def _get_client(cls):
        if not cls._client:
            api_key = os.getenv("GEMINI_API_KEY")
            if api_key:
                cls._client = genai.Client(api_key=api_key)
            else:
                logger.warning("GEMINI_API_KEY is missing from environment; vector generation unavailable.")
        return cls._client

    @classmethod
    def get_embedding(cls, text: str) -> List[float]:
        """
        Generate embedding for a single text.
        """
        if not text:
            return []
            
        try:
            client = cls._get_client()
            response = client.models.embed_content(
                model="text-embedding-004",
                contents=text,
            )
            return response.embeddings[0].values
        except Exception as e:
            logger.error(f"Error generating embedding: {e}")
            return []

    @classmethod
    def semantic_search(cls, model_class, query_text: str, limit: int = 5):
        """
        Perform semantic search using cosine distance (L2 distance approximation in pgvector).
        Falls back to in-memory cosine similarity when database vector extensions are unavailable (e.g., SQLite dev).
        """
        embedding = cls.get_embedding(query_text)
        if not embedding:
            return model_class.objects.none()

        # 1. Attempt database-level pgvector indexing if available
        try:
            from pgvector.django import L2Distance
            return list(model_class.objects.order_by(
                L2Distance('embedding', embedding)
            )[:limit])
        except Exception as db_err:
            logger.debug(f"pgvector query skipped/failed ({db_err}), falling back to in-memory cosine distance.")

        # 2. In-memory cosine similarity fallback
        try:
            import math
            records = list(model_class.objects.exclude(embedding__isnull=True)[:100])
            
            def cosine_similarity(v1: List[float], v2: List[float]) -> float:
                if not v1 or not v2 or len(v1) != len(v2):
                    return 0.0
                dot = sum(a * b for a, b in zip(v1, v2))
                norm1 = math.sqrt(sum(a * a for a in v1))
                norm2 = math.sqrt(sum(b * b for b in v2))
                if norm1 == 0 or norm2 == 0:
                    return 0.0
                return dot / (norm1 * norm2)

            scored = []
            for item in records:
                item_emb = item.embedding
                if isinstance(item_emb, list) and len(item_emb) > 0:
                    score = cosine_similarity(embedding, item_emb)
                    scored.append((score, item))

            scored.sort(key=lambda x: x[0], reverse=True)
            return [item for _, item in scored[:limit]]
        except Exception as fallback_err:
            logger.error(f"In-memory vector fallback error: {fallback_err}")
            return list(model_class.objects.all()[:limit])


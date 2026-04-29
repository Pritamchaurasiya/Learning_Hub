
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
        Requires 'embedding' vector field on the model.
        """
        from django.db.models import F
        from pgvector.django import L2Distance

        embedding = cls.get_embedding(query_text)
        if not embedding:
            return model_class.objects.none()

        # Assuming the model has a VectorField named 'embedding'
        return model_class.objects.order_by(
            L2Distance('embedding', embedding)
        )[:limit]

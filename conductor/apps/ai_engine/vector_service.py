
import logging
from typing import List, Optional
from django.db.models import QuerySet
from pgvector.django import L2Distance, CosineDistance

from apps.ai_engine.ai_client import AIClient
from apps.ai_engine.models import CourseEmbedding

logger = logging.getLogger(__name__)

class VectorService:
    """
    RAG Service: Handles Ingestion (Storing embeddings) and Retrieval (Search).
    Uses Google Gemini 'text-embedding-004' (768 dims).
    """

    @classmethod
    def create_vector_index(cls, table_name, field_name="embedding"):
        """
        Creates an IVFFlat index for high-performance approximate nearest neighbor search.
        Critical for scaling 'Neural Memory' beyond 1M vectors.
        """
        from django.db import connection
        import logging
        logger = logging.getLogger(__name__)
        
        with connection.cursor() as cursor:
            # IVFFlat Index creation
            # lists=100 is a tuning parameter (sqrt(rows))
            sql = f"""
            CREATE INDEX IF NOT EXISTS {table_name}_{field_name}_idx 
            ON {table_name} 
            USING ivfflat ({field_name} vector_l2_ops);
            
            CREATE INDEX IF NOT EXISTS {table_name}_{field_name}_cosine_idx 
            ON {table_name} 
            USING ivfflat ({field_name} vector_cosine_ops);
            """
            cursor.execute(sql)
            logger.info(f"🧠 Neural Memory Indexes created on {table_name}")

    @staticmethod
    def store_content_embedding(content_object, text_chunk: str) -> Optional[CourseEmbedding]:
        """
        Generate embedding for a piece of content and save to DB.
        """
        if not text_chunk:
            return None

        vector = AIClient.generate_embedding(text_chunk)
        if not vector:
            logger.error("Failed to generate embedding from AI Provider.")
            return None

        try:
            embedding_obj = CourseEmbedding.objects.create(
                content_object=content_object,
                chunk_text=text_chunk,
                embedding=vector
            )
            return embedding_obj
        except Exception as e:
            logger.error(f"DB Error saving embedding: {str(e)}")
            return None

    @staticmethod
    def _compute_cosine_sim(vec1: List[float], vec2: List[float]) -> float:
        """Helper to compute cosine similarity between two vectors natively in Python."""
        import math
        dot_product = sum(a * b for a, b in zip(vec1, vec2))
        norm_a = math.sqrt(sum(a * a for a in vec1))
        norm_b = math.sqrt(sum(b * b for b in vec2))
        if norm_a == 0 or norm_b == 0:
            return 0.0
        return dot_product / (norm_a * norm_b)

    @classmethod
    def search_similar_content(cls, query: str, top_k: int = 5, distance_metric: str = "cosine", threshold: float = 0.6, use_mmr: bool = True, lambda_mult: float = 0.5) -> List[CourseEmbedding]:
        """
        Semantic Search: Find content chunks closest to the query using pgvector.
        If use_mmr is True, enforces Maximal Marginal Relevance to ensure returned documents
        are both relevant AND diverse from each other (eliminates redundant context loops in RAG).
        """
        query_vector = AIClient.generate_embedding(query)
        if not query_vector:
            return []

        # Fetch a larger pool if using MMR to allow for diversity pruning
        fetch_k = top_k * 4 if use_mmr else top_k

        try:
            if distance_metric == "cosine":
                distance_op = CosineDistance('embedding', query_vector)
            else:
                distance_op = L2Distance('embedding', query_vector)
                
            # Database stage: filter by threshold and order by absolute relevance
            candidates_qs = CourseEmbedding.objects.annotate(
                distance=distance_op
            ).filter(
                distance__lt=threshold
            ).order_by('distance')[:fetch_k]
            
            candidates = list(candidates_qs)
            
            if not candidates or not use_mmr or len(candidates) <= 1:
                return candidates[:top_k]
                
            # MMR Algorithm (Maximal Marginal Relevance) Stage
            # lambda_mult = 1.0 (maximize relevance), lambda_mult = 0.0 (maximize diversity)
            selected = [candidates.pop(0)] # Start with the absolute most relevant doc
            
            while len(selected) < top_k and candidates:
                best_score = -float('inf')
                best_idx = -1
                
                for i, candidate in enumerate(candidates):
                    # In pgvector CosineDistance, distance is (1 - cosine_similarity). So similarity is (1 - distance)
                    sim_to_query = 1.0 - candidate.distance 
                    
                    # Compute similarity to completely chosen vectors to calculate redundancy
                    candidate_vec = getattr(candidate, 'embedding', [])
                    if isinstance(candidate_vec, str):
                        import json
                        try:
                            candidate_vec = json.loads(candidate_vec)
                        except:
                            candidate_vec = []
                            
                    max_sim_to_selected = 0.0
                    for sel in selected:
                        sel_vec = getattr(sel, 'embedding', [])
                        if isinstance(sel_vec, str):
                            import json
                            try:
                                sel_vec = json.loads(sel_vec)
                            except:
                                sel_vec = []
                        if sel_vec and candidate_vec:
                            sim = cls._compute_cosine_sim(candidate_vec, sel_vec)
                            max_sim_to_selected = max(max_sim_to_selected, sim)
                    
                    # MMR Equation
                    mmr_score = (lambda_mult * sim_to_query) - ((1.0 - lambda_mult) * max_sim_to_selected)
                    
                    if mmr_score > best_score:
                        best_score = mmr_score
                        best_idx = i
                        
                if best_idx != -1:
                    selected.append(candidates.pop(best_idx))
                else:
                    break
                    
            return selected
            
        except Exception as e:
            logger.error(f"Vector search failed: {str(e)}")
            return []

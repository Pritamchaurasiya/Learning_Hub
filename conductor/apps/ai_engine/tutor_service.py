import os
import logging
from functools import lru_cache
from google import genai
from django.conf import settings
from typing import Optional, Generator

# Configure logging
logger = logging.getLogger(__name__)


class TutorService:
    """
    AI Tutor service for answering questions based on learning modules.
    
    This service uses the Google GenAI SDK to provide answers to questions
    based on the content of learning modules. It initializes the API client and
    handles the generation of responses to user queries.
    
    Attributes:
        _client (genai.Client): The initialized AI client.
    """
    _client: Optional[genai.Client] = None

    @classmethod
    def initialize(cls):
        if cls._client is None:
            api_key = os.getenv("GEMINI_API_KEY")
            if api_key:
                cls._client = genai.Client(api_key=api_key)
            else:
                logger.warning("GEMINI_API_KEY not found in environment.")

    @staticmethod
    @lru_cache(maxsize=32)
    def _read_module_content(module_filename: str) -> str:
        """Read and cache module content."""
        learning_dir = settings.BASE_DIR / 'learning'
        module_path = learning_dir / module_filename
        if not module_path.exists():
            raise FileNotFoundError("Module content not found.")
        return module_path.read_text(encoding='utf-8')

    @classmethod
    def _build_rag_prompt(cls, question: str, module_filter: str = None) -> str:
        """
        Build prompt using RAG retrieval.
        """
        from apps.ai_engine.vector_service import VectorService
        
        # 1. Retrieve relevant chunks
        # If module_filter is provided, we could filter embeddings (Not implemented in VectorService yet, but planned)
        # For now, we search global context or rely on vector similarity to pick right context.
        chunks = VectorService.search_similar_content(question, top_k=5)
        
        if not chunks:
             context_text = "No specific context found in knowledge base."
        else:
             context_text = "\n\n".join([c.chunk_text for c in chunks])

        return f"""
            You are an expert Research Scientist Tutor.
            Answer the student's question based on the Context below.
            If the answer is not in the context, use your general knowledge but mention "Based on general knowledge...".
            Keep the answer concise, encouraging, and easy to understand.
            Format with Markdown.

            --- Context (Retrieved from Knowledge Base) ---
            {context_text}
            --- End Context ---

            Student Question: {question}
            Answer:
            """

    @classmethod
    def get_answer(cls, module_filename: str, question: str) -> Optional[str]:
        """
        Ask the AI tutor a question about a specific module (Blocking).
        """
        import hashlib
        from django.core.cache import cache
        from apps.security.content_filter import ContentFilter

        # Phase 54: ML Cybersecurity - Pre-LLM Content Filtering
        is_malicious, reason = ContentFilter.detect_prompt_injection(question)
        if is_malicious:
            logger.error(f"SECURITY BLOCK: Prompt Injection Detected. Reason: {reason}")
            return "Content Policy Violation: Your request has been blocked by the AI Safety Filter."

        cls.initialize()
        if not cls._client:
            return "AI Tutor service is not active (Missing API Key)."

        # Cache Key Generation
        file_hash = hashlib.md5(module_filename.encode()).hexdigest()
        q_hash = hashlib.md5(question.encode()).hexdigest()
        cache_key = f"ai_tutor:{file_hash}:{q_hash}"

        # Check Cache
        try:
            cached_response = cache.get(cache_key)
            if cached_response:
                return cached_response
        except Exception as e:
            logger.warning("Cache access failed in TutorService: %s", e)

        try:
            # RAG Prompt
            prompt = cls._build_rag_prompt(question, module_filter=module_filename)
            
            response = cls._client.models.generate_content(
                model='gemini-2.0-flash',
                contents=prompt
            )

            result_text = str(response.text).strip()

            # Cache Response (24 hours)
            cache.set(cache_key, result_text, timeout=86400)

            # Metric: Success
            try:
                from apps.core.metrics import AI_QUESTIONS_TOTAL
                AI_QUESTIONS_TOTAL.labels(status="success").inc()
            except Exception as e:
                logger.warning("Failed to increment AI successful metrics: %s", e)
            
            return result_text

        except Exception as e:
            # Metric: Error
            try:
                from apps.core.metrics import AI_QUESTIONS_TOTAL
                AI_QUESTIONS_TOTAL.labels(status="error").inc()
            except Exception as e:
                logger.warning("Failed to increment AI error metrics: %s", e)

            logger.error(f"Error calling AI Tutor: {str(e)}")
            return "Sorry, I encountered an error while processing your question."

    @classmethod
    def _build_prompt(cls, module_filename: str, question: str) -> str:
        """
        Build prompt for streaming (Wrapper around RAG prompt or direct prompt).
        """
        return cls._build_rag_prompt(question, module_filter=module_filename)

    @classmethod
    def get_answer_stream(cls, module_filename: str, question: str) -> Generator[str, None, None]:
        """
        Ask the AI tutor a question and stream the response (Generator).
        """
        from apps.security.content_filter import ContentFilter

        # Phase 54: ML Cybersecurity - Pre-LLM Content Filtering
        is_malicious, reason = ContentFilter.detect_prompt_injection(question)
        if is_malicious:
            logger.error(f"SECURITY BLOCK: Prompt Injection Detected over Stream. Reason: {reason}")
            yield "Content Policy Violation: Your request has been blocked by the AI Safety Filter."
            return

        cls.initialize()
        if not cls._client:
            yield "AI Tutor service is not active (Missing API Key)."
            return

        try:
            prompt = cls._build_prompt(module_filename, question)
            
            # Use streaming API
            response_stream = cls._client.models.generate_content_stream(
                model='gemini-2.0-flash',
                contents=prompt
            )

            for chunk in response_stream:
                if chunk.text:
                    yield chunk.text

        except Exception as e:
            logger.error(f"Error streaming AI Tutor: {str(e)}")
            yield "Sorry, I encountered an error. Please try again."

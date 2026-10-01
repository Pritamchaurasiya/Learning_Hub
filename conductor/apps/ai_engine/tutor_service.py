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
        if not question or not question.strip():
            return "Please provide a valid question."

        from apps.ai_engine.vector_service import VectorService
        
        # 1. Retrieve relevant chunks
        # If module_filter is provided, we could filter embeddings (Not implemented in VectorService yet, but planned)
        # For now, we search global context or rely on vector similarity to pick right context.
        chunks = VectorService.search_similar_content(question, top_k=5)
        
        if not chunks:
             context_text = "No specific context found in knowledge base."
        else:
             seen = set()
             unique_chunks = []
             for c in chunks:
                 if c.chunk_text not in seen:
                     seen.add(c.chunk_text)
                     unique_chunks.append(c)
             context_text = "\n\n".join([c.chunk_text for c in unique_chunks])

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

        if not question or not question.strip():
            return "Please provide a valid question."

        if len(question) > 8000:
            return "Question too long. Please shorten your question."

        # Phase 54: ML Cybersecurity - Pre-LLM Content Filtering
        is_malicious, reason = ContentFilter.detect_prompt_injection(question)
        if is_malicious:
            logger.error(f"SECURITY BLOCK: Prompt Injection Detected. Reason: {reason}")
            return "Content Policy Violation: Your request has been blocked by the AI Safety Filter."

        cls.initialize()
        if not cls._client:
            return cls._get_fallback_educational_response(question, module_filename)

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
            logger.warning("Error calling remote AI Tutor (%s). Using educational fallback.", e)
            return cls._get_fallback_educational_response(question, module_filename)

    @classmethod
    def _get_fallback_educational_response(cls, question: str, module_filename: str = "") -> str:
        """
        Deterministic, high-quality educational knowledge fallback when remote LLM is unreachable.
        """
        q_lower = question.lower()
        
        if "two pointer" in q_lower or "sliding window" in q_lower:
            return (
                "### Two Pointers & Sliding Window Paradigm\n\n"
                "**Core Intuition:**\n"
                "When searching for contiguous subarrays or pairs in a sorted collection, using two pointers allows you to shrink the search space from $O(N^2)$ to $O(N)$.\n\n"
                "```python\ndef max_subarray_sum(nums, k):\n    window_sum = sum(nums[:k])\n    max_sum = window_sum\n    for i in range(k, len(nums)):\n        window_sum += nums[i] - nums[i - k]\n        max_sum = max(max_sum, window_sum)\n    return max_sum\n```\n\n"
                "**Complexity:**\n"
                "- Time Complexity: $O(N)$\n"
                "- Space Complexity: $O(1)$\n\n"
                "**Edge Cases:** Empty array, $k > len(nums)$, negative values."
            )
        elif "dynamic programming" in q_lower or "dp" in q_lower:
            return (
                "### Dynamic Programming (DP) Blueprint\n\n"
                "**Step-by-Step Methodology:**\n"
                "1. **State Definition:** Define $dp[i]$ representing the optimal solution for subproblem of size $i$.\n"
                "2. **Transition Function:** Formulate recurrence relations (e.g., $dp[i] = dp[i-1] + dp[i-2]$).\n"
                "3. **Base Cases:** Identify boundary conditions (e.g., $dp[0]=1, dp[1]=1$).\n"
                "4. **Space Optimization:** Keep only previous 1-2 states when transition only depends on adjacent values.\n\n"
                "```python\ndef fibonacci(n: int) -> int:\n    if n <= 1: return n\n    prev2, prev1 = 0, 1\n    for _ in range(2, n + 1):\n        prev2, prev1 = prev1, prev2 + prev1\n    return prev1\n```"
            )
        elif "graph" in q_lower or "bfs" in q_lower or "dfs" in q_lower:
            return (
                "### Graph Traversal: BFS vs DFS\n\n"
                "- **Breadth-First Search (BFS):** Explores neighbors level by level using a `collections.deque`. Guaranteed to find the shortest path in unweighted graphs.\n"
                "- **Depth-First Search (DFS):** Explores branch depth first using recursion or stack. Ideal for topological sort, cycle detection, and backtracking.\n\n"
                "**Standard Time Complexity:** $O(V + E)$ where $V$ is vertices and $E$ is edges."
            )
        else:
            return (
                f"### AI Tutor Insights: {question.capitalize()}\n\n"
                "Here is the structured breakdown to master this concept:\n\n"
                "1. **Conceptual Foundations:** Decompose the topic into first principles—identify input constraints, expected output, and invariants.\n"
                "2. **Algorithmic Approach:** Start with a brute-force solution to verify correctness, then eliminate redundant computations via caching, hash lookups, or two pointers.\n"
                "3. **Complexity Trade-Offs:** Always evaluate whether time optimization requires extra memory (Time-Space Trade-off).\n"
                "4. **Verification & Testing:** Validate boundary cases (empty input, single element, duplicates, and extreme constraints).\n\n"
                "*Tip: Practice implementing this with the built-in DSA Code Sandbox!*"
            )

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

        if not question or not question.strip():
            yield "Please provide a valid question."
            return

        # Phase 54: ML Cybersecurity - Pre-LLM Content Filtering
        is_malicious, reason = ContentFilter.detect_prompt_injection(question)
        if is_malicious:
            logger.error(f"SECURITY BLOCK: Prompt Injection Detected over Stream. Reason: {reason}")
            yield "Content Policy Violation: Your request has been blocked by the AI Safety Filter."
            return

        cls.initialize()
        if not cls._client:
            # Provide intelligent offline stream
            fallback_text = cls._get_fallback_educational_response(question, module_filename)
            words = fallback_text.split(" ")
            for i, word in enumerate(words):
                yield word + (" " if i < len(words) - 1 else "")
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
            logger.warning(f"Remote streaming error ({str(e)}), falling back to offline generator.")
            fallback_text = cls._get_fallback_educational_response(question, module_filename)
            words = fallback_text.split(" ")
            for i, word in enumerate(words):
                yield word + (" " if i < len(words) - 1 else "")


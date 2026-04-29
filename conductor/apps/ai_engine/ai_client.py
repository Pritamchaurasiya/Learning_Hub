import os
import json
import logging
from google import genai  # type: ignore[attr-defined]
from typing import Dict, Any, Optional
from pydantic import BaseModel, Field

class Complexity(BaseModel):
    time: str = Field(description="Time complexity, e.g., O(N)")
    space: str = Field(description="Space complexity, e.g., O(1)")

class CodeReviewOutput(BaseModel):
    complexity: Complexity
    feedback: str = Field(description="Concise feedback on correctness and style.")
    suggestions: list[str] = Field(description="List of suggestions for improvement")

logger = logging.getLogger(__name__)

class AIClient:
    """
    Client for interacting with Google Generative AI (Gemini).
    Uses the new google-genai SDK.
    """
    
    # Model constants to avoid duplication
    MODEL_FLASH = "gemini-2.0-flash"
    MODEL_FLASH_LEGACY = "gemini-1.5-flash"
    MODEL_PRO = "gemini-2.0-pro-exp-02-05"
    MIME_JSON = "application/json"

    _client: Optional[genai.Client] = None
    circuit_breaker_key = "ai_circuit_breaker:status"
    failure_count_key = "ai_circuit_breaker:errors"
    failure_threshold = 3

    @classmethod
    def get_client(cls) -> Optional[genai.Client]:
        if cls._client is None:
            api_key = os.getenv("GEMINI_API_KEY")
            if api_key:
                cls._client = genai.Client(api_key=api_key)
            else:
                logger.warning("WARNING: GEMINI_API_KEY not found in environment.")
        return cls._client

    # Prometheus Metrics
    try:
        from prometheus_client import Counter, Histogram
        ai_tokens_total = Counter(
            "ai_tokens_total", "Total AI tokens consumed", ["model", "operation"]
        )
        ai_request_latency = Histogram(
            "ai_request_latency_seconds", "AI Request Latency", ["model", "operation"]
        )
        ai_errors_total = Counter(
            "ai_errors_total", "Total AI errors", ["model", "error_type"]
        )
    except ImportError:
        # Fallback if prometheus_client is not installed (e.g. CI)
        class MockMetric:
            def labels(self, *args, **kwargs):
                return self
            def inc(self, *args):
                pass
            def observe(self, *args):
                pass
            def time(self):
                return self
            def __enter__(self):
                pass
            def __exit__(self, *args):
                pass

        ai_tokens_total = MockMetric()
        ai_request_latency = MockMetric()
        ai_errors_total = MockMetric()

    # --- Enterprise Circuit Breaker Pattern ---
    @classmethod
    def _check_circuit(cls) -> bool:
        """
        Phase 48: Local Circuit Breaker check.
        Returns True if the circuit is 'open' (meaning requests should be blocked).
        Phase 52: Obeys Autonomous SOAR fallback routing.
        """
        from django.core.cache import cache
        
        # If SOAR Engine has placed us into a degraded fallback state, the circuit is mathematically "closed" 
        # (allowing traffic) but using the fallback model instead.
        if cache.get("soar:fallback_model_routing"):
            return False 
            
        return cache.get(cls.circuit_breaker_key) == "open"

    @classmethod
    def _record_success(cls):
        """Closes the circuit and resets failure counters dynamically."""
        from django.core.cache import cache
        if cache.get(cls.failure_count_key):
            cache.delete(cls.failure_count_key)
        if cache.get(cls.circuit_breaker_key):
            cache.delete(cls.circuit_breaker_key) # Close the circuit on success

    @classmethod
    def _record_failure(cls):
        """
        Records a failure. Trips the circuit breaker if threshold is reached.
        Phase 52: Signals the SOAR Engine to initiate graceful degradation fallback.
        """
        from django.core.cache import cache
        failures = (cache.get(cls.failure_count_key) or 0) + 1
        cache.set(cls.failure_count_key, failures, timeout=300)
        if failures >= cls.failure_threshold:
            logger.critical("AIClient Circuit Breaker Tripped! Suspended for 60s.")
            cache.set(cls.circuit_breaker_key, "open", timeout=60)
            
            # Phase 52: Trigger SOAR Engine Remediation Protocol
            try:
                from apps.ai_engine.soar_engine import AutonomousSOAREngine
                AutonomousSOAREngine.handle_circuit_breaker()
            except Exception as e:
                logger.error(f"Failed to trigger SOAR Engine Circuit Breaker Runbook: {e}")

    @classmethod
    def generate_text(cls, prompt: str, model: str = None) -> str:
        """
        Generates simple text response from the LLM.
        """
        client = cls.get_client()
        if not client:
            return "AI Service Unavailable."
        
        if cls._check_circuit():
            return "AI Circuit Open: Service temporarily suspended."

        target_model = model or cls.MODEL_FLASH
        try:
            # Add simple retry logic or latency tracking if needed
            response = client.models.generate_content(
                model=target_model,
                contents=prompt
            )
            cls._record_success()
            return response.text if response.text else ""
        except Exception as e:
            cls._record_failure()
            logger.error(f"Error generating text: {e}")
            return "Error processing request."

    @classmethod
    def generate_code_review(cls, problem_title: str, problem_description: str, code: str) -> Optional[Dict[str, Any]]:
        """
        Calls Gemini to review a DSA submission with strict structured JSON output.
        """
        import time
        from pydantic import BaseModel, Field
        from google.genai import types

        client = cls.get_client()
        if not client:
            return None

        if cls._check_circuit():
            return None



        retries = 3
        delay = 1

        # Cache Key
        import hashlib
        from django.core.cache import cache
        
        code_hash = hashlib.md5(code.encode()).hexdigest()
        cache_key = f"ai_review_v2:{problem_title}:{code_hash}"
        try:
            cached = cache.get(cache_key)
            if cached:
                return cached
        except Exception as e:
            logger.debug("Cache read failed for code review: %s", e)

        for attempt in range(retries):
            try:
                # Phase 51: Multi-Agent Expert Chain execution
                from apps.ai_engine.multi_agent import CodeReviewExpertChain
                
                result = CodeReviewExpertChain.execute(
                    problem_title=problem_title, 
                    problem_description=problem_description, 
                    code=code
                )
                
                if not result:
                    raise Exception("Expert Chain returned None.")

                cls._record_success()
                
                # Cache success
                try:
                    cache.set(cache_key, result, timeout=3600*24)
                except Exception as e:
                    logger.debug("Cache write failed for code review: %s", e)
                return result

            except Exception as e:
                cls._record_failure()
                logger.error(f"Error calling Expert Chain (Attempt {attempt+1}/{retries}): {str(e)}")
                if attempt < retries - 1:
                    time.sleep(delay)
                    delay *= 2  # Exponential backoff
                else:
                    return None
        return None

    @classmethod
    def generate_dsa_chat_response(cls, context_prompt: str, user_question: str) -> str:
        """
        Generates a chat response for the DSA tutor using RAG.
        Retrieves relevant context from RAGService before calling API.
        """
        client = cls.get_client()
        if not client:
            return "AI Service Unavailable (Missing API Key)."

        if cls._check_circuit():
            return "The AI systems are currently cooling down for 60 seconds. Please wait."

        try:
            # RAG: Retrieve context
            from apps.ai_engine.services import RAGService
            context_text = RAGService.get_context_for_query(user_question)

            system_persona = """
            You are an Elite AI Tutor for a high-performance Learning Hub.
            Your traits:
            - Encouraging, precise, and deeply knowledgeable.
            - You explain complex topics simply but without dumbing them down.
            - You use analogies and examples.
            - If the context provided contains the answer, use it strictly.
            - If the context is missing/irrelevant, use your general knowledge but mention: "This isn't covered in the current course materials, but generally..."
            - ALWAYS respond in the same language as the Student's Question.
            """

            full_prompt = f"{system_persona}\n\nContext:\n{context_text}\n\nStudent Question: {user_question}\n(Respond in the detected language of the question)"

            with cls.ai_request_latency.labels(model='gemini-1.5-flash', operation='dsa_chat').time():
                response = client.models.generate_content(
                    model='gemini-1.5-flash',
                    contents=full_prompt
                )

            # Metrics
            if response.usage_metadata:
                 cls.ai_tokens_total.labels(model='gemini-1.5-flash', operation='dsa_chat_input').inc(response.usage_metadata.prompt_token_count)
                 cls.ai_tokens_total.labels(model='gemini-1.5-flash', operation='dsa_chat_output').inc(response.usage_metadata.candidates_token_count)

            if response.text:
                cls._record_success()
                return str(response.text)
            return "I'm not sure how to answer that."
        except Exception as e:
            cls._record_failure()
            logger.error(f"Error calling Gemini for Chat: {str(e)}")
            return "Sorry, I encountered an error while processing your request."


    @classmethod
    def stream_dsa_chat_response(cls, context_prompt: str, user_question: str):
        """
        Streams a chat response for the DSA tutor (Generator).
        """
        client = cls.get_client()
        if not client:
            yield "AI Service Unavailable (Missing API Key)."
            return

        try:
            # RAG: Retrieve context (Even for streaming, we fetch context first)
            from apps.ai_engine.services import RAGService
            context_text = RAGService.get_context_for_query(user_question)

            system_persona = """
            You are an Elite AI Tutor for a high-performance Learning Hub.
            Your traits:
            - Encouraging, precise, and deeply knowledgeable.
            - You explain complex topics simply but without dumbing them down.
            - You use analogies and examples.
            - If the context provided contains the answer, use it strictly.
            - If the context is missing/irrelevant, use your general knowledge but mention: "This isn't covered in the current course materials, but generally..."
            - ALWAYS respond in the same language as the Student's Question.
            """

            full_prompt = f"{system_persona}\n\nContext:\n{context_text}\n\nStudent Question: {user_question}\n(Respond in the detected language of the question)"
            
            # Use generate_content_stream for streaming
            response = client.models.generate_content_stream(
                model='gemini-1.5-flash',
                contents=full_prompt
            )
            
            for chunk in response:
                if chunk.text:
                    yield chunk.text
                    
        except Exception as e:
            logger.error(f"Error calling Gemini for Chat Stream: {str(e)}")
            yield "Sorry, I encountered an error while processing your request."

    @classmethod
    def generate_problem_hint(cls, problem_title: str, problem_description: str, user_level: int = 1) -> str:
        """
        Generates a Socratic hint for a DSA problem, adapted to user level.
        """
        client = cls.get_client()
        if not client:
             # Fallback for when API key is missing
            return "Hint: Break the problem down into smaller parts. (AI Offline)"

        try:
            # Adaptive Logic
            if user_level < 5:
                style = "Conceptual and simple. Use an analogy. Do NOT mention Big-O or complex data structures yet unless necessary."
            elif user_level < 15:
                style = "Technical but guiding. Suggest a data structure (e.g., Stack, Map) but let them figure out how to use it."
            else:
                style = "Optimization focused. Hint at Time/Space complexity trade-offs or advanced algorithms (e.g., Dynamic Programming, Greedy)."

            prompt = f"""
            You are a helpful Computer Science Tutor.
            Student (Level {user_level}) is stuck on: '{problem_title}'.
            
            Problem Description:
            {problem_description}

            Give a small, progressive hint.
            Style Guide: {style}
            
            Constraint: Keep it under 2 sentences. No code.
            """

            response = client.models.generate_content(
                model='gemini-1.5-flash',
                contents=prompt
            )

            if response.text:
                return str(response.text).strip()
            return "Hint: Try writing out a few test cases manually to see the pattern."
        except Exception as e:
            logger.error(f"Error calling Gemini for Hint: {str(e)}")
            return "Hint: Focus on the constraints and edge cases."

    @classmethod
    def generate_discussion_summary(cls, thread_title: str, replies: list[str]) -> Optional[Dict[str, Any]]:
        """
        Summarizes a discussion thread and extracts key takeaways using strict structured outputs.
        """
        from pydantic import BaseModel, Field
        from google.genai import types
        import json

        class DiscussionSummaryOutput(BaseModel):
            summary: str = Field(description="A concise 2-sentence summary of the main conclusion.")
            key_takeaways: list[str] = Field(description="List of key takeaways from the discussion")
            related_question: str = Field(description="A follow-up question the student might ask (e.g. 'What is X?')")

        client = cls.get_client()
        if not client:
            return None

        replies_text = "\n".join([f"- {r}" for r in replies])
        
        # Cache Key
        import hashlib
        from django.core.cache import cache

        content_hash = hashlib.md5(replies_text.encode()).hexdigest()
        cache_key = f"ai_summary_v2:{thread_title}:{content_hash}"
        try:
            cached = cache.get(cache_key)
            if cached:
                return cached
        except Exception as e:
            logger.debug("Cache read failed for discussion summary: %s", e)

        try:
            prompt = f"""
            You are an AI Teaching Assistant. Summarize this discussion thread for a student.
            
            Thread Title: {thread_title}
            
            Replies:
            {replies_text}
            """

            response = client.models.generate_content(
                model='gemini-2.0-flash',
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    response_schema=DiscussionSummaryOutput,
                    temperature=0.3,
                )
            )

            if not response.text:
                return None

            result = json.loads(response.text)
            
            # Cache success
            try:
                cache.set(cache_key, result, timeout=3600*24)
            except Exception as e:
                logger.debug("Cache write failed for discussion summary: %s", e)
            return result
        except Exception as e:
            logger.error(f"Error generating summary: {str(e)}")
            return None



    @classmethod
    def generate_embedding(cls, text: str) -> Optional[list[float]]:
        """
        Generates vector embedding for text using local SentenceTransformer.
        Model: all-MiniLM-L6-v2 (384 dimensions).
        """
        try:
            # Import here to avoid loading at startup if not used
            from sentence_transformers import SentenceTransformer
            
            # Use class-level caching pattern via singleton property if preferred,
            # but simplified here for reliability. Ideally, load once in AppConfig.
            if not hasattr(cls, '_embedder'):
                logger.info("Loading Encoding Model (all-MiniLM-L6-v2)...")
                cls._embedder = SentenceTransformer('all-MiniLM-L6-v2')
            
            # Encode
            embeddings = cls._embedder.encode(text)
            return embeddings.tolist()
            
        except Exception as e:
            logger.error(f"Error generating embedding: {str(e)}")
            return None

    @classmethod
    def transcribe_audio(cls, audio_bytes: bytes, mime_type: str = "audio/mp3") -> Optional[str]:
        """
        Transcribes audio using Gemini 1.5 Flash (Multimodal).
        """
        client = cls.get_client()
        if not client:
            return None
        
        try:
            prompt = "Transcribe this audio file accurately."
            
            response = client.models.generate_content(
                model='gemini-1.5-flash',
                contents=[
                    prompt,
                    genai.types.Part.from_bytes(data=audio_bytes, mime_type=mime_type)
                ]
            )
            
            if response.text:
                return response.text.strip()
            return None
        except Exception as e:
            logger.error(f"Error transcribing audio: {str(e)}")
            return None

    @classmethod
    def moderate_content(cls, text: str) -> Dict[str, Any]:
        """
        Analyzes text for toxicity and safety violations using strict structured outputs.
        Returns {is_safe: bool, reason: str, flags: list}
        """
        from pydantic import BaseModel, Field
        from google.genai import types
        import json

        class ModerationOutput(BaseModel):
            is_safe: bool = Field(description="True if safe, false if any safety violations found")
            reason: str = Field(description="Brief explanation if unsafe, else 'Safe'")
            flags: list[str] = Field(description="List of violations, e.g., 'Toxicity', 'Hate Speech'")

        client = cls.get_client()
        if not client:
            return {"is_safe": True, "reason": "AI Service Unavailable", "flags": []}

        try:
            prompt = f"""
            You are a Content Safety Moderator. Analyze the following text for:
            - Toxicity
            - Hate Speech
            - Harassment
            - Self-harm
            - Violence

            Text: "{text}"
            """
            
            response = client.models.generate_content(
                model='gemini-2.0-flash',
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    response_schema=ModerationOutput,
                    temperature=0.1,
                )
            )

            if not response.text:
                return {"is_safe": True, "reason": "Empty AI Response", "flags": []}

            result = json.loads(response.text)
            return result

        except Exception as e:
            logger.error(f"Error moderating content: {str(e)}")
            return {"is_safe": True, "reason": "Moderation Error", "flags": []}

    @classmethod
    def generate_course_outline(cls, topic: str, level: str = "Beginner") -> Optional[Dict[str, Any]]:
        """
        Generates a full course outline (JSON) for a given topic via strictly structured outputs.
        """
        from pydantic import BaseModel, Field
        from google.genai import types
        import json

        class Lesson(BaseModel):
            title: str
            description: str
            content_type: str = Field(description="'text' or 'quiz'")
            text_content: str = Field(description="Detailed educational content for this lesson (markdown format). At least 3 paragraphs.")

        class Module(BaseModel):
            title: str
            description: str
            lessons: list[Lesson]

        class CourseOutline(BaseModel):
            title: str = Field(description="Engaging Course Title")
            description: str = Field(description="Compelling course description (2-3 sentences).")
            learning_objectives: list[str] = Field(description="List of learning objectives")
            modules: list[Module]

        client = cls.get_client()
        if not client:
            return None
        
        try:
            prompt = f"""
            You are an Expert Curriculum Designer. Create a comprehensive course outline for: "{topic}" ({level} Level).
            Generate at least 3 Modules and 3 Lessons per module.
            """
            
            with cls.ai_request_latency.labels(model='gemini-2.0-pro-exp-02-05', operation='generate_course_outline').time():
                response = client.models.generate_content(
                    model='gemini-2.0-pro-exp-02-05', # Using powerful model for large context
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        response_mime_type="application/json",
                        response_schema=CourseOutline,
                        temperature=0.4,
                    )
                )

            # Metrics
            if response.usage_metadata:
                try:
                    cls.ai_tokens_total.labels(model='gemini-2.0-pro-exp-02-05', operation='generate_course_outline_input').inc(response.usage_metadata.prompt_token_count)
                    cls.ai_tokens_total.labels(model='gemini-2.0-pro-exp-02-05', operation='generate_course_outline_output').inc(response.usage_metadata.candidates_token_count)
                except Exception as metric_err:
                    logger.debug("Failed to record telemetry: %s", metric_err)
            
            if not response.text:
                return None
                
            return json.loads(response.text)
        except Exception as e:
            logger.error(f"Error generating course outline: {str(e)}")
            return None

    @classmethod
    def generate_remedial_plan(
        cls, 
        topic: str, 
        weak_concepts: list[str], 
        student_level: str = "Beginner"
    ) -> Dict[str, Any]:
        """
        Generates a personalized remedial study plan based on weak concepts, using strict JSON templates.
        """
        from pydantic import BaseModel, Field
        from google.genai import types
        import json

        class ActionItem(BaseModel):
            title: str = Field(description="Short title for the action")
            description: str = Field(description="Detailed step description")

        class RemedialPlanOutput(BaseModel):
            root_cause: str = Field(description="Analyze why they might be struggling with these specific concepts.")
            action_items: list[ActionItem] = Field(description="List of 3-5 specific, actionable steps")
            resources: list[str] = Field(description="List of suggested resource types")

        client = cls.get_client()
        if not client:
             return {
                "root_cause": "AI Service Unavailable",
                "action_items": [{"title": "Review Material", "description": "Please review the course content."}],
                "resources": []
            }

        prompt = f"""
        Act as an expert tutor. Create a remedial study plan for a student struggling with '{topic}'.
        
        Student Level: {student_level}
        Identified Weak Concepts: {', '.join(weak_concepts)}
        """
        
        try:
            with cls.ai_request_latency.labels(model='gemini-2.0-flash', operation='generate_remedial_plan').time():
                response = client.models.generate_content(
                    model="gemini-2.0-flash",
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        response_mime_type="application/json",
                        response_schema=RemedialPlanOutput,
                        temperature=0.7,
                    ),
                )
            
            # Metrics
            if response.usage_metadata:
                try:
                    cls.ai_tokens_total.labels(model='gemini-2.0-flash', operation='generate_remedial_plan_input').inc(response.usage_metadata.prompt_token_count)
                    cls.ai_tokens_total.labels(model='gemini-2.0-flash', operation='generate_remedial_plan_output').inc(response.usage_metadata.candidates_token_count)
                except Exception as metric_err:
                    logger.debug("Failed to record telemetry: %s", metric_err)
            
            if response.text:
                return json.loads(response.text)
            return {}
            
        except Exception as e:
            logger.error(f"Error generating remedial plan: {e}")
            # Fallback
            return {
                "root_cause": "Error generating analysis.",
                "action_items": [],
                "resources": []
            }

    @classmethod
    def generate_speech_url(cls, text: str) -> Optional[str]:
        """
        Generates audio from text using gTTS and returns the file URL.
        """
        from gtts import gTTS
        import uuid
        from django.conf import settings
        
        try:
            # 1. Ensure directory exists
            output_dir = settings.MEDIA_ROOT / "audio" / "tts"
            output_dir.mkdir(parents=True, exist_ok=True)
            
            # 2. Generate unique filename
            filename = f"{uuid.uuid4()}.mp3"
            file_path = output_dir / filename
            
            # 3. Generate Audio
            tts = gTTS(text=text, lang='en', slow=False)
            tts.save(str(file_path))
            
            # 4. Return URL
            return f"{settings.MEDIA_URL}audio/tts/{filename}"
            
        except Exception as e:
            logger.error(f"Error generating speech: {str(e)}")
            return None

    @classmethod
    def analyze_proctor_frame(cls, image_bytes: bytes, mime_type: str = "image/jpeg") -> Dict[str, Any]:
        """
        Analyzes a webcam frame for exam proctoring flags.
        """
        client = cls.get_client()
        if not client:
             return {"flagged": False, "reason": "AI Unavailable"}

        try:
            prompt = """
            You are an AI Exam Proctor. Analyze this webcam frame.
            Check for:
            1. User looking away / down (suspiciously).
            2. Multiple people in frame.
            3. Phone or device visible.
            4. User missing from frame.

            Output JSON ONLY:
            {
                "flagged": true/false,
                "reason": "Brief description of the violation or 'Clear'",
                "confidence": 0.0-1.0
            }
            If safe/clear, flagged should be false.
            """
            
            response = client.models.generate_content(
                model='gemini-1.5-flash',
                contents=[
                    prompt,
                    genai.types.Part.from_bytes(data=image_bytes, mime_type=mime_type)
                ],
                config={'response_mime_type': 'application/json'}
            )
            
            if response.text:
                return json.loads(response.text)
            return {"flagged": False, "reason": "No Response"}
            
        except Exception as e:
            logger.error(f"Error in proctoring: {str(e)}")
            return {"flagged": False, "reason": "Error"}
            
    @classmethod
    def evaluate_multimodal_assessment(cls, image_bytes: bytes, context_text: str = "", mime_type: str = "image/jpeg") -> Dict[str, Any]:
        """
        Phase 141: Multimodal Assessment Evaluation.
        Analyzes an image of student work (handwritten or digital) and provides grading/feedback.
        """
        from pydantic import BaseModel, Field
        from google.genai import types
        import json

        class AssessmentOutput(BaseModel):
            score: int = Field(description="Score from 0-100")
            justification: str = Field(description="Detailed explanation of the grade")
            strengths: list[str] = Field(description="List of things done well")
            improvements: list[str] = Field(description="List of specific areas for improvement")
            step_by_step_correction: str = Field(description="Detailed breakdown of how to solve it correctly")

        client = cls.get_client()
        if not client:
            return {"error": "AI Service Unavailable"}

        try:
            prompt = f"""
            You are a Senior Academic Evaluator. Analyze the provided image of student work.
            
            Context/Subject: {context_text or "General Education"}
            
            Tasks:
            1. Transcribe the relevant parts of the work.
            2. Evaluate the correctness of the steps taken.
            3. Provide a score out of 100.
            4. Offer strengths and constructive improvements.
            5. Provide a step-by-step correct solution if errors are found.
            """
            
            response = client.models.generate_content(
                model=cls.MODEL_FLASH,
                contents=[
                    prompt,
                    genai.types.Part.from_bytes(data=image_bytes, mime_type=mime_type)
                ],
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    response_schema=AssessmentOutput,
                    temperature=0.2,
                )
            )
            
            if response.text:
                return json.loads(response.text)
            return {"error": "Empty response from AI"}
            
        except Exception as e:
            logger.error(f"Error in multimodal assessment: {str(e)}")
            return {"error": str(e)}

    @classmethod
    def generate_learning_insight_narrative(cls, user_name: str, metrics: Dict[str, Any]) -> str:
        """
        Generates a personalized narrative based on learning metrics.
        """
        client = cls.get_client()
        if not client:
             return "Keep up the good work! (AI Stats Unavailable)"

        prompt = f"""
        Act as a Learning Coach. Write a short, encouraging, and specific paragraph for {user_name}.
        
        Metrics:
        - Engagement Score: {metrics.get('engagement_score', 0)}/1.0
        - Consistency: {metrics.get('consistency_score', 0)}
        - Best Time: {metrics.get('preferred_time', 'Unknown')}
        - Strengths: {', '.join(metrics.get('strength_areas', []))}
        - Weaknesses: {', '.join(metrics.get('improvement_areas', []))}
        
        Keep it under 3 sentences. Focus on growth mindset.
        """
        
        try:
            response = client.models.generate_content(
                model="gemini-2.0-flash",
                contents=prompt,
            )
            return response.text.strip() if response.text else "You are making steady progress."
        except Exception as e:
            logger.error(f"Error generating narrative: {e}")
            return "You are doing great! Keep learning."

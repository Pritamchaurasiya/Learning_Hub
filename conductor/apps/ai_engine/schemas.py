from pydantic import BaseModel, Field, field_validator
from typing import Optional, List, Dict, Any

class SummarizeRequestSchema(BaseModel):
    """Schema for content summarization requests."""
    text: str = Field(..., min_length=10, max_length=50000, description="The content to summarize.")

class ExplainCodeSchema(BaseModel):
    """Schema for code explanation requests."""
    code: str = Field(..., min_length=1, max_length=10000, description="The raw code to explain.")
    context: str = Field(default="general", max_length=100, description="The language or context of the code.")

class GenerateSpeechSchema(BaseModel):
    """Schema for text-to-speech generation."""
    text: str = Field(..., min_length=2, max_length=1000, description="Text to convert to speech.")

class AskTutorSchema(BaseModel):
    """Schema for conversational queries to the AI Tutor."""
    module_filename: str = Field(..., min_length=1, description="The current module context.")
    question: str = Field(..., min_length=5, max_length=1000, description="The user's question.")
    
class TranscribeAudioSchema(BaseModel):
    """Schema for audio transcription module metadata."""
    module_filename: Optional[str] = Field(default="general", description="Current learning context mapped to the audio.")
    
class ChallengeSubmissionSchema(BaseModel):
    """Schema for participating in an algorithmic challenge."""
    challenge_id: int = Field(..., ge=1, description="The ID of the challenge to join.")

class AgentActionSchema(BaseModel):
    """Schema for requesting a complex agentic action (God Mode)."""
    action: str = Field(..., min_length=5, max_length=500, description="The natural language action instruction.")
    context_data: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Metadata supporting the action.")

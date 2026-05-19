from pydantic import BaseModel, Field, ConfigDict

class SubmissionSchema(BaseModel):
    """Schema for validating user code submissions for a DSA problem."""
    model_config = ConfigDict(extra='ignore')
    
    code: str = Field(..., min_length=1, max_length=50 * 1024, description="The code submitted by the user. Max 50KB.")
    problem: int = Field(..., description="The ID of the problem being solved.")
    language: str = Field(default='python', description="The programming language used.")

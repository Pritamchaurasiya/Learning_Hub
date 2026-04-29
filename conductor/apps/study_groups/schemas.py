from pydantic import BaseModel, Field

class UserIdSchema(BaseModel):
    """Schema for actions requiring a target user ID (e.g., kicking, transferring admin)."""
    user_id: str = Field(..., min_length=1, description="The ID of the target user.")

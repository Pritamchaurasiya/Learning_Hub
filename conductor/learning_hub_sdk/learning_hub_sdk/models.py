"""
Learning Hub SDK Data Models
"""

from typing import Optional, List, Dict, Any
from datetime import datetime
from pydantic import BaseModel, Field

class User(BaseModel):
    """User model."""
    id: int
    username: str
    email: str
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    is_active: bool = True
    date_joined: datetime
    last_login: Optional[datetime] = None
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }

class Category(BaseModel):
    """Category model."""
    id: int
    name: str
    description: Optional[str] = None
    is_active: bool = True
    created_at: datetime
    updated_at: datetime

class Course(BaseModel):
    """Course model."""
    id: int
    title: str
    description: Optional[str] = None
    instructor: Optional[str] = None
    category: Optional[Category] = None
    price: float = 0.0
    is_active: bool = True
    duration_hours: Optional[int] = None
    difficulty_level: str = "beginner"
    created_at: datetime
    updated_at: datetime
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }

class Enrollment(BaseModel):
    """Enrollment model."""
    id: int
    user: User
    course: Course
    enrolled_at: datetime
    completed_at: Optional[datetime] = None
    progress_percentage: float = 0.0
    is_active: bool = True
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }

class Review(BaseModel):
    """Review model."""
    id: int
    user: User
    course: Course
    rating: int = Field(ge=1, le=5)
    comment: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }

class Progress(BaseModel):
    """Progress model."""
    id: int
    user: User
    course: Course
    lesson_completed: int
    total_lessons: int
    progress_percentage: float
    last_accessed: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }

class APIResponse(BaseModel):
    """Generic API response model."""
    count: Optional[int] = None
    next: Optional[str] = None
    previous: Optional[str] = None
    results: List[Dict[str, Any]] = []

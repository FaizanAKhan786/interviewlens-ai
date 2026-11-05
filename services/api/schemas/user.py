from pydantic import BaseModel, EmailStr, Field, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime

class UserBase(BaseModel):
    email: EmailStr
    full_name: str

class UserCreate(UserBase):
    password: str = Field(..., min_length=6)

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserProfileUpdate(BaseModel):
    target_role: Optional[str] = None
    target_company: Optional[str] = None
    experience_level: Optional[str] = None
    bio: Optional[str] = None
    resume_text: Optional[str] = None
    preferred_language: Optional[str] = None

class UserProfileOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    target_role: str
    target_company: Optional[str] = None
    experience_level: str
    bio: Optional[str] = None
    resume_text: Optional[str] = None
    preferred_language: str

class UserOut(UserBase):
    model_config = ConfigDict(from_attributes=True)
    id: str
    role: str
    is_active: bool
    created_at: datetime
    profile: Optional[UserProfileOut] = None

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut

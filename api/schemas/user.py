from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from datetime import datetime
from enum import Enum


class RoleEnum(str, Enum):
    student = "student"
    facilitator = "facilitator"
    admin = "admin"


class UserRegistration(BaseModel):
    first_name: str = Field(description="User first name")
    last_name: str = Field(description="User last name")
    email_address: EmailStr = Field(description="User email address")
    password: str = Field(description="User password", min_length=8)
    role: RoleEnum = Field(description="User role")
    school: Optional[str] = None
    grade: Optional[str] = None


class UserLogin(BaseModel):
    user_email: EmailStr = Field(description="User email address")
    password: str = Field(description="User password")


class UserOut(BaseModel):
    id: int
    first_name: str
    last_name: str
    email: str
    role: str
    school: Optional[str] = None
    grade: Optional[str] = None
    bio: Optional[str] = None
    avatar: Optional[str] = None
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class UserUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    school: Optional[str] = None
    grade: Optional[str] = None
    bio: Optional[str] = None


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut

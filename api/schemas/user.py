import json
from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import Optional, List
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
    country: Optional[str] = None
    city: Optional[str] = None
    nationality: Optional[str] = None
    languages_spoken: Optional[List[str]] = None
    goals: Optional[List[str]] = None


class UserLogin(BaseModel):
    user_email: EmailStr = Field(description="User email address")
    password: str = Field(description="User password")


# `languages_spoken`/`goals` are stored as a JSON-array string in a plain TEXT
# column (no JSON column type in use elsewhere in this SQLite-first app) — these
# validators are the single place that boundary is crossed, so every other
# caller (schemas, controllers, routers) just deals in plain Python lists.
def _json_list_from_db(v):
    if v is None or isinstance(v, list):
        return v or []
    if isinstance(v, str):
        if not v.strip():
            return []
        try:
            parsed = json.loads(v)
            return parsed if isinstance(parsed, list) else []
        except (json.JSONDecodeError, TypeError):
            return []
    return []


class UserOut(BaseModel):
    id: int
    first_name: str
    last_name: str
    email: str
    role: str
    school: Optional[str] = None
    grade: Optional[str] = None
    country: Optional[str] = None
    city: Optional[str] = None
    nationality: Optional[str] = None
    languages_spoken: List[str] = []
    goals: List[str] = []
    bio: Optional[str] = None
    avatar: Optional[str] = None
    is_active: bool
    created_at: datetime

    @field_validator("languages_spoken", "goals", mode="before")
    @classmethod
    def _decode_json_list(cls, v):
        return _json_list_from_db(v)

    class Config:
        from_attributes = True


class UserUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    school: Optional[str] = None
    grade: Optional[str] = None
    country: Optional[str] = None
    city: Optional[str] = None
    nationality: Optional[str] = None
    languages_spoken: Optional[List[str]] = None
    goals: Optional[List[str]] = None
    bio: Optional[str] = None


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut

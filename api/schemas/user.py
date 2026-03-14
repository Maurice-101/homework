#!/usr/bin/env python

from typing import Dict, List
from pydantic import BaseModel, field_validator, AnyUrl, EmailStr, Field

class UserRole(BaseModel):
    """User role"""
    admin:str
    facilitator:str
    student:str

class UserRegistration(BaseModel):
    """User login Registration"""
    first_name:str = Field(description="User first name")
    last_name:str = Field(description="User last name")
    email_address:EmailStr = Field(description ="User email address")
    password:str = Field(description="User password", min_length=8)
    role:UserRole = Field(description="USer role")

class UserLogin(BaseModel):
    """User Login class"""
    user_email:EmailStr = Field(description="User email address")
    password:str = Field(description="User password")

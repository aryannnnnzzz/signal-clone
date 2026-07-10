"""
Auth schemas — request/response models for registration, login, and OTP.
"""

from pydantic import BaseModel, Field


class RegisterRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=4, max_length=128)
    display_name: str = Field(..., min_length=1, max_length=100)
    phone_number: str | None = Field(None, max_length=20)


class LoginRequest(BaseModel):
    username: str = Field(..., min_length=1)
    password: str = Field(..., min_length=1)


class VerifyOTPRequest(BaseModel):
    phone_number: str = Field(..., min_length=1)
    otp: str = Field(..., min_length=1)


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class AuthResponse(BaseModel):
    user: "UserOut"
    access_token: str
    token_type: str = "bearer"


class VerifyOTPResponse(BaseModel):
    verified: bool


# Avoid circular import — UserOut is defined in user.py
from app.schemas.user import UserOut  # noqa: E402

AuthResponse.model_rebuild()

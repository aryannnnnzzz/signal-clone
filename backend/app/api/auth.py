"""
Auth API router — /api/auth endpoints for register, login, OTP, and me.
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.dependencies import get_current_user, get_db
from app.models.user import User
from app.schemas.auth import (
    AuthResponse,
    LoginRequest,
    RegisterRequest,
    VerifyOTPRequest,
    VerifyOTPResponse,
)
from app.schemas.user import UserOut
from app.services import auth_service

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
async def register(data: RegisterRequest, db: AsyncSession = Depends(get_db)):
    """Register a new user and return JWT token."""
    try:
        user, token = await auth_service.register_user(
            db=db,
            username=data.username,
            password=data.password,
            display_name=data.display_name,
            phone_number=data.phone_number,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))

    return AuthResponse(
        user=UserOut.model_validate(user),
        access_token=token,
    )


@router.post("/login", response_model=AuthResponse)
async def login(data: LoginRequest, db: AsyncSession = Depends(get_db)):
    """Authenticate and return JWT token."""
    try:
        user, token = await auth_service.login_user(
            db=db, username=data.username, password=data.password
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail=str(e)
        )

    return AuthResponse(
        user=UserOut.model_validate(user),
        access_token=token,
    )


@router.post("/verify-otp", response_model=VerifyOTPResponse)
async def verify_otp(data: VerifyOTPRequest):
    """Mock OTP verification — accepts '123456' for any phone number."""
    verified = auth_service.verify_otp(data.phone_number, data.otp)
    if not verified:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid OTP"
        )
    return VerifyOTPResponse(verified=True)


@router.get("/me", response_model=UserOut)
async def get_me(current_user: User = Depends(get_current_user)):
    """Get the currently authenticated user's profile."""
    return UserOut.model_validate(current_user)

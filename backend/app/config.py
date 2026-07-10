"""
Application configuration via Pydantic Settings.
Loads from .env file and environment variables.
"""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Type-safe application settings loaded from .env file."""

    # Security
    SECRET_KEY: str = "signal-clone-dev-secret-key-change-in-production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 hours

    # Database
    DATABASE_URL: str = "sqlite+aiosqlite:///./signal_clone.db"

    # Mock OTP
    MOCK_OTP: str = "123456"

    # CORS
    CORS_ORIGINS: list[str] = ["http://localhost:3000", "http://localhost:5173"]

    model_config = {"env_file": ".env", "extra": "ignore"}


settings = Settings()

"""
SQLAlchemy async engine, session factory, and declarative Base.
All models inherit from Base. All endpoints use get_async_session().
"""

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.config import settings

# Create async engine — connect_args for SQLite thread safety
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=False,
    connect_args={"check_same_thread": False},
)

# Session factory — expire_on_commit=False so we can access attributes after commit
async_session_maker = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


class Base(DeclarativeBase):
    """Base class for all ORM models."""
    pass


async def get_async_session() -> AsyncSession:
    """Dependency that yields an async DB session and auto-closes it."""
    async with async_session_maker() as session:
        yield session

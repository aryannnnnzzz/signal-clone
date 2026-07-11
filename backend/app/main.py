"""
FastAPI application factory.
Creates the app, configures CORS, mounts REST routers and WebSocket endpoint.
"""

import logging
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, WebSocket, WebSocketDisconnect, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from jose import JWTError, jwt
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
import os

from app.config import settings
from app.database import Base, engine, get_async_session
from app.models import *  # noqa: F401, F403 — ensures all models are registered
from app.models.user import User
from app.schemas.message import MessageOut
from app.services import message_service, user_service
from app.ws import events as ws_events
from app.ws.handler import handle_ws_message
from app.ws.manager import manager

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan — creates tables on startup."""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("Database tables created")
    yield
    # Shutdown — nothing to clean up for now


app = FastAPI(
    title="Signal Clone API",
    description="Backend API for Signal messaging clone",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount uploads directory
os.makedirs("uploads", exist_ok=True)
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# Mount REST routers
from app.api.auth import router as auth_router  # noqa: E402
from app.api.users import router as users_router  # noqa: E402
from app.api.contacts import router as contacts_router  # noqa: E402
from app.api.conversations import router as conversations_router  # noqa: E402
from app.api.messages import router as messages_router  # noqa: E402
from app.api.upload import router as upload_router  # noqa: E402
from app.api.search import router as search_router  # noqa: E402
from app.api.dev import router as dev_router  # noqa: E402  — dev-only helpers

app.include_router(auth_router)
app.include_router(users_router)
app.include_router(contacts_router)
app.include_router(conversations_router)
app.include_router(messages_router)
app.include_router(upload_router)
app.include_router(search_router)
app.include_router(dev_router)  # dev-only: seed helpers for local development


@app.get("/health")
async def health_check():
    """Simple health check endpoint."""
    return {"status": "ok"}


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket, token: str | None = None):
    """
    Main WebSocket endpoint.
    Authenticates via JWT in query param, then enters message loop.
    On connect: marks user online, delivers undelivered messages.
    On disconnect: marks user offline, updates last_seen.
    """
    # Authenticate
    if not token:
        await websocket.close(code=4001, reason="Missing token")
        return

    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id = payload.get("sub")
        if not user_id:
            await websocket.close(code=4001, reason="Invalid token")
            return
    except JWTError:
        await websocket.close(code=4001, reason="Invalid token")
        return

    # Accept connection
    await websocket.accept()

    # Get user from DB
    async for db in get_async_session():
        result = await db.execute(select(User).where(User.id == user_id))
        user = result.scalar_one_or_none()
        if not user:
            await websocket.close(code=4001, reason="User not found")
            return

        # Register connection
        await manager.register(user_id, websocket)
        await user_service.set_user_online(db, user_id)

        # Send connected confirmation
        await websocket.send_json({
            "type": "connected",
            "data": {"user_id": user_id},
        })

        # Deliver undelivered messages
        undelivered = await message_service.get_undelivered_messages(db, user_id)
        for msg in undelivered:
            msg_out = MessageOut.model_validate(msg)
            await websocket.send_json(ws_events.message_event(msg_out))

        # Broadcast presence to contacts
        from app.services.contact_service import get_contacts
        contacts = await get_contacts(db, user_id)
        contact_ids = [c.contact_user_id for c in contacts]
        if contact_ids:
            presence = ws_events.presence_event(user_id, True)
            await manager.broadcast_to_users(contact_ids, presence)

        try:
            # Message loop
            while True:
                data = await websocket.receive_json()
                # Get a fresh session for each message to avoid stale data
                async for msg_db in get_async_session():
                    await handle_ws_message(data, user, websocket, msg_db)
                    break

        except WebSocketDisconnect:
            logger.info(f"User {user_id} disconnected")
        except Exception as e:
            logger.error(f"WebSocket error for user {user_id}: {e}", exc_info=True)
        finally:
            # Cleanup
            is_last = await manager.unregister(user_id, websocket)
            if is_last:
                async for cleanup_db in get_async_session():
                    await user_service.set_user_offline(cleanup_db, user_id)

                    # Broadcast offline presence
                    if contact_ids:
                        from datetime import datetime, timezone
                        presence = ws_events.presence_event(
                            user_id, False, datetime.now(timezone.utc).isoformat()
                        )
                        await manager.broadcast_to_users(contact_ids, presence)
                    break

        break  # Exit the async for loop for the initial DB session

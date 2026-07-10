"""
WebSocket ConnectionManager — registry of live sockets per user.
Handles registration, cleanup, targeted sends, and conversation broadcasts.
"""

import logging
from fastapi import WebSocket

logger = logging.getLogger(__name__)


class ConnectionManager:
    """
    Manages all active WebSocket connections.
    Maps user_id → list[WebSocket] to support multi-device.
    """

    def __init__(self):
        # user_id → list of active WebSocket connections
        self._connections: dict[str, list[WebSocket]] = {}

    async def register(self, user_id: str, websocket: WebSocket) -> None:
        """Register a new WebSocket connection for a user."""
        if user_id not in self._connections:
            self._connections[user_id] = []
        self._connections[user_id].append(websocket)
        logger.info(f"User {user_id} connected. Total sockets: {len(self._connections[user_id])}")

    async def unregister(self, user_id: str, websocket: WebSocket) -> bool:
        """
        Remove a WebSocket connection for a user.
        Returns True if this was the user's last connection (they're now fully offline).
        """
        if user_id in self._connections:
            try:
                self._connections[user_id].remove(websocket)
            except ValueError:
                pass

            if not self._connections[user_id]:
                del self._connections[user_id]
                logger.info(f"User {user_id} fully disconnected")
                return True  # Last connection gone

        return False

    def is_online(self, user_id: str) -> bool:
        """Check if a user has any active WebSocket connections."""
        return user_id in self._connections and len(self._connections[user_id]) > 0

    def get_online_users(self, user_ids: list[str]) -> set[str]:
        """Filter a list of user IDs to only those currently online."""
        return {uid for uid in user_ids if self.is_online(uid)}

    async def send_to_user(self, user_id: str, data: dict) -> None:
        """Send a JSON message to all active sockets of a user."""
        if user_id in self._connections:
            dead_sockets = []
            for ws in self._connections[user_id]:
                try:
                    await ws.send_json(data)
                except Exception:
                    dead_sockets.append(ws)

            # Clean up dead connections
            for ws in dead_sockets:
                try:
                    self._connections[user_id].remove(ws)
                except ValueError:
                    pass
            if user_id in self._connections and not self._connections[user_id]:
                del self._connections[user_id]

    async def broadcast_to_conversation(
        self,
        member_ids: list[str],
        data: dict,
        exclude_user_id: str | None = None,
    ) -> None:
        """
        Send a JSON message to all online members of a conversation.
        Optionally exclude one user (typically the sender).
        """
        for uid in member_ids:
            if uid != exclude_user_id:
                await self.send_to_user(uid, data)

    async def broadcast_to_users(
        self, user_ids: list[str], data: dict
    ) -> None:
        """Send a JSON message to a specific list of users."""
        for uid in user_ids:
            await self.send_to_user(uid, data)


# Global singleton — imported by ws/handler.py and api routers
manager = ConnectionManager()

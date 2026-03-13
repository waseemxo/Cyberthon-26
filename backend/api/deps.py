"""Session middleware — manages session IDs via cookies."""

import re
import uuid
from fastapi import Request, Response


SESSION_COOKIE = "lucid_session"
_SESSION_RE = re.compile(r"^[0-9a-f]{32}$")


def get_session_id(request: Request) -> str:
    """Get or create a session ID from cookies. Rejects malformed values."""
    session_id = request.cookies.get(SESSION_COOKIE, "")
    if not _SESSION_RE.match(session_id):
        session_id = uuid.uuid4().hex
    return session_id


def set_session_cookie(response: Response, session_id: str):
    """Set the session cookie on the response."""
    response.set_cookie(
        key=SESSION_COOKIE,
        value=session_id,
        httponly=True,
        samesite="lax",
        max_age=60 * 60 * 24,  # 24 hours
    )

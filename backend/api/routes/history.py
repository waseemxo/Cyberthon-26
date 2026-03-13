"""GET /api/history — session-based analysis history."""

from fastapi import APIRouter, Request, Response

from api.deps import get_session_id, set_session_cookie
from models.schemas import SessionHistoryItem
from db.session_store import get_session_history

router = APIRouter()


@router.get("/history", response_model=list[SessionHistoryItem])
async def get_history(request: Request, response: Response):
    session_id = get_session_id(request)
    set_session_cookie(response, session_id)

    history = await get_session_history(session_id)
    return history

from fastapi import APIRouter, Query
from app.services.time_engine import get_current_state

router = APIRouter()

@router.get("/current-state")
def current_state(
    character: str = Query(default=None),
    time: str = Query(default=None),  # NEW
    mode: str = Query(default=None),
):
    """If `mode=generated` is provided, the service will attempt to use
    `timeline.generated.json` (if present) instead of the primary `timeline.json`.
    """
    return get_current_state(character, time, mode=mode)
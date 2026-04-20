from fastapi import APIRouter, Query
from app.services.time_engine import get_current_state

router = APIRouter()

@router.get("/current-state")
def current_state(
    character: str = Query(default=None),
    time: str = Query(default=None)  # NEW
):
    return get_current_state(character, time)
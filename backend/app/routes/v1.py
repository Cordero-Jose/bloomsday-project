from fastapi import APIRouter, HTTPException, Query

from app.services import canon_store

router = APIRouter()


@router.get("/sources")
def list_sources():
    return {"sources": canon_store.get_sources()}


@router.get("/episodes")
def list_episodes():
    return {"episodes": canon_store.get_episodes()}


@router.get("/episodes/{episode_id}")
def get_episode(episode_id: str):
    ep = canon_store.get_episode(episode_id)
    if not ep:
        raise HTTPException(status_code=404, detail="Episode not found")
    return ep


@router.get("/characters")
def list_characters():
    return {"characters": canon_store.get_characters()}


@router.get("/locations")
def list_locations():
    return {"locations": canon_store.get_locations()}


@router.get("/events")
def list_events(
    episode: str | None = Query(default=None, description="Filter by episode id, e.g. telemachus"),
):
    return {"events": canon_store.get_events(episode_id=episode)}


@router.get("/events/{event_id}")
def get_event(event_id: str):
    event = canon_store.get_event(event_id)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found")
    return event
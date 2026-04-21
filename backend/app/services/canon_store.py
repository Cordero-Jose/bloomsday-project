import json
from pathlib import Path
from typing import Any, Dict, List, Optional

DATA_DIR = Path(__file__).resolve().parents[1] / "data" / "v1"


def _load_json(filename: str) -> Dict[str, Any]:
    path = DATA_DIR / filename
    with path.open("r", encoding="utf-8") as f:
        return json.load(f)


def get_sources() -> List[Dict[str, Any]]:
    return _load_json("sources.json").get("sources", [])


def get_episodes() -> List[Dict[str, Any]]:
    return _load_json("episodes.json").get("episodes", [])


def get_episode(episode_id: str) -> Optional[Dict[str, Any]]:
    for ep in get_episodes():
        if ep.get("id") == episode_id:
            return ep
    return None


def get_characters() -> List[Dict[str, Any]]:
    return _load_json("characters.json").get("characters", [])


def get_locations() -> List[Dict[str, Any]]:
    return _load_json("locations.json").get("locations", [])


def get_events(episode_id: Optional[str] = None) -> List[Dict[str, Any]]:
    # v1: Telemachus only (we can expand later)
    events = _load_json("events_telemachus.json").get("events", [])

    if episode_id:
        events = [e for e in events if e.get("episode_id") == episode_id]

    return events


def get_event(event_id: str) -> Optional[Dict[str, Any]]:
    for e in get_events():
        if e.get("id") == event_id:
            return e
    return None
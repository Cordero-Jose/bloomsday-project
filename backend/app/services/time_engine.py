import json
from datetime import datetime, timezone
from pathlib import Path

UNKNOWN_MESSAGES = {
    "leopold": "Bloom is somewhere in Dublin, but his exact activity is unclear.",
    "stephen": "Stephen drifts between thought and movement—his path is uncertain.",
    "molly": "Molly remains out of view, her thoughts unfolding beyond observation."
}

DATA_DIR = Path(__file__).resolve().parents[1] / "data"

with (DATA_DIR / "timeline.json").open("r", encoding="utf-8") as f:
    TIMELINES = json.load(f)

with (DATA_DIR / "location_coords.json").open("r", encoding="utf-8") as f:
    LOCATION_COORDS = json.load(f)


def parse_time_to_minutes(time_str: str):
    try:
        hours, minutes = map(int, time_str.split(":"))
        return hours * 60 + minutes
    except:
        return None


def find_event(events, current_minute, character_name):
    for event in events:
        if event["start_minute"] <= current_minute < event["end_minute"]:
            coords = LOCATION_COORDS.get(event.get("location"))

            enriched_event = dict(event)
            enriched_event["coords"] = coords  # {lat, lon} or None

            return {
                "status": "active",
                "event": enriched_event
            }

    return {
        "status": "unknown",
        "message": UNKNOWN_MESSAGES.get(
            character_name,
            "Their whereabouts are uncertain."
        )
    }


def get_current_state(character: str = None, time: str = None):
    now = datetime.now(timezone.utc)

    if time:
        current_minute = parse_time_to_minutes(time)
        if current_minute is None:
            return {"error": "Invalid time format. Use HH:MM"}
    else:
        current_minute = now.hour * 60 + now.minute

    if character:
        character = character.lower()

        if character not in TIMELINES:
            return {"error": "Character not found"}

        event = find_event(TIMELINES[character], current_minute, character)

        return {
            "character": character,
            "current_time_utc": now.isoformat(),
            "simulated_time": time if time else None,
            "event": event
        }

    result = {}
    for char, events in TIMELINES.items():
        result[char] = find_event(events, current_minute, char)

    return {
        "current_time_utc": now.isoformat(),
        "simulated_time": time if time else None,
        "characters": result
    }
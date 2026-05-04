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
    for index, event in enumerate(events):
        if event["start_minute"] <= current_minute < event["end_minute"]:
            # Allow events to carry explicit coords (generated waypoints) or fall back to named locations
            coords = event.get("coords") if event.get("coords") else LOCATION_COORDS.get(event.get("location"))

            enriched_event = dict(event)
            enriched_event["coords"] = coords  # {lat, lon} or None

            next_event = None
            if index + 1 < len(events):
                raw_next = dict(events[index + 1])
                next_coords = raw_next.get("coords") if raw_next.get("coords") else LOCATION_COORDS.get(raw_next.get("location"))
                raw_next["coords"] = next_coords
                next_event = raw_next

            return {
                "status": "active",
                "event": enriched_event,
                "next_event": next_event,
            }

    return {
        "status": "unknown",
        "message": UNKNOWN_MESSAGES.get(
            character_name,
            "Their whereabouts are uncertain."
        )
    }


def get_current_state(character: str = None, time: str = None, mode: str = None):
    now = datetime.now(timezone.utc)

    if time:
        current_minute = parse_time_to_minutes(time)
        if current_minute is None:
            return {"error": "Invalid time format. Use HH:MM"}
    else:
        current_minute = now.hour * 60 + now.minute

    # Optionally switch to a generated timeline dataset when requested
    timelines_source = TIMELINES
    if mode == "generated":
        gen_path = DATA_DIR / "timeline.generated.json"
        if gen_path.exists():
            try:
                with gen_path.open("r", encoding="utf-8") as gf:
                    timelines_source = json.load(gf)
            except Exception:
                # Fallback to default TIMELINES on error
                timelines_source = TIMELINES

    if character:
        character = character.lower()

        if character not in timelines_source:
            return {"error": "Character not found"}

        event = find_event(timelines_source[character], current_minute, character)

        return {
            "character": character,
            "current_time_utc": now.isoformat(),
            "simulated_time": time if time else None,
            "event": event
        }

    result = {}
    for char, events in timelines_source.items():
        result[char] = find_event(events, current_minute, char)

    return {
        "current_time_utc": now.isoformat(),
        "simulated_time": time if time else None,
        "characters": result
    }
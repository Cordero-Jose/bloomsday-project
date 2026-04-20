import json
from datetime import datetime, timezone

UNKNOWN_MESSAGES = {
    "leopold": "Bloom is somewhere in Dublin, but his exact activity is unclear.",
    "stephen": "Stephen drifts between thought and movement—his path is uncertain.",
    "molly": "Molly remains out of view, her thoughts unfolding beyond observation."
}

with open("app/data/timeline.json") as f:
    TIMELINES = json.load(f)


def parse_time_to_minutes(time_str: str):
    try:
        hours, minutes = map(int, time_str.split(":"))
        return hours * 60 + minutes
    except:
        return None


def find_event(events, current_minute, character_name):
    for event in events:
        if event["start_minute"] <= current_minute < event["end_minute"]:
            return {
                "status": "active",
                "event": event
            }

    # 🔥 Character-specific narrative fallback
    return {
        "status": "unknown",
        "message": UNKNOWN_MESSAGES.get(
            character_name,
            "Their whereabouts are uncertain."
        )
    }


def get_current_state(character: str = None, time: str = None):
    now = datetime.now(timezone.utc)

    # 🔥 NEW: override time if provided
    if time:
        current_minute = parse_time_to_minutes(time)
        if current_minute is None:
            return {"error": "Invalid time format. Use HH:MM"}
    else:
        current_minute = now.hour * 60 + now.minute

    # Single character
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

    # All characters
    result = {}
    for char, events in TIMELINES.items():
        result[char] = find_event(events, current_minute, char)

    return {
        "current_time_utc": now.isoformat(),
        "simulated_time": time if time else None,
        "characters": result
    }
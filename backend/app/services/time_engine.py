import json
from datetime import datetime, timezone

# Load timeline once (simple for now)
with open("app/data/timeline.json") as f:
    TIMELINES = json.load(f)


def find_event(events, current_minute):
    for event in events:
        if event["start_minute"] <= current_minute < event["end_minute"]:
            return event
    return None


def get_current_state(character: str = None):
    now = datetime.now(timezone.utc)
    current_minute = now.hour * 60 + now.minute

    # If a specific character is requested
    if character:
        character = character.lower()

        if character not in TIMELINES:
            return {"error": "Character not found"}

        event = find_event(TIMELINES[character], current_minute)

        return {
            "character": character,
            "current_time_utc": now.isoformat(),
            "event": event
        }

    # Otherwise return all characters
    result = {}

    for char, events in TIMELINES.items():
        result[char] = find_event(events, current_minute)

    return {
        "current_time_utc": now.isoformat(),
        "characters": result
    }
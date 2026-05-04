#!/usr/bin/env python3
"""Generate intermediate waypoint events for timeline entries.

Usage:
  python tools/generate_waypoints.py --character stephen --granularity 15

This reads `backend/app/data/timeline.json` and `backend/app/data/location_coords.json`,
and writes `backend/app/data/timeline.generated.json` with additional waypoint events
split at the requested granularity (minutes).
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Dict, Any, List, Optional


def lerp(a: float, b: float, t: float) -> float:
    return a + (b - a) * t


def interpolate_coords(a: Dict[str, float], b: Dict[str, float], t: float) -> Dict[str, float]:
    return {"lat": lerp(a["lat"], b["lat"], t), "lon": lerp(a["lon"], b["lon"], t)}


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--character", required=True)
    parser.add_argument("--granularity", type=int, default=15, help="minutes per waypoint block")
    parser.add_argument("--infile", default="backend/app/data/timeline.json")
    parser.add_argument("--locs", default="backend/app/data/location_coords.json")
    parser.add_argument("--outfile", default="backend/app/data/timeline.generated.json")
    args = parser.parse_args()

    infile = Path(args.infile)
    locfile = Path(args.locs)
    outfile = Path(args.outfile)

    if not infile.exists() or not locfile.exists():
        print("Missing input files. Make sure you're in the repo root.")
        return

    data = json.loads(infile.read_text())
    locs = json.loads(locfile.read_text())

    character = args.character
    gran = int(args.granularity)

    if character not in data:
        print(f"Character '{character}' not found in {infile}")
        return

    events: List[Dict[str, Any]] = data[character]
    # Sort by start_minute to be safe
    events = sorted(events, key=lambda e: e.get("start_minute", 0))

    new_events: List[Dict[str, Any]] = []

    for i, ev in enumerate(events):
        new_events.append(ev)

        # if there's a next event, consider gap
        if i + 1 < len(events):
            next_ev = events[i + 1]
            end_min = ev.get("end_minute")
            start_next = next_ev.get("start_minute")

            if end_min is None or start_next is None:
                continue

            gap = start_next - end_min
            if gap <= gran:
                continue

            # need coords for both ends
            loc_a = ev.get("location")
            loc_b = next_ev.get("location")

            coords_a = locs.get(loc_a) if isinstance(loc_a, str) else None
            coords_b = locs.get(loc_b) if isinstance(loc_b, str) else None

            if not coords_a or not coords_b:
                # Can't interpolate without coordinates
                continue

            # Generate waypoints every `gran` minutes between end_min and start_next
            t = end_min + gran
            while t < start_next:
                frac = (t - end_min) / max(1, (start_next - end_min))
                interp = interpolate_coords(coords_a, coords_b, frac)

                waypoint = {
                    "episode": f"Transit",
                    "location": f"Between {loc_a} → {loc_b}",
                    "description": f"En route from {loc_a} to {loc_b}",
                    "start_minute": int(t),
                    "end_minute": int(min(t + gran - 1, start_next - 1)),
                    "coords": {"lat": round(interp["lat"], 6), "lon": round(interp["lon"], 6)},
                }

                new_events.append(waypoint)
                t += gran

    # Replace character events with new_events in a copy of the data
    out = dict(data)
    out[character] = sorted(new_events, key=lambda e: e.get("start_minute", 0))

    outfile.write_text(json.dumps(out, indent=2))
    print(f"Wrote generated timeline to {outfile}")


if __name__ == "__main__":
    main()

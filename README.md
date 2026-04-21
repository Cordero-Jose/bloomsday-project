# bloomsday-project
**Bloomsday Project — Ulysses real-time narrative engine**

A full-stack prototype that simulates where key *Ulysses* characters are throughout June 16th (Bloomsday), exposes that state via an API, and visualizes it in a Next.js UI with a time slider and a Dublin map.

---

## Features (current)
- **Time slider** to simulate a full day (00:00 → 23:59)
- **`/current-state` API** returns each character’s active event (or an “unknown” narrative fallback)
- **Map visualization** with a **moving dot** driven by backend `lat/lon` coords
- **Pan + zoom map** (drag to pan, mouse wheel to zoom)
- **Calibration mode** to capture map click `xPct/yPct` for improved accuracy
- **Canon panel (v1)** loads canon events and shows **readable citations** + optional debug JSON

---

## Project structure (updated)
> This diagram reflects the repo layout you showed (including dynamic routes and infra).

```text
bloomsday-project/
├── .github/
│   └── workflows/
│       └── ci-cd.yml
│
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── core/
│   │   ├── data/
│   │   │   ├── timeline.json
│   │   │   ├── location_coords.json
│   │   │   └── v1/                       # canon datasets (JSON)
│   │   ├── models/
│   │   ├── routes/
│   │   │   ├── timeline.py               # GET /current-state
│   │   │   └── v1.py                     # GET /api/v1/... (canon)
│   │   ├── schemas/
│   │   ├── services/
│   │   │   ├── time_engine.py            # timeline lookup + coords enrichment
│   │   │   └── canon_store.py            # canon data access
│   │   └── utils/
│   ├── tests/
│   ├── requirements.txt
│   └── Dockerfile
│
├── frontend/
│   ├── app/
│   │   ├── api/                          # Next.js API routes (proxy to backend)
│   │   ├── [character]/
│   │   │   └── page.tsx                  # character page (map + slider + canon)
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx                      # home page (all characters)
│   ├── public/
│   │   └── maps/
│   │       ├── dublin-1906.jpg
│   │       └── dublin-1906.calibration.json
│   ├── package.json
│   ├── next.config.ts
│   └── (tooling files: tsconfig, eslint, etc.)
│
├── infra/
│   ├── docker-compose.yml
│   └── k8s/
│       ├── backend-deployment.yaml
│       ├── frontned-deployment.yaml      # note: filename currently spelled "frontned"
│       └── ingress.yaml
│
├── .env
├── Makefile
└── README.md
```

> Note: character pages are implemented via a **dynamic route** (`app/[character]/page.tsx`), not one folder per character.

---

## Getting started (local dev)

### Backend (FastAPI)
From repo root:

```powershell
cd backend
# activate your venv if you use one
pip install -r requirements.txt
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Quick test:
- `http://127.0.0.1:8000/current-state?time=08:30`

### Frontend (Next.js)
From repo root:

```powershell
cd frontend
npm install
npm run dev
```

Open:
- `http://localhost:3000`

---

## API endpoints (current)

### `GET /current-state`
Query params:
- `time` (optional): `HH:MM` simulated time
- `character` (optional): single-character state (e.g., `stephen`)

Examples:
- `GET http://127.0.0.1:8000/current-state?time=08:30`
- `GET http://127.0.0.1:8000/current-state?character=stephen&time=09:15`

Response (shape, simplified):
```json
{
  "simulated_time": "08:30",
  "characters": {
    "stephen": {
      "status": "active",
      "event": {
        "episode": "Telemachus",
        "location": "Martello Tower",
        "start_minute": 480,
        "end_minute": 540,
        "coords": { "lat": 53.2893, "lon": -6.1133 }
      }
    }
  }
}
```

### `GET /api/v1/events` (Canon v1)
Serves canon events loaded from `backend/app/data/v1/` via the `canon_store`.

Example (from the frontend):
- `GET /api/v1/events?episode=telemachus`

---

## Data model (MVP)
- `backend/app/data/timeline.json`  
  Defines time windows per character with `episode`, `location`, `start_minute`, `end_minute`.

- `backend/app/data/location_coords.json`  
  Maps **location name → lat/lon**.  
  The dot only appears when an active event has coords.

- `backend/app/data/v1/`  
  Canon datasets (JSON) used by the Canon panel.

---

## Frontend notes (map)
- Map image lives at: `frontend/public/maps/dublin-1906.jpg`
- Calibration config lives at: `frontend/public/maps/dublin-1906.calibration.json`
- Current placement uses simple lat/lon → image mapping; calibration mode captures `xPct/yPct` for tighter alignment.

Controls:
- Drag: pan
- Wheel: zoom
- Calibration mode: click to record `xPct/yPct`

---

## Roadmap (short)
- Accurate map calibration using control points (Martello Tower, GPO, etc.)
- Multiple dots (all characters simultaneously)
- Smooth transitions between events (interpolation / pathing)
- Canon filtering by character + time window
- Better UI layout/typography and mobile touch gestures
- Persisted datasets and richer evidence rendering

---

## Contributing
This is an early prototype. PRs welcome once basic stability is reached.

---

## License
TBD (choose MIT/Apache-2.0/etc.)
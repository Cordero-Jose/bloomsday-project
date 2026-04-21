from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes.timeline import router as timeline_router
from app.routes.health import router as health_router
from app.routes.v1 import router as v1_router  # NEW

# ✅ FIRST: create the app
app = FastAPI(title="Bloomsday Project")

# ✅ THEN: add middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ✅ THEN: include routes
app.include_router(health_router)
app.include_router(timeline_router)

# ✅ Canon API (read-only)
app.include_router(v1_router, prefix="/v1", tags=["v1"])
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes.timeline import router as timeline_router
from app.routes.health import router as health_router

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
from fastapi import FastAPI
from app.routes.timeline import router as timeline_router
from app.routes.health import router as health_router

app = FastAPI(title="Bloomsday Project")

app.include_router(health_router)
app.include_router(timeline_router)
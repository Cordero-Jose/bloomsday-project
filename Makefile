.PHONY: help backend-install backend-run frontend-install frontend-run dev-backend

help:
	@echo "Available targets:"
	@echo "  make backend-install   Install backend dependencies into project venv"
	@echo "  make backend-run       Run FastAPI backend on 127.0.0.1:8000"
	@echo "  make frontend-install  Install frontend npm dependencies"
	@echo "  make frontend-run      Run Next.js frontend on localhost:3000"
	@echo "  make dev-backend       Install backend deps and run backend"

backend-install:
	cd backend && ../.venv/Scripts/python.exe -m pip install -r requirements.txt

backend-run:
	cd backend && ../.venv/Scripts/python.exe -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000

frontend-install:
	cd frontend && npm install

frontend-run:
	cd frontend && npm run dev

dev-backend: backend-install backend-run

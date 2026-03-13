"""LUCID — FastAPI backend entrypoint."""

import asyncio
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from db.database import init_db
from api.routes import analyze, history, report


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: initialize database
    await init_db()

    # Startup: pre-load BERT classifier (if dependencies available)
    from forensics.bert_classifier import is_available, load_model
    if is_available():
        await asyncio.to_thread(load_model)

    yield
    # Shutdown: nothing to clean up


app = FastAPI(
    title="LUCID API",
    description="Forensic Analysis System for AI-Generated Content",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS — allow frontend dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount routes
app.include_router(analyze.router, prefix="/api")
app.include_router(history.router, prefix="/api")
app.include_router(report.router, prefix="/api")


@app.get("/api/health")
async def health_check():
    return {"status": "ok", "service": "LUCID API"}

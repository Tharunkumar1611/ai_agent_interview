from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pymongo.errors import PyMongoError, ServerSelectionTimeoutError

from app.core.config import get_settings
from app.db.mongodb import close_mongodb_connection, connect_to_mongodb
from app.routers import aptitude, auth, mock_interview, resume
from app.services.aptitude_engine import ensure_aptitude_collections
from app.services.dsa_engine import ensure_dsa_collections
from app.services.mock_interview_engine import ensure_mock_interview_collections

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        await connect_to_mongodb()
    except Exception as exc:
        app.state.mongodb_startup_error = exc
    try:
        await ensure_dsa_collections()
    except Exception as exc:
        app.state.dsa_startup_error = exc
    try:
        await ensure_aptitude_collections()
    except Exception as exc:
        app.state.aptitude_startup_error = exc
    try:
        await ensure_mock_interview_collections()
    except Exception as exc:
        app.state.mock_interview_startup_error = exc
    try:
        yield
    finally:
        await close_mongodb_connection()


app = FastAPI(
    title="AI Placement Mentor API",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_origin_regex=settings.allow_origin_regex,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(PyMongoError)
async def mongo_exception_handler(_: Request, exc: PyMongoError):
    status_code = 503 if isinstance(exc, ServerSelectionTimeoutError) else 500
    detail = "Database is unavailable" if status_code == 503 else f"Database error: {exc.__class__.__name__}"
    return JSONResponse(status_code=status_code, content={"detail": detail})


@app.exception_handler(Exception)
async def generic_exception_handler(_: Request, exc: Exception):
    return JSONResponse(status_code=500, content={"detail": "Internal server error"})


app.include_router(auth.router, prefix="/api")
app.include_router(resume.router, prefix="/api")
app.include_router(aptitude.router, prefix="/api")
app.include_router(mock_interview.router, prefix="/api")
app.include_router(__import__("app.routers.dsa", fromlist=["router"]).router, prefix="/api")


@app.get("/")
async def root():
    return {"message": "AI Placement Mentor API is running"}

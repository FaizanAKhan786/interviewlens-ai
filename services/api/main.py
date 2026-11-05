import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from services.api.core.config import settings
from services.api.core.database import engine, Base
from services.api.routers import auth, interviews, transcripts, learning, practice, exports

# Initialize database tables on startup
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Intelligent interview analysis, rubric-based technical coaching, and personalized career roadmaps.",
    version="1.0.0"
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API v1 Routers
app.include_router(auth.router, prefix=settings.API_V1_STR)
app.include_router(interviews.router, prefix=settings.API_V1_STR)
app.include_router(transcripts.router, prefix=settings.API_V1_STR)
app.include_router(learning.router, prefix=settings.API_V1_STR)
app.include_router(practice.router, prefix=settings.API_V1_STR)
app.include_router(exports.router, prefix=settings.API_V1_STR)

# Healthcheck
@app.get("/health", tags=["System"])
def health_check():
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "tagline": settings.TAGLINE,
        "ai_provider": settings.AI_PROVIDER,
        "storage_ready": os.path.exists(settings.STORAGE_DIR)
    }

# Mount static files if present
static_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "static"))
if os.path.exists(static_dir):
    app.mount("/static", StaticFiles(directory=static_dir), name="static")

@app.get("/", tags=["UI"])
def serve_index():
    index_file = os.path.join(static_dir, "index.html")
    if os.path.exists(index_file):
        return FileResponse(index_file)
    return {
        "message": f"Welcome to {settings.PROJECT_NAME} API",
        "docs": "/docs",
        "tagline": settings.TAGLINE
    }

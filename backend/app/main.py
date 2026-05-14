from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

from app.models.detector import AssetDetector
from app.routers import detection, export, health
from app.config import settings

detector: AssetDetector = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Load the ML model once at startup — thread-safe via lifespan context."""
    global detector
    detector = AssetDetector(model_path=settings.MODEL_PATH)
    app.state.detector = detector
    print(f"✅ Model loaded from {settings.MODEL_PATH}")
    yield
    # Cleanup on shutdown
    del detector
    print("🛑 Model unloaded")


app = FastAPI(
    title="Spatial Asset Management API",
    description="AI-powered urban asset detection from aerial/satellite/drone imagery",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS — allow frontend dev servers
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve uploaded images statically
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

# Register routers
app.include_router(health.router)
app.include_router(detection.router, prefix="/api")
app.include_router(export.router, prefix="/api")

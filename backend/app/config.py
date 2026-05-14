from pathlib import Path
from typing import Optional

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


BACKEND_DIR = Path(__file__).resolve().parents[1]
DEFAULT_CORS_ORIGINS = [
    "http://localhost:5173",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:3000",
]


class Settings(BaseSettings):
    """Application settings loaded from environment variables / .env file."""

    model_config = SettingsConfigDict(
        env_file=BACKEND_DIR / ".env",
        extra="ignore",
    )

    MODEL_PATH: str = "models/best.pt"
    CONFIDENCE_THRESHOLD: float = 0.35
    IOU_THRESHOLD: float = 0.45
    USE_SAHI: bool = True
    SAHI_SLICE_SIZE: int = 640
    SAHI_OVERLAP_RATIO: float = 0.2
    MAX_IMAGE_SIZE_MB: int = 50
    MAX_VIDEO_SIZE_MB: int = 200
    UPLOAD_DIR: str = "uploads"
    RESULTS_DIR: str = "results"
    
    # S3 Storage Configuration
    USE_S3: bool = False
    AWS_ACCESS_KEY_ID: Optional[str] = None
    AWS_SECRET_ACCESS_KEY: Optional[str] = None
    AWS_REGION: str = "us-east-1"
    AWS_BUCKET_NAME: Optional[str] = None
    
    # Celery Configuration
    CELERY_BROKER_URL: str = "redis://localhost:6379/0"
    CELERY_RESULT_BACKEND: str = "redis://localhost:6379/0"

    CORS_ORIGINS: list[str] = DEFAULT_CORS_ORIGINS

    @field_validator("MODEL_PATH", "UPLOAD_DIR", "RESULTS_DIR", mode="after")
    @classmethod
    def resolve_backend_paths(cls, value: str) -> str:
        path = Path(value).expanduser()
        if not path.is_absolute():
            path = BACKEND_DIR / path
        return str(path.resolve())

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def parse_cors_origins(cls, value):
        if isinstance(value, str):
            return [origin.strip() for origin in value.split(",") if origin.strip()]
        return value


settings = Settings()

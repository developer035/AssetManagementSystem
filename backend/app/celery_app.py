from celery import Celery
from app.config import settings

celery_app = Celery(
    "spatial_asset_mgmt",
    broker=settings.CELERY_BROKER_URL,
    backend=settings.CELERY_RESULT_BACKEND,
    include=["app.tasks"]
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    # YOLO inference can be heavy, limit concurrency if needed
    worker_concurrency=2, 
    worker_prefetch_multiplier=1
)

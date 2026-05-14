"""
Inference service — orchestrates SAHI + YOLO inference pipeline.
Can be extended for Celery-based async processing.
"""
from typing import Any, Dict, Optional, Tuple

from PIL import Image

from app.models.detector import AssetDetector


def run_inference(
    detector: AssetDetector,
    image: Image.Image,
    confidence: float = 0.35,
    use_sahi: bool = True,
    geo_transform: Optional[Tuple] = None,
) -> Dict[str, Any]:
    """
    Run the full inference pipeline.

    This wrapper exists so we can later move heavy inference
    into a Celery task without changing the router logic.
    """
    return detector.detect(
        image=image,
        confidence=confidence,
        use_sahi=use_sahi,
        geo_transform=geo_transform,
    )

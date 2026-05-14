"""
Pydantic response models for the detection API.
"""
from typing import Any, Dict, List, Optional

from pydantic import BaseModel


class DetectionItem(BaseModel):
    """A single detected asset."""

    category: str
    confidence: float
    bbox_pixels: List[float]
    bbox_geo: Optional[List[float]] = None
    area_sqm: Optional[float] = None
    pixel_area: Optional[float] = None
    color: str
    mask_polygon: Optional[List[List[float]]] = None


class CategorySummary(BaseModel):
    """Per-category aggregation."""

    count: int
    total_area_sqm: float = 0.0
    avg_confidence: float = 0.0


class ImageSize(BaseModel):
    width: int
    height: int


class DetectionResponse(BaseModel):
    """Full detection API response."""

    job_id: Optional[str] = None
    total_detections: int
    detections: List[DetectionItem]
    summary: Dict[str, CategorySummary]
    image_size: ImageSize
    image_url: Optional[str] = None

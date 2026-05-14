"""
3D Height Estimation Service
=============================
Estimates building height from shadow analysis in aerial/satellite imagery.
Uses shadow length, sun angle approximation, and geometric projection.
"""
import cv2
import math
import numpy as np
from PIL import Image
from typing import Dict, Any, List, Optional


def estimate_heights(
    image: Image.Image,
    detections: List[Dict],
    sun_elevation: float = 45.0,
    sun_azimuth: float = 180.0,
    gsd: float = 0.3,  # Ground Sampling Distance in meters/pixel
) -> List[Dict[str, Any]]:
    """
    Estimate building heights from shadow analysis.

    Args:
        image: PIL input image
        detections: List of detected assets (from detector)
        sun_elevation: Sun elevation angle in degrees (0-90)
        sun_azimuth: Sun azimuth angle in degrees (0-360)
        gsd: Ground sampling distance (meters per pixel)

    Returns:
        List of height estimations per building detection.
    """
    img_np = np.array(image.convert("RGB"))
    img_gray = cv2.cvtColor(img_np, cv2.COLOR_RGB2GRAY)
    img_hsv = cv2.cvtColor(img_np, cv2.COLOR_RGB2HSV)

    height_results = []

    for det in detections:
        if det["category"] not in ("Properties & Buildings",):
            continue

        x1, y1, x2, y2 = [int(v) for v in det["bbox_pixels"]]
        building_width_px = x2 - x1
        building_height_px = y2 - y1

        # Extract region around the building (expanded for shadow detection)
        expand = max(building_width_px, building_height_px)
        sy1 = max(0, y1 - expand)
        sy2 = min(img_np.shape[0], y2 + expand)
        sx1 = max(0, x1 - expand)
        sx2 = min(img_np.shape[1], x2 + expand)

        roi = img_gray[sy1:sy2, sx1:sx2]
        roi_hsv = img_hsv[sy1:sy2, sx1:sx2]

        if roi.size == 0:
            continue

        # Detect shadows using HSV thresholding
        # Shadows: low value, low saturation
        shadow_mask = cv2.inRange(
            roi_hsv,
            np.array([0, 0, 0]),
            np.array([180, 100, 80])
        )

        # Clean up shadow mask
        kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
        shadow_mask = cv2.morphologyEx(shadow_mask, cv2.MORPH_CLOSE, kernel)
        shadow_mask = cv2.morphologyEx(shadow_mask, cv2.MORPH_OPEN, kernel)

        # Find shadow contours
        contours, _ = cv2.findContours(
            shadow_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE
        )

        if not contours:
            # Estimate from building footprint
            estimated_height = _estimate_from_footprint(
                building_width_px, building_height_px, gsd
            )
            height_results.append({
                "building_bbox": det["bbox_pixels"],
                "confidence": det["confidence"],
                "estimated_height_m": estimated_height,
                "estimation_method": "footprint_heuristic",
                "shadow_length_px": None,
                "floors_estimate": max(1, int(estimated_height / 3.0)),
            })
            continue

        # Find the largest shadow contour near the building
        largest_shadow = max(contours, key=cv2.contourArea)
        shadow_rect = cv2.boundingRect(largest_shadow)
        shadow_length_px = max(shadow_rect[2], shadow_rect[3])

        # Convert shadow length to meters
        shadow_length_m = shadow_length_px * gsd

        # Calculate height using sun elevation angle
        # height = shadow_length * tan(sun_elevation)
        sun_elevation_rad = math.radians(sun_elevation)
        estimated_height_m = shadow_length_m * math.tan(sun_elevation_rad)

        # Clamp to reasonable building heights
        estimated_height_m = max(3.0, min(estimated_height_m, 300.0))

        # Estimate number of floors (avg 3m per floor)
        floors = max(1, int(estimated_height_m / 3.0))

        height_results.append({
            "building_bbox": det["bbox_pixels"],
            "confidence": det["confidence"],
            "estimated_height_m": round(estimated_height_m, 1),
            "estimation_method": "shadow_analysis",
            "shadow_length_px": shadow_length_px,
            "shadow_length_m": round(shadow_length_m, 1),
            "sun_elevation": sun_elevation,
            "floors_estimate": floors,
        })

    return height_results


def _estimate_from_footprint(
    width_px: int, height_px: int, gsd: float
) -> float:
    """
    Heuristic height estimation from building footprint size.
    Larger footprints tend to be taller commercial buildings.
    """
    footprint_area_m2 = width_px * height_px * gsd * gsd
    aspect_ratio = max(width_px, height_px) / max(min(width_px, height_px), 1)

    if footprint_area_m2 > 2000:
        # Large commercial/industrial
        base_height = 15.0
    elif footprint_area_m2 > 500:
        # Medium building
        base_height = 10.0
    elif footprint_area_m2 > 100:
        # Small building
        base_height = 6.0
    else:
        # Very small structure
        base_height = 3.0

    # Tall narrow buildings are likely taller
    if aspect_ratio > 3:
        base_height *= 1.3

    return round(base_height, 1)

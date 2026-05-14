"""
HSV Color-Space Land Cover Segmenter for Satellite/Aerial Imagery.

This module implements computer-vision-based segmentation for land cover
categories where color analysis on satellite imagery outperforms generic
ML models (Trees, Water, Roads, Parks). This is the same principle used
by the DeepGlobe Land Cover Classification benchmark.

Each category is detected by filtering the image in HSV color space,
finding contours, and converting them to normalized polygon coordinates.
"""
import cv2
import numpy as np
from typing import Any, Dict, List, Optional, Tuple
from PIL import Image
import math


# HSV ranges tuned for satellite/aerial imagery
# Format: (H_low, S_low, V_low, H_high, S_high, V_high)
COLOR_PROFILES = {
    "Trees & Green Cover": {
        "ranges": [
            (30, 40, 30, 85, 255, 200),   # Medium-dark greens (trees/canopy)
        ],
        "min_area": 500,       # Trees are moderately sized
        "color": "#2ECC71",
    },
    "Parks & Open Spaces": {
        "ranges": [
            (30, 20, 100, 85, 180, 255),   # Bright, lighter greens (grass/parks)
        ],
        "min_area": 5000,      # Parks are large open areas
        "color": "#27AE60",
    },
    "Water Bodies": {
        "ranges": [
            (90, 30, 30, 130, 255, 255),   # Blue range (lakes, rivers, ponds)
            (85, 40, 40, 140, 255, 200),   # Darker blue/teal (shadows on water)
        ],
        "min_area": 1000,      # Water bodies are medium-large
        "color": "#3498DB",
    },
    "Roads & Footpaths": {
        "ranges": [
            (0, 0, 120, 180, 40, 220),     # Grey/light concrete
        ],
        "min_area": 800,
        "color": "#95A5A6",
    },
    "Drains & Sewage": {
        "ranges": [
            (0, 0, 50, 180, 50, 110),      # Dark grey channels
        ],
        "min_area": 300,
        "color": "#8E44AD",
    },
    "Waste Dumps": {
        "ranges": [
            (10, 30, 80, 25, 200, 200),    # Brown/tan irregular patches
            (0, 20, 60, 15, 180, 180),     # Reddish-brown soil
        ],
        "min_area": 1500,
        "color": "#7F8C8D",
    },
}


class ColorSegmenter:
    """
    Performs HSV color-space segmentation on satellite/aerial images
    to detect land cover categories (Trees, Water, Roads, Parks, etc.).
    """

    def detect(
        self,
        image: Image.Image,
        categories: Optional[List[str]] = None,
        geo_transform: Optional[Tuple] = None,
    ) -> List[Dict[str, Any]]:
        """
        Run color-based segmentation on a PIL image.

        Args:
            image: PIL Image (RGB).
            categories: List of category names to detect. None = all.
            geo_transform: (origin_lon, origin_lat, width_deg, height_deg).

        Returns:
            List of detection dicts compatible with AssetDetector output.
        """
        # Convert PIL → OpenCV BGR → HSV
        img_rgb = np.array(image)
        img_bgr = cv2.cvtColor(img_rgb, cv2.COLOR_RGB2BGR)
        img_hsv = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2HSV)
        h, w = img_hsv.shape[:2]

        if categories is None:
            categories = list(COLOR_PROFILES.keys())

        all_detections = []

        for category in categories:
            if category not in COLOR_PROFILES:
                continue

            profile = COLOR_PROFILES[category]
            combined_mask = np.zeros((h, w), dtype=np.uint8)

            # Apply all HSV ranges for this category
            for hsv_range in profile["ranges"]:
                lower = np.array(hsv_range[:3])
                upper = np.array(hsv_range[3:])
                mask = cv2.inRange(img_hsv, lower, upper)
                combined_mask = cv2.bitwise_or(combined_mask, mask)

            # Morphological cleanup: remove noise, fill gaps
            kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
            combined_mask = cv2.morphologyEx(combined_mask, cv2.MORPH_CLOSE, kernel)
            combined_mask = cv2.morphologyEx(combined_mask, cv2.MORPH_OPEN, kernel)

            # Find contours
            contours, _ = cv2.findContours(
                combined_mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE
            )

            for contour in contours:
                area = cv2.contourArea(contour)
                if area < profile["min_area"]:
                    continue

                # Simplify polygon
                epsilon = 0.003 * cv2.arcLength(contour, True)
                approx = cv2.approxPolyDP(contour, epsilon, True)
                if len(approx) < 3:
                    continue

                # Bounding box
                x, y, bw, bh = cv2.boundingRect(contour)
                x1, y1, x2, y2 = float(x), float(y), float(x + bw), float(y + bh)
                pixel_area = float(bw * bh)

                # Normalized polygon for segmentation mask
                points = approx.reshape(-1, 2)
                mask_polygon = points.tolist()

                # Geo conversion
                geo_bbox = None
                geo_area_sqm = None
                if geo_transform:
                    geo_bbox = self._pixels_to_geo([x1, y1, x2, y2], (w, h), geo_transform)
                    geo_area_sqm = self._estimate_area_sqm(x1, y1, x2, y2, (w, h), geo_transform)

                # Confidence based on color purity of the region
                roi_mask = np.zeros((h, w), dtype=np.uint8)
                cv2.drawContours(roi_mask, [contour], -1, 255, -1)
                matching_pixels = cv2.countNonZero(cv2.bitwise_and(combined_mask, roi_mask))
                total_pixels = cv2.countNonZero(roi_mask)
                confidence = round(matching_pixels / max(total_pixels, 1), 3)
                confidence = min(max(confidence, 0.4), 0.95)  # Clamp to realistic range

                all_detections.append({
                    "category": category,
                    "confidence": confidence,
                    "bbox_pixels": [x1, y1, x2, y2],
                    "bbox_geo": geo_bbox,
                    "area_sqm": geo_area_sqm,
                    "pixel_area": pixel_area,
                    "color": profile["color"],
                    "mask_polygon": mask_polygon,
                })

        return all_detections

    @staticmethod
    def _pixels_to_geo(
        bbox_pixels: List[float],
        image_size: Tuple[int, int],
        geo_transform: Tuple,
    ) -> List[float]:
        origin_lon, origin_lat, px_size_x, px_size_y = geo_transform
        w, h = image_size
        x1, y1, x2, y2 = bbox_pixels
        lon1 = origin_lon + (x1 / w) * px_size_x
        lat1 = origin_lat - (y1 / h) * abs(px_size_y)
        lon2 = origin_lon + (x2 / w) * px_size_x
        lat2 = origin_lat - (y2 / h) * abs(px_size_y)
        return [lon1, lat1, lon2, lat2]

    @staticmethod
    def _estimate_area_sqm(
        x1: float, y1: float, x2: float, y2: float,
        image_size: Tuple[int, int],
        geo_transform: Tuple,
    ) -> float:
        origin_lon, origin_lat, px_size_x, px_size_y = geo_transform
        w, h = image_size
        width_deg = ((x2 - x1) / w) * px_size_x
        height_deg = ((y2 - y1) / h) * abs(px_size_y)
        lat_rad = math.radians(origin_lat)
        width_m = width_deg * 111_000 * math.cos(lat_rad)
        height_m = height_deg * 111_000
        return round(width_m * height_m, 2)

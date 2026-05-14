"""
Coordinate transformation utilities.
"""
import math
from typing import List, Tuple


def pixel_to_latlon(
    px: float,
    py: float,
    image_size: Tuple[int, int],
    geo_transform: Tuple[float, float, float, float],
) -> Tuple[float, float]:
    """
    Convert a single pixel coordinate to lat/lon.

    Args:
        px, py: Pixel coordinates.
        image_size: (width, height) of the image.
        geo_transform: (origin_lon, origin_lat, width_deg, height_deg).

    Returns:
        (longitude, latitude)
    """
    origin_lon, origin_lat, width_deg, height_deg = geo_transform
    w, h = image_size

    lon = origin_lon + (px / w) * width_deg
    lat = origin_lat - (py / h) * abs(height_deg)
    return (lon, lat)


def latlon_to_pixel(
    lon: float,
    lat: float,
    image_size: Tuple[int, int],
    geo_transform: Tuple[float, float, float, float],
) -> Tuple[float, float]:
    """
    Convert lat/lon to pixel coordinates.

    Args:
        lon, lat: Geographic coordinates.
        image_size: (width, height) of the image.
        geo_transform: (origin_lon, origin_lat, width_deg, height_deg).

    Returns:
        (px, py) pixel coordinates.
    """
    origin_lon, origin_lat, width_deg, height_deg = geo_transform
    w, h = image_size

    px = ((lon - origin_lon) / width_deg) * w
    py = ((origin_lat - lat) / abs(height_deg)) * h
    return (px, py)


def calculate_area_sqm(
    bbox_pixels: List[float],
    image_size: Tuple[int, int],
    geo_transform: Tuple[float, float, float, float],
) -> float:
    """
    Estimate bounding box area in square metres using equirectangular approximation.
    """
    origin_lon, origin_lat, width_deg, height_deg = geo_transform
    w, h = image_size
    x1, y1, x2, y2 = bbox_pixels

    box_width_deg = ((x2 - x1) / w) * width_deg
    box_height_deg = ((y2 - y1) / h) * abs(height_deg)

    lat_rad = math.radians(origin_lat)
    width_m = box_width_deg * 111_000 * math.cos(lat_rad)
    height_m = box_height_deg * 111_000

    return round(abs(width_m * height_m), 2)

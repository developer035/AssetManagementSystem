"""
Geo-processing utilities.
Extracts geographic transforms from GeoTIFF metadata.
"""
from typing import Optional, Tuple


def extract_geo_transform(image_path: str) -> Optional[Tuple]:
    """
    Try to extract geographic transform from a GeoTIFF.

    Returns:
        (origin_lon, origin_lat, width_degrees, height_degrees) or None
        if the image has no CRS / is not a GeoTIFF.
    """
    try:
        import rasterio

        with rasterio.open(image_path) as src:
            if src.crs is None:
                return None
            bounds = src.bounds
            width_deg = bounds.right - bounds.left
            height_deg = bounds.top - bounds.bottom
            return (bounds.left, bounds.top, width_deg, height_deg)
    except Exception:
        # Not a GeoTIFF or rasterio not installed — gracefully degrade
        return None

"""
CRS-aware GeoTIFF metadata extraction.
"""
from __future__ import annotations

from typing import Any, Dict, Optional

from pyproj import Geod, Transformer

from app.utils.geo_utils import close_ring


def _estimate_gsd_meters(src) -> Optional[float]:
    """Estimate average meters-per-pixel using geodesic edge lengths."""
    try:
        transformer = Transformer.from_crs(src.crs, "EPSG:4326", always_xy=True)
        geod = Geod(ellps="WGS84")

        top_left = src.transform * (0, 0)
        top_right = src.transform * (1, 0)
        bottom_left = src.transform * (0, 1)

        lon1, lat1 = transformer.transform(*top_left)
        lon2, lat2 = transformer.transform(*top_right)
        lon3, lat3 = transformer.transform(*bottom_left)

        width_m = geod.line_length([lon1, lon2], [lat1, lat2])
        height_m = geod.line_length([lon1, lon3], [lat1, lat3])

        if width_m <= 0 or height_m <= 0:
            return None
        return round((width_m + height_m) / 2, 4)
    except Exception:
        return None


def extract_geo_reference(image_path: str) -> Optional[Dict[str, Any]]:
    """
    Extract a full CRS-aware georeference description from a raster file.

    Returns WGS84-facing metadata suitable for API responses and geometry projection.
    """
    try:
        import rasterio

        with rasterio.open(image_path) as src:
            if src.crs is None:
                return None

            transformer = Transformer.from_crs(src.crs, "EPSG:4326", always_xy=True)
            bounds = src.bounds

            bounds_corners = close_ring([
                [bounds.left, bounds.top],
                [bounds.right, bounds.top],
                [bounds.right, bounds.bottom],
                [bounds.left, bounds.bottom],
            ])
            bounds_wgs84_ring = [[*transformer.transform(x, y)] for x, y in bounds_corners]
            lon_values = [point[0] for point in bounds_wgs84_ring]
            lat_values = [point[1] for point in bounds_wgs84_ring]

            return {
                "source_crs": src.crs.to_string(),
                "epsg": src.crs.to_epsg(),
                "transform": list(src.transform)[:6],
                "width": src.width,
                "height": src.height,
                "bounds_source": [bounds.left, bounds.bottom, bounds.right, bounds.top],
                "bounds_wgs84": [min(lon_values), min(lat_values), max(lon_values), max(lat_values)],
                "bounds_wgs84_ring": bounds_wgs84_ring,
                "source_resolution": [float(src.res[0]), float(src.res[1])],
                "approx_gsd_m": _estimate_gsd_meters(src),
            }
    except Exception:
        return None


def extract_geo_transform(image_path: str) -> Optional[Dict[str, Any]]:
    """
    Backward-compatible alias retained for existing imports.
    """
    return extract_geo_reference(image_path)

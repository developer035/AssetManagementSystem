"""
CRS-aware geospatial helpers.
"""
from __future__ import annotations

from typing import Any, Dict, Iterable, List, Sequence, Tuple

from affine import Affine
from pyproj import Geod, Transformer
from shapely.geometry import Polygon


WGS84_GEOD = Geod(ellps="WGS84")


def build_bbox_ring(bbox_pixels: Sequence[float]) -> List[List[float]]:
    """Convert a pixel bbox into a closed ring."""
    x1, y1, x2, y2 = bbox_pixels
    return [
        [float(x1), float(y1)],
        [float(x2), float(y1)],
        [float(x2), float(y2)],
        [float(x1), float(y2)],
        [float(x1), float(y1)],
    ]


def close_ring(points: Iterable[Sequence[float]]) -> List[List[float]]:
    ring = [[float(x), float(y)] for x, y in points]
    if not ring:
        return []
    if ring[0] != ring[-1]:
        ring.append(ring[0])
    return ring


def georeference_has_spatial_data(geo_reference: Dict[str, Any] | None) -> bool:
    return bool(geo_reference and geo_reference.get("source_crs") and geo_reference.get("transform"))


def get_affine_transform(geo_reference: Dict[str, Any]) -> Affine:
    return Affine(*geo_reference["transform"])


def get_transformer_to_wgs84(geo_reference: Dict[str, Any]) -> Transformer:
    return Transformer.from_crs(geo_reference["source_crs"], "EPSG:4326", always_xy=True)


def pixel_to_source_xy(
    px: float,
    py: float,
    geo_reference: Dict[str, Any],
) -> Tuple[float, float]:
    transform = get_affine_transform(geo_reference)
    return transform * (float(px), float(py))


def pixel_ring_to_source_ring(
    points: Iterable[Sequence[float]],
    geo_reference: Dict[str, Any],
) -> List[List[float]]:
    ring = close_ring(points)
    return [[*pixel_to_source_xy(x, y, geo_reference)] for x, y in ring]


def source_ring_to_wgs84_ring(
    points: Iterable[Sequence[float]],
    geo_reference: Dict[str, Any],
) -> List[List[float]]:
    ring = close_ring(points)
    transformer = get_transformer_to_wgs84(geo_reference)
    return [[*transformer.transform(float(x), float(y))] for x, y in ring]


def pixel_ring_to_wgs84_ring(
    points: Iterable[Sequence[float]],
    geo_reference: Dict[str, Any],
) -> List[List[float]]:
    source_ring = pixel_ring_to_source_ring(points, geo_reference)
    return source_ring_to_wgs84_ring(source_ring, geo_reference)


def bbox_to_wgs84_polygon(
    bbox_pixels: Sequence[float],
    geo_reference: Dict[str, Any],
) -> List[List[float]]:
    return pixel_ring_to_wgs84_ring(build_bbox_ring(bbox_pixels), geo_reference)


def bounds_from_ring(points: Iterable[Sequence[float]]) -> List[float] | None:
    ring = close_ring(points)
    if not ring:
        return None
    xs = [point[0] for point in ring]
    ys = [point[1] for point in ring]
    return [min(xs), min(ys), max(xs), max(ys)]


def geodesic_area_sqm(points: Iterable[Sequence[float]]) -> float | None:
    ring = close_ring(points)
    if len(ring) < 4:
        return None

    polygon = Polygon(ring)
    if polygon.is_empty:
        return None
    if not polygon.is_valid:
        polygon = polygon.buffer(0)
    if polygon.is_empty:
        return None

    area, _ = WGS84_GEOD.geometry_area_perimeter(polygon)
    return round(abs(area), 2)


def pixel_bbox_to_latlon(
    bbox_pixels: Sequence[float],
    image_size: Tuple[int, int],
    geo_reference: Dict[str, Any],
) -> List[float] | None:
    del image_size
    return bounds_from_ring(bbox_to_wgs84_polygon(bbox_pixels, geo_reference))


def pixel_to_latlon(
    px: float,
    py: float,
    image_size: Tuple[int, int],
    geo_reference: Dict[str, Any],
) -> Tuple[float, float]:
    del image_size
    ring = pixel_ring_to_wgs84_ring([[px, py]], geo_reference)
    lon, lat = ring[0]
    return (lon, lat)


def latlon_to_pixel(
    lon: float,
    lat: float,
    image_size: Tuple[int, int],
    geo_reference: Dict[str, Any],
) -> Tuple[float, float]:
    del image_size
    transformer = Transformer.from_crs("EPSG:4326", geo_reference["source_crs"], always_xy=True)
    x, y = transformer.transform(float(lon), float(lat))
    transform = ~get_affine_transform(geo_reference)
    return transform * (x, y)


def calculate_area_sqm(
    bbox_pixels: List[float],
    image_size: Tuple[int, int],
    geo_reference: Dict[str, Any],
) -> float | None:
    del image_size
    return geodesic_area_sqm(bbox_to_wgs84_polygon(bbox_pixels, geo_reference))


def build_precise_geometry(
    *,
    bbox_pixels: Sequence[float],
    mask_polygon: Iterable[Sequence[float]] | None,
    geo_reference: Dict[str, Any] | None,
) -> Tuple[List[float] | None, List[List[float]] | None, float | None]:
    """
    Build WGS84 bounds, polygon, and geodesic area from pixel geometry.
    """
    if not georeference_has_spatial_data(geo_reference):
        return None, None, None

    if mask_polygon:
        geo_ring = pixel_ring_to_wgs84_ring(mask_polygon, geo_reference)
    else:
        geo_ring = bbox_to_wgs84_polygon(bbox_pixels, geo_reference)

    bbox_geo = bounds_from_ring(geo_ring)
    area_sqm = geodesic_area_sqm(geo_ring)
    return bbox_geo, geo_ring, area_sqm

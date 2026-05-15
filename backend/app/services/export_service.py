"""
Export service — converts detection results to GeoJSON, CSV, and Shapefile.
"""
import csv
import io
import json
import os
import tempfile
import zipfile
from typing import Any, Dict, List

from app.utils.geo_utils import build_bbox_ring, close_ring


def _detection_geometry(det: Dict[str, Any]) -> tuple[Dict[str, Any], bool]:
    """
    Return GeoJSON-like geometry and whether it is geographic (WGS84).
    """
    if det.get("geo_polygon") and len(det["geo_polygon"]) > 2:
        return {
            "type": "Polygon",
            "coordinates": [close_ring(det["geo_polygon"])],
        }, True

    if det.get("bbox_geo"):
        lon1, lat1, lon2, lat2 = det["bbox_geo"]
        return {
            "type": "Polygon",
            "coordinates": [[
                [lon1, lat1],
                [lon2, lat1],
                [lon2, lat2],
                [lon1, lat2],
                [lon1, lat1],
            ]],
        }, True

    if det.get("mask_polygon") and len(det["mask_polygon"]) > 2:
        return {
            "type": "Polygon",
            "coordinates": [close_ring(det["mask_polygon"])],
        }, False

    return {
        "type": "Polygon",
        "coordinates": [build_bbox_ring(det.get("bbox_pixels", [0, 0, 0, 0]))],
    }, False


def to_geojson(detections: List[Dict], image_size: Dict) -> str:
    """Convert detection results to GeoJSON FeatureCollection."""
    del image_size
    features = []
    for det in detections:
        geometry, is_geographic = _detection_geometry(det)

        features.append(
            {
                "type": "Feature",
                "geometry": geometry,
                "properties": {
                    "category": det["category"],
                    "confidence": det["confidence"],
                    "area_sqm": det.get("area_sqm"),
                    "color": det.get("color"),
                    "geometry_space": "wgs84" if is_geographic else "pixel",
                },
            }
        )

    return json.dumps(
        {"type": "FeatureCollection", "features": features}, indent=2
    )


def to_csv(detections: List[Dict]) -> str:
    """Convert detections to CSV string."""
    output = io.StringIO()
    fieldnames = [
        "category",
        "confidence",
        "bbox_x1",
        "bbox_y1",
        "bbox_x2",
        "bbox_y2",
        "geo_lon1",
        "geo_lat1",
        "geo_lon2",
        "geo_lat2",
        "area_sqm",
        "color",
        "has_geo_polygon",
    ]
    writer = csv.DictWriter(output, fieldnames=fieldnames)
    writer.writeheader()

    for det in detections:
        bbox = det.get("bbox_pixels", [None] * 4)
        geo = det.get("bbox_geo") or [None] * 4
        writer.writerow(
            {
                "category": det["category"],
                "confidence": det["confidence"],
                "bbox_x1": bbox[0],
                "bbox_y1": bbox[1],
                "bbox_x2": bbox[2],
                "bbox_y2": bbox[3],
                "geo_lon1": geo[0],
                "geo_lat1": geo[1],
                "geo_lon2": geo[2],
                "geo_lat2": geo[3],
                "area_sqm": det.get("area_sqm"),
                "color": det.get("color"),
                "has_geo_polygon": bool(det.get("geo_polygon")),
            }
        )
    return output.getvalue()


def to_shapefile(detections: List[Dict], image_size: Dict) -> bytes:
    """
    Convert detections to Shapefile (zipped .shp/.shx/.dbf/.prj).
    Returns bytes of a zip archive.
    """
    try:
        import shapefile
    except ImportError:
        # Fallback: return GeoJSON as a workaround
        raise ImportError("pyshp package not installed. Run: pip install pyshp")

    with tempfile.TemporaryDirectory() as tmpdir:
        shp_path = os.path.join(tmpdir, "detections")
        w = shapefile.Writer(shp_path)

        # Define fields
        w.field("category", "C", size=40)
        w.field("confidence", "N", decimal=3)
        w.field("area_sqm", "N", decimal=2)
        w.field("color", "C", size=10)
        w.field("space", "C", size=12)

        has_geographic_geometry = False

        for det in detections:
            geometry, is_geographic = _detection_geometry(det)
            has_geographic_geometry = has_geographic_geometry or is_geographic
            ring = geometry["coordinates"][0]

            w.poly([ring])

            w.record(
                category=det["category"],
                confidence=det["confidence"],
                area_sqm=det.get("area_sqm") or 0,
                color=det.get("color", ""),
                space="wgs84" if is_geographic else "pixel",
            )

        w.close()

        if has_geographic_geometry:
            prj_path = shp_path + ".prj"
            with open(prj_path, "w") as prj:
                prj.write(
                    'GEOGCS["GCS_WGS_1984",DATUM["D_WGS_1984",'
                    'SPHEROID["WGS_1984",6378137,298.257223563]],'
                    'PRIMEM["Greenwich",0],UNIT["Degree",0.017453292519943295]]'
                )

        # Zip all shapefile components
        zip_buffer = io.BytesIO()
        with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zf:
            for ext in [".shp", ".shx", ".dbf", ".prj"]:
                filepath = shp_path + ext
                if os.path.exists(filepath):
                    zf.write(filepath, f"detections{ext}")

        return zip_buffer.getvalue()

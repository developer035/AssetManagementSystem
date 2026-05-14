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


def to_geojson(detections: List[Dict], image_size: Dict) -> str:
    """Convert detection results to GeoJSON FeatureCollection."""
    features = []
    for det in detections:
        if det.get("bbox_geo"):
            lon1, lat1, lon2, lat2 = det["bbox_geo"]
            geometry = {
                "type": "Polygon",
                "coordinates": [
                    [
                        [lon1, lat1],
                        [lon2, lat1],
                        [lon2, lat2],
                        [lon1, lat2],
                        [lon1, lat1],
                    ]
                ],
            }
        elif det.get("mask_polygon") and len(det["mask_polygon"]) > 2:
            # Pixel coordinates — no geo transform available
            coords = det["mask_polygon"]
            # Close the polygon ring
            if coords[0] != coords[-1]:
                coords = coords + [coords[0]]
            geometry = {"type": "Polygon", "coordinates": [coords]}
        else:
            # Fall back to pixel bounding box as geometry
            x1, y1, x2, y2 = det.get("bbox_pixels", [0, 0, 0, 0])
            geometry = {
                "type": "Polygon",
                "coordinates": [
                    [
                        [x1, y1],
                        [x2, y1],
                        [x2, y2],
                        [x1, y2],
                        [x1, y1],
                    ]
                ],
            }

        features.append(
            {
                "type": "Feature",
                "geometry": geometry,
                "properties": {
                    "category": det["category"],
                    "confidence": det["confidence"],
                    "area_sqm": det.get("area_sqm"),
                    "color": det.get("color"),
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

        for det in detections:
            if det.get("bbox_geo"):
                lon1, lat1, lon2, lat2 = det["bbox_geo"]
            else:
                # Use pixel coords as fallback
                x1, y1, x2, y2 = det.get("bbox_pixels", [0, 0, 0, 0])
                lon1, lat1, lon2, lat2 = x1, y1, x2, y2

            # Write polygon
            w.poly([[
                [lon1, lat1],
                [lon2, lat1],
                [lon2, lat2],
                [lon1, lat2],
                [lon1, lat1],
            ]])

            w.record(
                category=det["category"],
                confidence=det["confidence"],
                area_sqm=det.get("area_sqm") or 0,
                color=det.get("color", ""),
            )

        # Write .prj file (WGS84)
        prj_path = shp_path + ".prj"
        with open(prj_path, "w") as prj:
            prj.write(
                'GEOGCS["GCS_WGS_1984",DATUM["D_WGS_1984",'
                'SPHEROID["WGS_1984",6378137,298.257223563]],'
                'PRIMEM["Greenwich",0],UNIT["Degree",0.017453292519943295]]'
            )

        w.close()

        # Zip all shapefile components
        zip_buffer = io.BytesIO()
        with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zf:
            for ext in [".shp", ".shx", ".dbf", ".prj"]:
                filepath = shp_path + ext
                if os.path.exists(filepath):
                    zf.write(filepath, f"detections{ext}")

        return zip_buffer.getvalue()

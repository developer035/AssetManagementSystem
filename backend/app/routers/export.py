"""
Export router — download results as GeoJSON, CSV, or Shapefile.
"""
import json
import os

import aiofiles
from fastapi import APIRouter, HTTPException
from fastapi.responses import Response

from app.config import settings
from app.services.export_service import to_csv, to_geojson, to_shapefile

router = APIRouter(tags=["export"])


@router.get("/export/{job_id}/geojson")
async def export_geojson(job_id: str):
    """Download detection results as GeoJSON."""
    result = await _load_result(job_id)
    geojson_str = to_geojson(result["detections"], result["image_size"])
    return Response(
        content=geojson_str,
        media_type="application/geo+json",
        headers={"Content-Disposition": f'attachment; filename="{job_id}.geojson"'},
    )


@router.get("/export/{job_id}/csv")
async def export_csv(job_id: str):
    """Download detection results as CSV."""
    result = await _load_result(job_id)
    csv_str = to_csv(result["detections"])
    return Response(
        content=csv_str,
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{job_id}.csv"'},
    )


@router.get("/export/{job_id}/shapefile")
async def export_shapefile(job_id: str):
    """Download detection results as Shapefile (zipped)."""
    result = await _load_result(job_id)
    try:
        shp_bytes = to_shapefile(result["detections"], result["image_size"])
    except ImportError as e:
        raise HTTPException(500, str(e))
    return Response(
        content=shp_bytes,
        media_type="application/zip",
        headers={"Content-Disposition": f'attachment; filename="{job_id}_shapefile.zip"'},
    )


async def _load_result(job_id: str) -> dict:
    """Load persisted detection result."""
    from app.services.storage import storage_client
    result_str = await storage_client.load_result(f"{job_id}.json")
    if not result_str:
        raise HTTPException(404, "Job not found")
    return json.loads(result_str)

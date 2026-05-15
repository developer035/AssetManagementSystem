"""
DIGIT Urban Governance Integration Service
============================================
Persistent mock integration with the DIGIT Urban Asset Registry API.
"""
import json
import os
import sqlite3
import uuid
from datetime import datetime
from typing import Any, Dict, List

from app.config import settings


REGISTRY_DB_PATH = os.path.join(settings.RESULTS_DIR, "digit_registry.sqlite3")


def _connect() -> sqlite3.Connection:
    os.makedirs(settings.RESULTS_DIR, exist_ok=True)
    connection = sqlite3.connect(REGISTRY_DB_PATH)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA journal_mode=WAL;")
    connection.execute("PRAGMA foreign_keys=ON;")
    return connection


def _initialize_registry():
    with _connect() as connection:
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS digit_assets (
                asset_id TEXT PRIMARY KEY,
                tenant_id TEXT NOT NULL,
                asset_category TEXT NOT NULL,
                asset_sub_category TEXT NOT NULL,
                status TEXT NOT NULL,
                survey_id TEXT NOT NULL,
                ward TEXT NOT NULL,
                location_json TEXT NOT NULL,
                confidence REAL NOT NULL,
                detection_method TEXT NOT NULL,
                survey_date TEXT NOT NULL,
                created_at TEXT NOT NULL,
                audit_details_json TEXT NOT NULL
            )
            """
        )
        connection.execute(
            "CREATE INDEX IF NOT EXISTS idx_digit_assets_tenant ON digit_assets(tenant_id)"
        )
        connection.execute(
            "CREATE INDEX IF NOT EXISTS idx_digit_assets_category ON digit_assets(asset_sub_category)"
        )
        connection.execute(
            "CREATE INDEX IF NOT EXISTS idx_digit_assets_survey ON digit_assets(survey_id)"
        )


def _deserialize_asset(row: sqlite3.Row) -> Dict[str, Any]:
    return {
        "assetId": row["asset_id"],
        "tenantId": row["tenant_id"],
        "assetCategory": row["asset_category"],
        "assetSubCategory": row["asset_sub_category"],
        "status": row["status"],
        "surveyId": row["survey_id"],
        "ward": row["ward"],
        "location": json.loads(row["location_json"]),
        "confidence": row["confidence"],
        "detectionMethod": row["detection_method"],
        "surveyDate": row["survey_date"],
        "createdAt": row["created_at"],
        "auditDetails": json.loads(row["audit_details_json"]),
    }


_initialize_registry()


def push_to_digit(
    detections: List[Dict],
    job_id: str,
    city_name: str = "Default City",
    ward_number: str = "W-001",
    survey_date: str = None,
) -> Dict[str, Any]:
    """
    Push detected assets to the persisted DIGIT Urban Asset Registry mock.
    """
    if not survey_date:
        survey_date = datetime.utcnow().isoformat()

    tenant_id = f"pg.{city_name.lower().replace(' ', '')}"
    registered_assets = []
    category_count = {}
    created_at = datetime.utcnow().isoformat()
    created_time_ms = int(datetime.utcnow().timestamp() * 1000)

    with _connect() as connection:
        for det in detections:
            category = det["category"]
            category_count[category] = category_count.get(category, 0) + 1

            asset_id = f"DIGIT-{city_name[:3].upper()}-{uuid.uuid4().hex[:8].upper()}"
            asset_record = {
                "assetId": asset_id,
                "tenantId": tenant_id,
                "assetCategory": _map_to_digit_category(category),
                "assetSubCategory": category,
                "status": "ACTIVE",
                "surveyId": job_id,
                "ward": ward_number,
                "location": {
                    "bbox": det.get("bbox_geo") or det.get("bbox_pixels"),
                    "polygon": det.get("geo_polygon") or det.get("mask_polygon"),
                    "area_sqm": det.get("area_sqm"),
                },
                "confidence": det["confidence"],
                "detectionMethod": "AI-YOLOv11-Seg",
                "surveyDate": survey_date,
                "createdAt": created_at,
                "auditDetails": {
                    "createdBy": "spatial-asset-intelligence",
                    "lastModifiedBy": "spatial-asset-intelligence",
                    "createdTime": created_time_ms,
                    "lastModifiedTime": created_time_ms,
                },
            }

            connection.execute(
                """
                INSERT INTO digit_assets (
                    asset_id,
                    tenant_id,
                    asset_category,
                    asset_sub_category,
                    status,
                    survey_id,
                    ward,
                    location_json,
                    confidence,
                    detection_method,
                    survey_date,
                    created_at,
                    audit_details_json
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    asset_record["assetId"],
                    asset_record["tenantId"],
                    asset_record["assetCategory"],
                    asset_record["assetSubCategory"],
                    asset_record["status"],
                    asset_record["surveyId"],
                    asset_record["ward"],
                    json.dumps(asset_record["location"]),
                    asset_record["confidence"],
                    asset_record["detectionMethod"],
                    asset_record["surveyDate"],
                    asset_record["createdAt"],
                    json.dumps(asset_record["auditDetails"]),
                ),
            )
            registered_assets.append(
                {
                    "assetId": asset_id,
                    "category": category,
                    "status": "REGISTERED",
                }
            )

    return {
        "responseInfo": {
            "apiId": "asset-services",
            "ver": "1.0",
            "ts": int(datetime.utcnow().timestamp() * 1000),
            "resMsgId": str(uuid.uuid4()),
            "msgId": str(uuid.uuid4()),
            "status": "successful",
        },
        "totalRegistered": len(registered_assets),
        "categoryBreakdown": category_count,
        "registeredAssets": registered_assets,
        "tenantId": tenant_id,
        "surveyId": job_id,
    }


def get_digit_registry(
    city_name: str = None,
    category: str = None,
    limit: int = 50,
) -> Dict[str, Any]:
    """Retrieve assets from the persisted DIGIT registry."""
    conditions = []
    parameters: List[Any] = []

    if city_name:
        conditions.append("tenant_id = ?")
        parameters.append(f"pg.{city_name.lower().replace(' ', '')}")

    if category:
        conditions.append("asset_sub_category = ?")
        parameters.append(category)

    query = "SELECT * FROM digit_assets"
    if conditions:
        query += " WHERE " + " AND ".join(conditions)
    query += " ORDER BY created_at DESC LIMIT ?"
    parameters.append(limit)

    with _connect() as connection:
        rows = connection.execute(query, parameters).fetchall()
        total_count = connection.execute(
            "SELECT COUNT(*) AS count FROM digit_assets"
            + (" WHERE " + " AND ".join(conditions) if conditions else ""),
            parameters[:-1],
        ).fetchone()["count"]

    return {
        "responseInfo": {
            "status": "successful",
            "ts": int(datetime.utcnow().timestamp() * 1000),
        },
        "totalCount": total_count,
        "assets": [_deserialize_asset(row) for row in rows],
    }


def get_registry_stats() -> Dict[str, Any]:
    """Get summary statistics of the persisted DIGIT registry."""
    with _connect() as connection:
        total_assets = connection.execute(
            "SELECT COUNT(*) AS count FROM digit_assets"
        ).fetchone()["count"]
        if total_assets == 0:
            return {"totalAssets": 0, "categories": {}, "cities": []}

        category_rows = connection.execute(
            """
            SELECT asset_sub_category, COUNT(*) AS count
            FROM digit_assets
            GROUP BY asset_sub_category
            ORDER BY count DESC
            """
        ).fetchall()
        city_rows = connection.execute(
            "SELECT DISTINCT tenant_id FROM digit_assets ORDER BY tenant_id"
        ).fetchall()
        last_updated = connection.execute(
            "SELECT created_at FROM digit_assets ORDER BY created_at DESC LIMIT 1"
        ).fetchone()["created_at"]

    return {
        "totalAssets": total_assets,
        "categories": {row["asset_sub_category"]: row["count"] for row in category_rows},
        "cities": [row["tenant_id"] for row in city_rows],
        "lastUpdated": last_updated,
    }


def _map_to_digit_category(category: str) -> str:
    mapping = {
        "Properties & Buildings": "IMMOVABLE_BUILDING",
        "Trees & Green Cover": "IMMOVABLE_LAND_GREENCOVER",
        "Parks & Open Spaces": "IMMOVABLE_LAND_OPENSPACE",
        "Water Bodies": "IMMOVABLE_WATER",
        "Roads & Footpaths": "IMMOVABLE_ROAD",
        "Drains & Sewage": "IMMOVABLE_DRAIN",
        "Vehicles & Parking": "MOVABLE_VEHICLE",
        "Waste Dumps": "IMMOVABLE_LAND_WASTE",
    }
    return mapping.get(category, "IMMOVABLE_OTHER")

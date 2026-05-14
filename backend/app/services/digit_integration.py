"""
DIGIT Urban Governance Integration Service
============================================
Mock integration with DIGIT Urban Asset Registry API.
Pushes detected asset data into a simulated DIGIT endpoint.
"""
import uuid
import json
from datetime import datetime
from typing import Dict, Any, List

# In-memory mock DIGIT registry
_DIGIT_REGISTRY: List[Dict] = []


def push_to_digit(
    detections: List[Dict],
    job_id: str,
    city_name: str = "Default City",
    ward_number: str = "W-001",
    survey_date: str = None,
) -> Dict[str, Any]:
    """
    Push detected assets to mock DIGIT Urban Asset Registry.

    Args:
        detections: List of detections from the detector
        job_id: Detection job identifier
        city_name: City/ULB name
        ward_number: Ward or zone number
        survey_date: Date of survey (ISO format)

    Returns:
        DIGIT API response with registered asset IDs.
    """
    if not survey_date:
        survey_date = datetime.utcnow().isoformat()

    registered_assets = []
    category_count = {}

    for det in detections:
        category = det["category"]
        category_count[category] = category_count.get(category, 0) + 1

        asset_id = f"DIGIT-{city_name[:3].upper()}-{uuid.uuid4().hex[:8].upper()}"

        asset_record = {
            "assetId": asset_id,
            "tenantId": f"pg.{city_name.lower().replace(' ', '')}",
            "assetCategory": _map_to_digit_category(category),
            "assetSubCategory": category,
            "status": "ACTIVE",
            "surveyId": job_id,
            "ward": ward_number,
            "location": {
                "bbox": det.get("bbox_geo") or det.get("bbox_pixels"),
                "area_sqm": det.get("area_sqm"),
            },
            "confidence": det["confidence"],
            "detectionMethod": "AI-YOLOv11-Seg",
            "surveyDate": survey_date,
            "createdAt": datetime.utcnow().isoformat(),
            "auditDetails": {
                "createdBy": "spatial-asset-intelligence",
                "lastModifiedBy": "spatial-asset-intelligence",
                "createdTime": int(datetime.utcnow().timestamp() * 1000),
                "lastModifiedTime": int(datetime.utcnow().timestamp() * 1000),
            },
        }

        _DIGIT_REGISTRY.append(asset_record)
        registered_assets.append({
            "assetId": asset_id,
            "category": category,
            "status": "REGISTERED",
        })

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
        "tenantId": f"pg.{city_name.lower().replace(' ', '')}",
        "surveyId": job_id,
    }


def get_digit_registry(
    city_name: str = None,
    category: str = None,
    limit: int = 50,
) -> Dict[str, Any]:
    """Retrieve assets from mock DIGIT registry."""
    results = _DIGIT_REGISTRY.copy()

    if city_name:
        tenant = f"pg.{city_name.lower().replace(' ', '')}"
        results = [r for r in results if r["tenantId"] == tenant]

    if category:
        results = [r for r in results if r["assetSubCategory"] == category]

    return {
        "responseInfo": {
            "status": "successful",
            "ts": int(datetime.utcnow().timestamp() * 1000),
        },
        "totalCount": len(results),
        "assets": results[:limit],
    }


def get_registry_stats() -> Dict[str, Any]:
    """Get summary statistics of the DIGIT registry."""
    if not _DIGIT_REGISTRY:
        return {"totalAssets": 0, "categories": {}, "cities": []}

    categories = {}
    cities = set()
    for asset in _DIGIT_REGISTRY:
        cat = asset["assetSubCategory"]
        categories[cat] = categories.get(cat, 0) + 1
        cities.add(asset["tenantId"])

    return {
        "totalAssets": len(_DIGIT_REGISTRY),
        "categories": categories,
        "cities": list(cities),
        "lastUpdated": _DIGIT_REGISTRY[-1]["createdAt"] if _DIGIT_REGISTRY else None,
    }


def _map_to_digit_category(category: str) -> str:
    """Map our categories to DIGIT asset category codes."""
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

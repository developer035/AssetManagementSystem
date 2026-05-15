"""
Detection router — handles image upload, inference, change detection,
height estimation, and DIGIT integration.
"""
import io
import json
import os
import uuid
from binascii import Error as BinasciiError
from functools import partial

import aiofiles
from fastapi import APIRouter, BackgroundTasks, File, Form, HTTPException, Request, UploadFile
from fastapi.concurrency import run_in_threadpool
from fastapi.responses import JSONResponse
from PIL import Image, UnidentifiedImageError

from app.config import settings
from app.services.geo_processor import extract_geo_transform

router = APIRouter(tags=["detection"])


async def _read_upload_bytes(
    file: UploadFile,
    *,
    expected_prefix: str,
    max_size_mb: int,
) -> bytes:
    if not file.content_type or not file.content_type.startswith(expected_prefix):
        kind = expected_prefix.rstrip("/")
        raise HTTPException(400, f"Only {kind} files are accepted.")

    contents = await file.read()
    if not contents:
        raise HTTPException(400, "Uploaded file is empty.")

    if len(contents) > max_size_mb * 1024 * 1024:
        raise HTTPException(413, f"File too large. Maximum is {max_size_mb}MB.")

    return contents


def _load_rgb_image(contents: bytes) -> Image.Image:
    try:
        return Image.open(io.BytesIO(contents)).convert("RGB")
    except (UnidentifiedImageError, OSError) as exc:
        raise HTTPException(400, "Uploaded file is not a valid image.") from exc


def _get_request_detector(request: Request):
    detector = getattr(request.app.state, "detector", None)
    if detector is None:
        from app.models.detector import AssetDetector

        detector = AssetDetector(model_path=settings.MODEL_PATH)
        request.app.state.detector = detector
    return detector


def _build_detection_job_payload(
    *,
    job_id: str,
    safe_filename: str,
    original_filename: str | None,
    geo_transform,
    status: str,
    error: str | None = None,
) -> dict:
    from app.services.storage import storage_client

    payload = {
        "job_id": job_id,
        "status": status,
        "total_detections": 0,
        "detections": [],
        "summary": {},
        "image_size": {"width": 0, "height": 0},
        "image_url": storage_client.get_upload_url(safe_filename),
        "source_file_name": safe_filename,
        "original_filename": original_filename or safe_filename,
        "geo_metadata": geo_transform,
    }
    if error:
        payload["error"] = error
    return payload


def _resolve_detection_status(result: dict) -> str:
    return result.get("status") or "completed"


async def _load_detection_result(job_id: str) -> dict:
    from app.services.storage import storage_client

    result = json.loads(await storage_client.load_result(f"{job_id}.json"))
    result.setdefault("job_id", job_id)
    result.setdefault("status", _resolve_detection_status(result))
    return result


async def _load_completed_detection_result(job_id: str) -> dict:
    result = await _load_detection_result(job_id)
    status = _resolve_detection_status(result)

    if status in {"queued", "processing"}:
        raise HTTPException(409, "Detection job is still processing.")
    if status == "failed":
        raise HTTPException(500, result.get("error") or "Detection job failed.")
    return result


def _submit_detection_job(
    background_tasks: BackgroundTasks,
    *,
    detector,
    job_id: str,
    safe_filename: str,
    original_filename: str | None,
    confidence: float,
    use_sahi: bool,
    geo_transform,
):
    from app.celery_app import celery_app
    from app.tasks import detect_image_task, run_detection_job

    task_kwargs = {
        "job_id": job_id,
        "file_name": safe_filename,
        "original_filename": original_filename,
        "confidence": confidence,
        "use_sahi": use_sahi,
        "geo_transform": geo_transform,
    }

    try:
        inspector = celery_app.control.inspect(timeout=1)
        active_workers = inspector.ping() or {}
        if not active_workers:
            raise RuntimeError("No active Celery workers available.")
        detect_image_task.apply_async(kwargs=task_kwargs, task_id=job_id)
    except Exception as exc:
        print(f"⚠️  Celery submission failed; falling back to in-process background task. Reason: {exc}")
        background_tasks.add_task(run_detection_job, detector=detector, **task_kwargs)


def _derive_height_gsd(geo_metadata: dict | None) -> float:
    if not geo_metadata:
        return 0.3

    try:
        gsd = float(geo_metadata.get("approx_gsd_m") or 0.3)
        return gsd if gsd > 0 else 0.3
    except (TypeError, ValueError):
        return 0.3


def _extract_source_filename(det_result: dict) -> str | None:
    if det_result.get("source_file_name"):
        return det_result["source_file_name"]

    image_url = det_result.get("image_url")
    if not image_url:
        return None
    return os.path.basename(image_url)


def _process_video_job(
    detector,
    input_path: str,
    upload_dir: str,
    job_id: str,
    safe_name: str,
    confidence: float,
    max_frames: int,
) -> dict:
    import cv2

    from app.services.stream_processor import StreamProcessor

    cap = cv2.VideoCapture(input_path)
    if not cap.isOpened():
        raise HTTPException(400, "Failed to open video file.")

    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    video_fps = cap.get(cv2.CAP_PROP_FPS) or 30
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    if total_frames <= 0 or width <= 0 or height <= 0:
        cap.release()
        raise HTTPException(400, "Video contains no readable frames.")

    output_path = os.path.join(upload_dir, f"{job_id}_annotated.mp4")
    fourcc = cv2.VideoWriter_fourcc(*"mp4v")
    out_fps = min(video_fps, 15)
    writer = cv2.VideoWriter(output_path, fourcc, out_fps, (width, height))
    if not writer.isOpened():
        cap.release()
        raise HTTPException(500, "Failed to create annotated video output.")

    processor = StreamProcessor(detector)
    frames_to_sample = max(1, min(max_frames, total_frames))
    sample_interval = max(1, total_frames // frames_to_sample)
    all_detections = {}
    frame_idx = 0
    processed = 0
    last_detections = []

    try:
        while cap.isOpened():
            ret, frame = cap.read()
            if not ret:
                break

            if frame_idx % sample_interval == 0 and processed < max_frames:
                frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                pil_image = Image.fromarray(frame_rgb)

                result = detector.detect(
                    image=pil_image,
                    confidence=confidence,
                    use_sahi=False,
                )

                last_detections = result.get("detections", [])
                for detection in last_detections:
                    category = detection["category"]
                    all_detections[category] = all_detections.get(category, 0) + 1
                processed += 1

            annotated = processor._draw_detections(frame, last_detections)
            annotated = processor._draw_hud(annotated, len(last_detections))
            writer.write(annotated)

            frame_idx += 1
    finally:
        cap.release()
        writer.release()

    return {
        "job_id": job_id,
        "video_info": {
            "filename": safe_name,
            "total_frames": total_frames,
            "fps": video_fps,
            "resolution": f"{width}x{height}",
            "duration_seconds": round(total_frames / max(video_fps, 1), 1),
            "frames_analyzed": processed,
        },
        "category_totals": all_detections,
        "total_unique_detections": sum(all_detections.values()),
        "annotated_video_url": f"/api/video-download/{job_id}",
        "original_video_url": f"/uploads/{job_id}_{safe_name}",
    }


@router.post("/detect")
async def detect_assets(
    request: Request,
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    confidence: float = Form(default=settings.CONFIDENCE_THRESHOLD, ge=0.0, le=1.0),
    use_sahi: bool = Form(default=settings.USE_SAHI),
):
    """
    Upload an aerial/satellite/drone image.
    Returns detected assets with bounding boxes, categories, confidence, area.
    """
    contents = await _read_upload_bytes(
        file,
        expected_prefix="image/",
        max_size_mb=settings.MAX_IMAGE_SIZE_MB,
    )

    # Generate unique job ID
    job_id = str(uuid.uuid4())
    safe_filename = f"{job_id}_" + (os.path.basename(file.filename).replace(" ", "_") if file.filename else "image.jpg")

    # Use Storage Service for upload
    from app.services.storage import storage_client
    await storage_client.save_upload(safe_filename, contents)

    # Try to extract geo transform from GeoTIFF metadata
    # We must download locally if it's S3
    local_path = await storage_client.get_local_path(safe_filename)
    geo_transform = extract_geo_transform(local_path)
    storage_client.cleanup_local_path(local_path)

    queued_payload = _build_detection_job_payload(
        job_id=job_id,
        safe_filename=safe_filename,
        original_filename=file.filename,
        geo_transform=geo_transform,
        status="queued",
    )
    await storage_client.save_result(f"{job_id}.json", json.dumps(queued_payload))

    _submit_detection_job(
        background_tasks,
        detector=_get_request_detector(request),
        job_id=job_id,
        safe_filename=safe_filename,
        original_filename=file.filename,
        confidence=confidence,
        use_sahi=use_sahi,
        geo_transform=geo_transform,
    )
    return JSONResponse(queued_payload, status_code=202)


@router.get("/detect/{job_id}")
async def get_detection_result(job_id: str):
    """Retrieve a stored detection result by job ID."""
    result = await _load_detection_result(job_id)
    status = _resolve_detection_status(result)

    if status in {"queued", "processing"}:
        return JSONResponse(result, status_code=202)
    if status == "failed":
        return JSONResponse(result, status_code=500)
    return JSONResponse(result)


# ═══════════════════════════════════════════════════════════════
#  CHANGE DETECTION — Compare two temporal images
# ═══════════════════════════════════════════════════════════════

@router.post("/change-detect")
async def change_detection(
    request: Request,
    file_before: UploadFile = File(...),
    file_after: UploadFile = File(...),
    sensitivity: float = Form(default=0.3, ge=0.05, le=0.95),
):
    """
    Compare two images of the same area taken at different times.
    Detects changes like new construction, tree felling, encroachment.
    """
    from app.services.change_detection import compute_change_detection

    contents_before = await _read_upload_bytes(
        file_before,
        expected_prefix="image/",
        max_size_mb=settings.MAX_IMAGE_SIZE_MB,
    )
    contents_after = await _read_upload_bytes(
        file_after,
        expected_prefix="image/",
        max_size_mb=settings.MAX_IMAGE_SIZE_MB,
    )

    image_before = _load_rgb_image(contents_before)
    image_after = _load_rgb_image(contents_after)

    job_id = str(uuid.uuid4())

    from app.services.storage import storage_client
    
    # Save both images
    for label, contents in [("before", contents_before), ("after", contents_after)]:
        await storage_client.save_upload(f"{job_id}_{label}.jpg", contents)

    result = await run_in_threadpool(
        compute_change_detection,
        image_before,
        image_after,
        sensitivity,
    )
    result["job_id"] = job_id
    result["image_before_url"] = storage_client.get_upload_url(f"{job_id}_before.jpg")
    result["image_after_url"] = storage_client.get_upload_url(f"{job_id}_after.jpg")

    return JSONResponse(result)


# ═══════════════════════════════════════════════════════════════
#  3D HEIGHT ESTIMATION — Shadow analysis
# ═══════════════════════════════════════════════════════════════

@router.post("/height-estimate")
async def height_estimation(
    request: Request,
    file: UploadFile = File(...),
    sun_elevation: float = Form(default=45.0, gt=0.0, lt=90.0),
    gsd: float = Form(default=0.3, gt=0.0),
):
    """
    Estimate building heights from shadow analysis in aerial imagery.
    """
    from app.services.height_estimation import estimate_heights

    contents = await _read_upload_bytes(
        file,
        expected_prefix="image/",
        max_size_mb=settings.MAX_IMAGE_SIZE_MB,
    )
    image = _load_rgb_image(contents)

    # Run detection first to find buildings
    detector = _get_request_detector(request)
    det_result = await run_in_threadpool(
        detector.detect,
        image=image,
        confidence=0.3,
        use_sahi=False,
    )

    heights = await run_in_threadpool(
        estimate_heights,
        image=image,
        detections=det_result["detections"],
        sun_elevation=sun_elevation,
        gsd=gsd,
    )

    return JSONResponse({
        "total_buildings": len(heights),
        "height_estimates": heights,
        "parameters": {
            "sun_elevation": sun_elevation,
            "gsd_meters_per_pixel": gsd,
        },
    })


# ═══════════════════════════════════════════════════════════════
#  DIGIT INTEGRATION — Mock Urban Governance API
# ═══════════════════════════════════════════════════════════════

@router.post("/digit/push")
async def digit_push_assets(
    request: Request,
    job_id: str = Form(...),
    city_name: str = Form(default="Bangalore"),
    ward_number: str = Form(default="W-001"),
):
    """
    Push detected assets to mock DIGIT Urban Asset Registry.
    """
    from app.services.digit_integration import push_to_digit

    det_result = await _load_completed_detection_result(job_id)

    response = push_to_digit(
        detections=det_result["detections"],
        job_id=job_id,
        city_name=city_name,
        ward_number=ward_number,
    )
    return JSONResponse(response)


@router.get("/digit/registry")
async def digit_get_registry(
    city_name: str = None,
    category: str = None,
    limit: int = 50,
):
    """Retrieve assets from mock DIGIT registry."""
    from app.services.digit_integration import get_digit_registry
    return JSONResponse(get_digit_registry(city_name, category, limit))


@router.get("/digit/stats")
async def digit_registry_stats():
    """Get DIGIT registry summary statistics."""
    from app.services.digit_integration import get_registry_stats
    return JSONResponse(get_registry_stats())


# ═══════════════════════════════════════════════════════════════
#  REAL-TIME DRONE STREAM — WebSocket
# ═══════════════════════════════════════════════════════════════

from fastapi import WebSocket, WebSocketDisconnect
import base64

@router.websocket("/stream")
async def stream_processor(websocket: WebSocket):
    """
    WebSocket endpoint for real-time drone/camera stream processing.
    Client sends base64-encoded JPEG frames, server returns annotated frames.
    """
    await websocket.accept()

    from app.services.stream_processor import StreamProcessor
    detector = getattr(websocket.app.state, "detector", None)
    if detector is None:
        from app.models.detector import AssetDetector

        detector = AssetDetector(model_path=settings.MODEL_PATH)
        websocket.app.state.detector = detector
    processor = StreamProcessor(detector)

    try:
        while True:
            # Receive frame from client
            data = await websocket.receive_text()

            try:
                payload = json.loads(data)
                frame_b64 = payload.get("frame", "")
                confidence = min(max(float(payload.get("confidence", 0.35)), 0.0), 1.0)
                skip_frames = max(1, int(payload.get("skip_frames", 3)))
            except (json.JSONDecodeError, ValueError):
                frame_b64 = data
                confidence = 0.35
                skip_frames = 3

            # Decode base64 frame
            try:
                frame_bytes = base64.b64decode(frame_b64, validate=True)
            except (BinasciiError, ValueError):
                await websocket.send_json({"error": "Invalid base64 frame payload"})
                continue

            # Process frame
            result = await run_in_threadpool(
                processor.process_frame,
                frame_bytes,
                confidence,
                skip_frames,
            )

            # Send annotated frame back
            await websocket.send_json(result)

    except WebSocketDisconnect:
        pass
    except Exception as e:
        try:
            await websocket.send_json({"error": str(e)})
        except Exception:
            pass


# ═══════════════════════════════════════════════════════════════
#  PDF AUDIT REPORT GENERATION
# ═══════════════════════════════════════════════════════════════

from fastapi.responses import Response

@router.post("/report/{job_id}")
async def generate_report(
    request: Request,
    job_id: str,
    city_name: str = Form(default="Bangalore"),
    ward_number: str = Form(default="W-001"),
):
    """Generate a professional PDF audit report for a detection job."""
    from app.services.report_generator import generate_audit_report
    from app.services.height_estimation import estimate_heights

    from app.services.storage import storage_client

    det_result = await _load_completed_detection_result(job_id)

    height_estimates = None
    source_file_name = _extract_source_filename(det_result)
    if source_file_name:
        local_path = None
        try:
            local_path = await storage_client.get_local_path(source_file_name)
            image = await run_in_threadpool(lambda: Image.open(local_path).convert("RGB"))
            height_estimates = await run_in_threadpool(
                estimate_heights,
                image=image,
                detections=det_result.get("detections", []),
                gsd=_derive_height_gsd(det_result.get("geo_metadata")),
            )
        except Exception:
            height_estimates = None
        finally:
            if local_path:
                storage_client.cleanup_local_path(local_path)

    pdf_bytes = await run_in_threadpool(
        generate_audit_report,
        detection_result=det_result,
        job_id=job_id,
        height_estimates=height_estimates,
        city_name=city_name,
        ward_number=ward_number,
    )

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="audit_report_{job_id[:8]}.pdf"'},
    )

# ═══════════════════════════════════════════════════════════════
#  VIDEO FILE PROCESSING — Upload drone recording
# ═══════════════════════════════════════════════════════════════

@router.post("/video-process")
async def process_video(
    request: Request,
    file: UploadFile = File(...),
    confidence: float = Form(default=settings.CONFIDENCE_THRESHOLD, ge=0.0, le=1.0),
    max_frames: int = Form(default=60, ge=1, le=600),
):
    """
    Upload a drone/surveillance video file.
    Processes sampled frames and returns an annotated output video + summary.
    """
    contents = await _read_upload_bytes(
        file,
        expected_prefix="video/",
        max_size_mb=settings.MAX_VIDEO_SIZE_MB,
    )
    job_id = str(uuid.uuid4())

    # Save uploaded video
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    safe_name = (
        os.path.basename(file.filename).replace(" ", "_")
        if file.filename
        else "video.mp4"
    )
    input_path = os.path.join(settings.UPLOAD_DIR, f"{job_id}_{safe_name}")
    async with aiofiles.open(input_path, "wb") as f:
        await f.write(contents)

    video_result = await run_in_threadpool(
        partial(
            _process_video_job,
            _get_request_detector(request),
            input_path,
            settings.UPLOAD_DIR,
            job_id,
            safe_name,
            confidence,
            max_frames,
        )
    )

    result_path = os.path.join(settings.RESULTS_DIR, f"{job_id}_video.json")
    async with aiofiles.open(result_path, "w") as f:
        await f.write(json.dumps(video_result))

    return JSONResponse(video_result)


# ═══════════════════════════════════════════════════════════════
#  VIDEO DOWNLOAD
# ═══════════════════════════════════════════════════════════════

from fastapi.responses import FileResponse

@router.get("/video-download/{job_id}")
async def download_annotated_video(job_id: str):
    """Download the annotated video file."""
    video_path = os.path.join(settings.UPLOAD_DIR, f"{job_id}_annotated.mp4")
    if not os.path.exists(video_path):
        raise HTTPException(404, "Annotated video not found.")

    return FileResponse(
        path=video_path,
        media_type="video/mp4",
        filename=f"annotated_{job_id[:8]}.mp4",
        headers={"Content-Disposition": f'attachment; filename="annotated_{job_id[:8]}.mp4"'},
    )

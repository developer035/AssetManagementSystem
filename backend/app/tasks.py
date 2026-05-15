import io
import json
import os
import tempfile
from typing import Any, Dict, Optional

import cv2
from PIL import Image
from celery import shared_task

from app.config import settings
from app.models.detector import AssetDetector
from app.services.storage import storage_client


_detector = None


def get_detector() -> AssetDetector:
    global _detector
    if _detector is None:
        print(f"Loading YOLO model in Celery worker from {settings.MODEL_PATH}")
        _detector = AssetDetector(model_path=settings.MODEL_PATH)
    return _detector


def _get_s3_client():
    import boto3

    return boto3.client(
        "s3",
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
        region_name=settings.AWS_REGION,
    )


def _load_upload_bytes(file_name: str) -> bytes:
    if settings.USE_S3:
        try:
            s3 = _get_s3_client()
            response = s3.get_object(Bucket=settings.AWS_BUCKET_NAME, Key=f"uploads/{file_name}")
            return response["Body"].read()
        except Exception:
            pass

    path = os.path.join(settings.UPLOAD_DIR, file_name)
    with open(path, "rb") as handle:
        return handle.read()


def _save_result_payload(file_name: str, payload: Dict[str, Any]):
    result_json = json.dumps(payload)

    if settings.USE_S3:
        try:
            s3 = _get_s3_client()
            s3.put_object(
                Bucket=settings.AWS_BUCKET_NAME,
                Key=f"results/{file_name}",
                Body=result_json.encode("utf-8"),
            )
            return
        except Exception:
            pass

    path = os.path.join(settings.RESULTS_DIR, file_name)
    os.makedirs(settings.RESULTS_DIR, exist_ok=True)
    with open(path, "w", encoding="utf-8") as handle:
        handle.write(result_json)


def _build_detection_job_payload(
    *,
    job_id: str,
    file_name: str,
    original_filename: Optional[str],
    geo_transform: Optional[Dict[str, Any]],
    status: str,
    error: Optional[str] = None,
) -> Dict[str, Any]:
    payload = {
        "job_id": job_id,
        "status": status,
        "total_detections": 0,
        "detections": [],
        "summary": {},
        "image_size": {"width": 0, "height": 0},
        "image_url": storage_client.get_upload_url(file_name),
        "source_file_name": file_name,
        "original_filename": original_filename or file_name,
        "geo_metadata": geo_transform,
    }
    if error:
        payload["error"] = error
    return payload


def run_detection_job(
    job_id: str,
    file_name: str,
    original_filename: Optional[str],
    confidence: float,
    use_sahi: bool,
    geo_transform: Optional[Dict[str, Any]] = None,
    detector: Optional[AssetDetector] = None,
):
    _save_result_payload(
        f"{job_id}.json",
        _build_detection_job_payload(
            job_id=job_id,
            file_name=file_name,
            original_filename=original_filename,
            geo_transform=geo_transform,
            status="processing",
        ),
    )

    try:
        contents = _load_upload_bytes(file_name)
        image = Image.open(io.BytesIO(contents)).convert("RGB")

        detector = detector or get_detector()
        result = detector.detect(
            image=image,
            confidence=confidence,
            use_sahi=use_sahi,
            geo_transform=geo_transform,
        )
        result.update(
            {
                "job_id": job_id,
                "status": "completed",
                "image_url": storage_client.get_upload_url(file_name),
                "source_file_name": file_name,
                "original_filename": original_filename or file_name,
                "geo_metadata": geo_transform,
            }
        )
        _save_result_payload(f"{job_id}.json", result)
        return result
    except Exception as exc:
        failure_payload = _build_detection_job_payload(
            job_id=job_id,
            file_name=file_name,
            original_filename=original_filename,
            geo_transform=geo_transform,
            status="failed",
            error=str(exc),
        )
        _save_result_payload(f"{job_id}.json", failure_payload)
        raise


@shared_task(name="detect_image_task")
def detect_image_task(
    job_id: str,
    file_name: str,
    original_filename: Optional[str],
    confidence: float,
    use_sahi: bool,
    geo_transform: Optional[Dict[str, Any]] = None,
):
    return run_detection_job(
        job_id=job_id,
        file_name=file_name,
        original_filename=original_filename,
        confidence=confidence,
        use_sahi=use_sahi,
        geo_transform=geo_transform,
    )


@shared_task(name="process_video_task")
def process_video_task(job_id: str, file_name: str, confidence: float, max_frames: int):
    from app.services.stream_processor import StreamProcessor

    use_s3 = settings.USE_S3
    if use_s3:
        s3 = _get_s3_client()
        response = s3.get_object(Bucket=settings.AWS_BUCKET_NAME, Key=f"uploads/{file_name}")
        contents = response["Body"].read()

        ext = os.path.splitext(file_name)[1]
        temp_input = tempfile.NamedTemporaryFile(delete=False, suffix=ext)
        temp_input.write(contents)
        temp_input.close()
        input_path = temp_input.name
    else:
        input_path = os.path.join(settings.UPLOAD_DIR, file_name)

    cap = cv2.VideoCapture(input_path)
    if not cap.isOpened():
        raise Exception("Failed to open video file.")

    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    video_fps = cap.get(cv2.CAP_PROP_FPS) or 30
    width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    if total_frames <= 0 or width <= 0 or height <= 0:
        cap.release()
        raise Exception("Video contains no readable frames.")

    if use_s3:
        output_path = tempfile.NamedTemporaryFile(delete=False, suffix=".mp4").name
    else:
        output_path = os.path.join(settings.UPLOAD_DIR, f"{job_id}_annotated.mp4")

    fourcc = cv2.VideoWriter_fourcc(*"mp4v")
    out_fps = min(video_fps, 15)
    writer = cv2.VideoWriter(output_path, fourcc, out_fps, (width, height))

    detector = get_detector()
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

    if use_s3:
        with open(output_path, "rb") as handle:
            s3.put_object(
                Bucket=settings.AWS_BUCKET_NAME,
                Key=f"uploads/{job_id}_annotated.mp4",
                Body=handle.read(),
            )
        os.remove(input_path)
        os.remove(output_path)

    video_result = {
        "job_id": job_id,
        "video_info": {
            "filename": file_name,
            "total_frames": total_frames,
            "fps": video_fps,
            "resolution": f"{width}x{height}",
            "duration_seconds": round(total_frames / max(video_fps, 1), 1),
            "frames_analyzed": processed,
        },
        "category_totals": all_detections,
        "total_unique_detections": sum(all_detections.values()),
        "annotated_video_url": storage_client.get_upload_url(f"{job_id}_annotated.mp4"),
        "original_video_url": storage_client.get_upload_url(file_name),
    }

    _save_result_payload(f"{job_id}_video.json", video_result)
    return video_result

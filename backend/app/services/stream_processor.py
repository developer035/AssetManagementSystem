"""
Real-time Drone Stream Processor
=================================
Processes live video frames via WebSocket for real-time asset detection.
Supports webcam simulation and RTSP drone feeds.
"""
import base64
import time
from typing import Any, Dict, List

import cv2
import numpy as np
from PIL import Image


class StreamProcessor:
    """
    Processes individual video frames through YOLO models
    and returns annotated frames with detection overlays.
    """

    # Category colors for drawing (BGR for OpenCV)
    COLORS_BGR = {
        "Properties & Buildings": (60, 76, 231),
        "Trees & Green Cover":   (96, 174, 39),
        "Parks & Open Spaces":   (113, 204, 46),
        "Water Bodies":          (185, 128, 41),
        "Roads & Footpaths":     (166, 165, 149),
        "Drains & Sewage":       (173, 68, 142),
        "Vehicles & Parking":    (18, 156, 243),
        "Waste Dumps":           (0, 84, 211),
    }

    def __init__(self, detector):
        self.detector = detector
        self.total_frame_count = 0
        self.fps_frame_count = 0
        self.fps = 0
        self.last_fps_time = time.time()
        self.last_detections = []

    def process_frame(
        self,
        frame_bytes: bytes,
        confidence: float = 0.35,
        skip_frames: int = 3,
    ) -> Dict[str, Any]:
        """
        Process a single video frame.

        Args:
            frame_bytes: Raw JPEG/PNG frame bytes
            confidence: Detection confidence threshold
            skip_frames: Only run inference every N frames (for performance)

        Returns:
            Dict with annotated frame (base64), detections, and FPS.
        """
        skip_frames = max(1, int(skip_frames))
        self.total_frame_count += 1
        self.fps_frame_count += 1

        # Decode frame
        np_arr = np.frombuffer(frame_bytes, np.uint8)
        frame = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

        if frame is None:
            return {"error": "Invalid frame data"}

        # Run inference only every N frames (performance optimization)
        run_inference = self.total_frame_count % skip_frames == 0

        if run_inference:
            # Convert BGR to RGB for PIL
            frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            pil_image = Image.fromarray(frame_rgb)

            # Run detection (without SAHI for speed)
            result = self.detector.detect(
                image=pil_image,
                confidence=confidence,
                use_sahi=False,
                geo_transform=None,
            )
            self.last_detections = result.get("detections", [])

        # Draw detections on frame
        annotated = self._draw_detections(frame, self.last_detections)

        # Calculate FPS
        now = time.time()
        elapsed = now - self.last_fps_time
        if elapsed >= 1.0:
            self.fps = round(self.fps_frame_count / elapsed, 1)
            self.fps_frame_count = 0
            self.last_fps_time = now

        # Draw HUD (heads-up display)
        annotated = self._draw_hud(annotated, len(self.last_detections))

        # Encode annotated frame to JPEG
        success, buffer = cv2.imencode(
            ".jpg",
            annotated,
            [cv2.IMWRITE_JPEG_QUALITY, 75],
        )
        if not success:
            return {"error": "Failed to encode annotated frame"}
        frame_b64 = base64.b64encode(buffer).decode("utf-8")

        # Build category summary
        cat_counts = {}
        for d in self.last_detections:
            cat = d["category"]
            cat_counts[cat] = cat_counts.get(cat, 0) + 1

        return {
            "frame": frame_b64,
            "fps": self.fps,
            "total_detections": len(self.last_detections),
            "categories": cat_counts,
            "frame_number": self.total_frame_count,
        }

    def _draw_detections(self, frame: np.ndarray, detections: List[Dict]) -> np.ndarray:
        """Draw bounding boxes and labels on the frame."""
        annotated = frame.copy()

        for det in detections:
            bbox = det.get("bbox_pixels", [0, 0, 0, 0])
            x1, y1, x2, y2 = [int(v) for v in bbox]
            category = det["category"]
            conf = det["confidence"]
            color = self.COLORS_BGR.get(category, (255, 255, 255))

            # Draw bounding box
            cv2.rectangle(annotated, (x1, y1), (x2, y2), color, 2)

            # Draw filled label background
            label = f"{category.split('&')[0].strip()} {conf:.0%}"
            font = cv2.FONT_HERSHEY_SIMPLEX
            font_scale = 0.45
            thickness = 1
            (tw, th), _ = cv2.getTextSize(label, font, font_scale, thickness)

            cv2.rectangle(annotated, (x1, y1 - th - 8), (x1 + tw + 6, y1), color, -1)
            cv2.putText(annotated, label, (x1 + 3, y1 - 4), font, font_scale,
                        (255, 255, 255), thickness, cv2.LINE_AA)

            # Draw mask polygon if available
            if det.get("mask_polygon") and len(det["mask_polygon"]) > 2:
                pts = np.array(det["mask_polygon"], dtype=np.int32)
                overlay = annotated.copy()
                cv2.fillPoly(overlay, [pts], color)
                cv2.addWeighted(overlay, 0.25, annotated, 0.75, 0, annotated)
                cv2.polylines(annotated, [pts], True, color, 1)

        return annotated

    def _draw_hud(self, frame: np.ndarray, det_count: int) -> np.ndarray:
        """Draw heads-up display with FPS, detection count, and status."""
        h, w = frame.shape[:2]
        font = cv2.FONT_HERSHEY_SIMPLEX

        # Semi-transparent top bar
        overlay = frame.copy()
        cv2.rectangle(overlay, (0, 0), (w, 40), (0, 0, 0), -1)
        cv2.addWeighted(overlay, 0.7, frame, 0.3, 0, frame)

        # FPS (left)
        fps_color = (0, 255, 0) if self.fps > 10 else (0, 165, 255) if self.fps > 5 else (0, 0, 255)
        cv2.putText(frame, f"FPS: {self.fps}", (10, 28), font, 0.6, fps_color, 2, cv2.LINE_AA)

        # Title (center)
        title = "SPATIAL ASSET INTELLIGENCE - LIVE"
        (tw, _), _ = cv2.getTextSize(title, font, 0.5, 1)
        cv2.putText(frame, title, ((w - tw) // 2, 28), font, 0.5, (255, 255, 255), 1, cv2.LINE_AA)

        # Detection count (right)
        count_text = f"Assets: {det_count}"
        (cw, _), _ = cv2.getTextSize(count_text, font, 0.6, 2)
        cv2.putText(frame, count_text, (w - cw - 10, 28), font, 0.6, (0, 200, 255), 2, cv2.LINE_AA)

        # Pulsing recording indicator
        if int(time.time() * 2) % 2 == 0:
            cv2.circle(frame, (w - cw - 30, 24), 5, (0, 0, 255), -1)

        return frame

    def process_video_file(
        self,
        video_path: str,
        confidence: float = 0.35,
        max_frames: int = 300,
    ) -> Dict[str, Any]:
        """
        Process a video file and return frame-by-frame detection summary.
        Used for uploaded drone video files.
        """
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            return {"error": "Failed to open video file"}

        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        video_fps = cap.get(cv2.CAP_PROP_FPS) or 30
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

        # Sample frames evenly across the video
        frames_to_sample = max(1, min(max_frames, total_frames or 1))
        sample_interval = max(1, total_frames // frames_to_sample) if total_frames else 1

        all_detections = {}
        frame_idx = 0
        processed = 0

        while cap.isOpened() and processed < max_frames:
            ret, frame = cap.read()
            if not ret:
                break

            if frame_idx % sample_interval == 0:
                frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                pil_image = Image.fromarray(frame_rgb)

                result = self.detector.detect(
                    image=pil_image,
                    confidence=confidence,
                    use_sahi=False,
                )

                for d in result.get("detections", []):
                    cat = d["category"]
                    all_detections[cat] = all_detections.get(cat, 0) + 1

                processed += 1

            frame_idx += 1

        cap.release()

        return {
            "video_info": {
                "total_frames": total_frames,
                "fps": video_fps,
                "resolution": f"{width}x{height}",
                "frames_analyzed": processed,
            },
            "category_totals": all_detections,
            "total_unique_assets": sum(all_detections.values()),
        }

"""
Change Detection Service
========================
Compares two aerial/satellite images of the same area taken at different times
to detect changes (new construction, tree felling, encroachment, etc.)
Uses structural similarity + pixel-level differencing + contour analysis.
"""
import cv2
import numpy as np
from PIL import Image
from typing import Dict, Any, List, Tuple


def compute_change_detection(
    image_before: Image.Image,
    image_after: Image.Image,
    sensitivity: float = 0.3,
) -> Dict[str, Any]:
    """
    Detect changes between two temporally-separated images.

    Args:
        image_before: Earlier image (PIL)
        image_after:  Later image (PIL)
        sensitivity:  Change detection sensitivity (0-1, lower = more sensitive)

    Returns:
        Dictionary with change regions, statistics, and diff heatmap data.
    """
    # Resize to same dimensions
    target_size = (640, 640)
    before_resized = image_before.resize(target_size, Image.LANCZOS)
    after_resized = image_after.resize(target_size, Image.LANCZOS)

    # Convert to numpy arrays
    before_np = np.array(before_resized)
    after_np = np.array(after_resized)

    # Convert to grayscale for structural comparison
    before_gray = cv2.cvtColor(before_np, cv2.COLOR_RGB2GRAY)
    after_gray = cv2.cvtColor(after_np, cv2.COLOR_RGB2GRAY)

    # ── Method 1: Absolute Difference ──
    diff = cv2.absdiff(before_gray, after_gray)

    # Apply Gaussian blur to reduce noise
    diff_blurred = cv2.GaussianBlur(diff, (7, 7), 0)

    # Threshold based on sensitivity
    threshold_value = int((1 - sensitivity) * 128)
    _, thresh = cv2.threshold(diff_blurred, threshold_value, 255, cv2.THRESH_BINARY)

    # Morphological operations to clean up
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
    thresh = cv2.morphologyEx(thresh, cv2.MORPH_CLOSE, kernel, iterations=2)
    thresh = cv2.morphologyEx(thresh, cv2.MORPH_OPEN, kernel, iterations=1)

    # ── Method 2: SSIM-based ──
    from skimage.metrics import structural_similarity
    ssim_score, ssim_diff = structural_similarity(
        before_gray, after_gray, full=True
    )
    ssim_diff_uint8 = ((1 - ssim_diff) * 255).astype(np.uint8)

    # Combine both methods
    combined_diff = cv2.addWeighted(thresh, 0.5, ssim_diff_uint8, 0.5, 0)
    _, combined_thresh = cv2.threshold(combined_diff, 60, 255, cv2.THRESH_BINARY)

    # Find contours (change regions)
    contours, _ = cv2.findContours(
        combined_thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE
    )

    # Filter small contours (noise)
    min_area = target_size[0] * target_size[1] * 0.001  # 0.1% of image
    significant_contours = [c for c in contours if cv2.contourArea(c) > min_area]

    # Classify change regions
    change_regions = []
    for i, contour in enumerate(significant_contours):
        x, y, w, h = cv2.boundingRect(contour)
        area = cv2.contourArea(contour)
        area_pct = (area / (target_size[0] * target_size[1])) * 100

        # Analyze color change to classify
        roi_before = before_np[y:y+h, x:x+w]
        roi_after = after_np[y:y+h, x:x+w]

        change_type = _classify_change(roi_before, roi_after)

        # Scale bbox back to original proportions
        scale_x = image_after.width / target_size[0]
        scale_y = image_after.height / target_size[1]

        change_regions.append({
            "id": i + 1,
            "bbox": [
                int(x * scale_x), int(y * scale_y),
                int((x + w) * scale_x), int((y + h) * scale_y)
            ],
            "area_pct": round(area_pct, 2),
            "change_type": change_type,
            "severity": _severity_from_area(area_pct),
        })

    # Generate heatmap as base64
    heatmap = _generate_heatmap(before_np, after_np, combined_thresh)

    # Calculate overall statistics
    total_changed_pixels = np.count_nonzero(combined_thresh)
    total_pixels = target_size[0] * target_size[1]
    change_percentage = round((total_changed_pixels / total_pixels) * 100, 2)

    return {
        "ssim_score": round(float(ssim_score), 4),
        "change_percentage": change_percentage,
        "total_change_regions": len(change_regions),
        "change_regions": sorted(change_regions, key=lambda r: r["area_pct"], reverse=True),
        "heatmap_base64": heatmap,
        "summary": _generate_summary(change_regions, change_percentage, ssim_score),
    }


def _classify_change(roi_before: np.ndarray, roi_after: np.ndarray) -> str:
    """Classify the type of change based on color analysis."""
    if roi_before.size == 0 or roi_after.size == 0:
        return "Unknown Change"

    # Average colors
    avg_before = roi_before.mean(axis=(0, 1))
    avg_after = roi_after.mean(axis=(0, 1))

    # Convert to HSV for better analysis
    before_hsv = cv2.cvtColor(
        roi_before.reshape(1, -1, 3).astype(np.uint8), cv2.COLOR_RGB2HSV
    )[0]
    after_hsv = cv2.cvtColor(
        roi_after.reshape(1, -1, 3).astype(np.uint8), cv2.COLOR_RGB2HSV
    )[0]

    avg_hue_before = before_hsv[:, 0].mean()
    avg_hue_after = after_hsv[:, 0].mean()
    avg_sat_before = before_hsv[:, 1].mean()
    avg_sat_after = after_hsv[:, 1].mean()

    # Green loss (tree felling)
    green_before = (35 < avg_hue_before < 85) and avg_sat_before > 50
    green_after = (35 < avg_hue_after < 85) and avg_sat_after > 50

    if green_before and not green_after:
        return "Vegetation Loss (Tree Felling)"
    if not green_before and green_after:
        return "New Vegetation Growth"

    # Grey/Brown increase (new construction)
    brightness_after = avg_after.mean()
    brightness_before = avg_before.mean()

    if brightness_after > brightness_before + 30 and avg_sat_after < 60:
        return "New Construction"
    if brightness_after < brightness_before - 30:
        return "Demolition / Clearing"

    # Blue change (water)
    blue_before = (90 < avg_hue_before < 130)
    blue_after = (90 < avg_hue_after < 130)
    if blue_before and not blue_after:
        return "Water Body Reduction"
    if not blue_before and blue_after:
        return "New Water Body"

    return "Land Use Change"


def _severity_from_area(area_pct: float) -> str:
    """Map area percentage to severity level."""
    if area_pct > 10:
        return "Critical"
    elif area_pct > 5:
        return "High"
    elif area_pct > 1:
        return "Medium"
    return "Low"


def _generate_heatmap(before: np.ndarray, after: np.ndarray, mask: np.ndarray) -> str:
    """Generate a change heatmap as base64-encoded PNG."""
    import base64
    from io import BytesIO

    # Create colored overlay
    diff_color = cv2.absdiff(before, after)
    diff_gray = cv2.cvtColor(diff_color, cv2.COLOR_RGB2GRAY)
    heatmap_colored = cv2.applyColorMap(diff_gray, cv2.COLORMAP_JET)
    heatmap_rgb = cv2.cvtColor(heatmap_colored, cv2.COLOR_BGR2RGB)

    # Blend with after image
    alpha = 0.6
    blended = cv2.addWeighted(after, 1 - alpha, heatmap_rgb, alpha, 0)

    # Draw contours on significant changes
    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    cv2.drawContours(blended, contours, -1, (255, 0, 0), 2)

    # Encode to base64
    pil_img = Image.fromarray(blended)
    buffer = BytesIO()
    pil_img.save(buffer, format="PNG")
    return base64.b64encode(buffer.getvalue()).decode("utf-8")


def _generate_summary(regions: list, change_pct: float, ssim: float) -> str:
    """Generate a human-readable summary."""
    if change_pct < 1:
        return "Minimal changes detected. The area appears largely unchanged."
    elif change_pct < 5:
        return f"Minor changes detected ({change_pct}% area affected). {len(regions)} change region(s) identified."
    elif change_pct < 15:
        return f"Moderate changes detected ({change_pct}% area affected). {len(regions)} significant change region(s) found."
    else:
        return f"Major changes detected ({change_pct}% area affected). {len(regions)} change region(s) require attention."

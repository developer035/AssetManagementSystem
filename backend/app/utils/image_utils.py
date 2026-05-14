"""
Image preprocessing utilities.
"""
from typing import Tuple

import numpy as np
from PIL import Image


def resize_if_needed(image: Image.Image, max_dim: int = 4096) -> Image.Image:
    """Resize image if either dimension exceeds max_dim, preserving aspect ratio."""
    w, h = image.size
    if max(w, h) <= max_dim:
        return image
    scale = max_dim / max(w, h)
    new_w = int(w * scale)
    new_h = int(h * scale)
    return image.resize((new_w, new_h), Image.LANCZOS)


def pad_to_square(image: Image.Image) -> Image.Image:
    """Pad image to square with black borders (useful for YOLO input)."""
    w, h = image.size
    if w == h:
        return image
    size = max(w, h)
    padded = Image.new("RGB", (size, size), (0, 0, 0))
    padded.paste(image, ((size - w) // 2, (size - h) // 2))
    return padded


def get_image_info(image: Image.Image) -> dict:
    """Get basic image metadata."""
    return {
        "width": image.size[0],
        "height": image.size[1],
        "mode": image.mode,
        "format": getattr(image, "format", None),
    }

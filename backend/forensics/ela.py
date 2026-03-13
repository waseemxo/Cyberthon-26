"""Error Level Analysis (ELA) for image forensics."""

import io
import numpy as np
from PIL import Image


def error_level_analysis(file_bytes: bytes, quality: int = 90) -> tuple[float, str]:
    """
    Error Level Analysis: re-saves the image at a known quality level and
    compares pixel differences. AI-generated images tend to have uniform
    error levels (single-pass generation), while manipulated images show
    inconsistent regions where splicing occurred.
    """
    original = Image.open(io.BytesIO(file_bytes)).convert("RGB")
    orig_array = np.array(original, dtype=np.float64)

    # Re-compress at specified quality
    buffer = io.BytesIO()
    original.save(buffer, format="JPEG", quality=quality)
    buffer.seek(0)
    recompressed = Image.open(buffer).convert("RGB")
    recomp_array = np.array(recompressed, dtype=np.float64)

    # Compute per-pixel absolute difference
    diff = np.abs(orig_array - recomp_array)
    ela_map = diff.mean(axis=2)  # Average across RGB channels

    # Statistical analysis of ELA map
    ela_mean = ela_map.mean()
    ela_std = ela_map.std()
    ela_max = ela_map.max()

    # Divide image into blocks and check uniformity
    block_size = 64
    h, w = ela_map.shape
    blocks_y = max(1, h // block_size)
    blocks_x = max(1, w // block_size)

    block_means = []
    for by in range(blocks_y):
        for bx in range(blocks_x):
            y1 = by * block_size
            y2 = min((by + 1) * block_size, h)
            x1 = bx * block_size
            x2 = min((bx + 1) * block_size, w)
            block = ela_map[y1:y2, x1:x2]
            block_means.append(block.mean())

    block_means = np.array(block_means)
    block_std = block_means.std() if len(block_means) > 1 else 0
    block_range = block_means.max() - block_means.min() if len(block_means) > 1 else 0

    # Scoring logic
    # Very uniform ELA = likely single-pass generation (AI) OR unmanipulated photo
    # High block variance = potential splicing
    # Very low overall ELA = heavily compressed or generated

    score = 0.5  # Start neutral

    if block_std < 1.0 and ela_std < 3.0:
        # Extremely uniform — consistent with AI generation
        score = 0.65
        explanation = (
            f"Highly uniform error levels across image (block std={block_std:.2f}, "
            f"overall std={ela_std:.2f}). Consistent with single-pass AI generation, "
            "though also possible with unmanipulated well-compressed photos."
        )
    elif block_std > 5.0 or block_range > 15.0:
        # High variance between blocks — potential manipulation
        score = 0.6
        explanation = (
            f"Significant variation in error levels between image regions "
            f"(block std={block_std:.2f}, range={block_range:.2f}). "
            "May indicate compositing or regional manipulation."
        )
    elif ela_mean < 2.0:
        score = 0.55
        explanation = (
            f"Very low overall error levels (mean={ela_mean:.2f}). "
            "Image may have been generated or heavily processed."
        )
    else:
        score = 0.2
        explanation = (
            f"Normal error level distribution (mean={ela_mean:.2f}, "
            f"std={ela_std:.2f}, block std={block_std:.2f}). "
            "No obvious manipulation or generation artifacts detected."
        )

    return score, explanation

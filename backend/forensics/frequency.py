"""Frequency domain analysis (FFT / DCT) for AI image detection."""

import io
import numpy as np
from PIL import Image


def fft_analysis(file_bytes: bytes) -> tuple[float, str]:
    """
    Analyze frequency spectrum of image using 2D FFT.
    AI-generated images (GANs, diffusion models) show characteristic
    periodic artifacts in the frequency domain — grid patterns at
    regular intervals from the latent space architecture.
    """
    img = Image.open(io.BytesIO(file_bytes)).convert("L")
    img_array = np.array(img, dtype=np.float64)

    # Compute 2D FFT
    fft = np.fft.fft2(img_array)
    fft_shift = np.fft.fftshift(fft)
    magnitude = np.log1p(np.abs(fft_shift))

    # Normalize magnitude spectrum
    mag_min, mag_max = magnitude.min(), magnitude.max()
    if mag_max - mag_min > 0:
        magnitude_norm = (magnitude - mag_min) / (mag_max - mag_min)
    else:
        return 0.5, "Uniform image — frequency analysis inconclusive."

    h, w = magnitude_norm.shape
    cy, cx = h // 2, w // 2

    # Analyze radial energy distribution
    # AI images tend to have energy spikes at specific frequencies
    radial_bins = 50
    radial_energy = np.zeros(radial_bins)
    radial_counts = np.zeros(radial_bins)
    max_r = min(cy, cx)

    for y in range(h):
        for x in range(w):
            r = np.sqrt((y - cy) ** 2 + (x - cx) ** 2)
            bin_idx = int(r / max_r * (radial_bins - 1))
            if bin_idx < radial_bins:
                radial_energy[bin_idx] += magnitude_norm[y, x]
                radial_counts[bin_idx] += 1

    # Avoid division by zero
    radial_counts[radial_counts == 0] = 1
    radial_profile = radial_energy / radial_counts

    # Detect spectral anomalies
    # In natural images, energy falls off smoothly from center
    # AI images often have bumps/spikes at certain frequencies
    if len(radial_profile) > 5:
        diffs = np.diff(radial_profile)
        # Count sign changes (oscillations) in the radial profile
        sign_changes = np.sum(np.diff(np.sign(diffs)) != 0)
        smoothness = sign_changes / len(diffs)
    else:
        smoothness = 0.5

    # Check for grid artifacts (periodic peaks in frequency domain)
    # Look at specific intervals common in diffusion models (8, 16, 32, 64 px)
    grid_score = 0
    for interval in [8, 16, 32, 64]:
        if interval < min(h, w) // 2:
            freq_y = cy + interval
            freq_x = cx + interval
            if freq_y < h and freq_x < w:
                local_val = magnitude_norm[freq_y, freq_x]
                neighbors = magnitude_norm[
                    max(0, freq_y - 2) : freq_y + 3,
                    max(0, freq_x - 2) : freq_x + 3,
                ].mean()
                if local_val > neighbors * 1.5:
                    grid_score += 0.15

    # High-frequency energy ratio
    # AI images sometimes lack or have unusual high-frequency content
    mid_r = radial_bins // 2
    if radial_profile[:mid_r].sum() > 0:
        hf_ratio = radial_profile[mid_r:].sum() / radial_profile[:mid_r].sum()
    else:
        hf_ratio = 0

    # Combine indicators
    score = 0.3  # base

    if smoothness > 0.6:
        score += 0.2  # Noisy radial profile = possible AI artifacts
    elif smoothness < 0.35:
        score -= 0.1  # Very smooth falloff = natural image characteristic

    score += min(grid_score, 0.35)

    if hf_ratio < 0.1:
        score += 0.15  # Suspiciously low high-frequency content
    elif hf_ratio > 0.3:
        score -= 0.1  # Healthy high-frequency content = natural image

    score = max(0.0, min(1.0, score))

    parts = []
    if grid_score > 0.1:
        parts.append(
            f"Periodic grid artifacts detected at diffusion-typical intervals "
            f"(grid indicator: {grid_score:.2f})."
        )
    if smoothness > 0.6:
        parts.append(
            f"Non-smooth radial energy profile (oscillation index: {smoothness:.2f}) "
            "suggests synthetic frequency patterns."
        )
    elif smoothness < 0.35:
        parts.append(
            f"Smooth radial energy falloff (oscillation index: {smoothness:.2f}), "
            "consistent with natural image frequency distribution."
        )
    if hf_ratio < 0.1:
        parts.append(
            f"Abnormally low high-frequency energy ratio ({hf_ratio:.3f}), "
            "possibly indicating AI upscaling or generation smoothing."
        )
    elif hf_ratio > 0.3:
        parts.append(
            f"Healthy high-frequency energy ratio ({hf_ratio:.3f}), "
            "consistent with natural image detail."
        )
    if not parts:
        parts.append(
            f"Frequency spectrum appears within normal range "
            f"(smoothness: {smoothness:.2f}, HF ratio: {hf_ratio:.3f})."
        )

    explanation = " ".join(parts)
    return score, explanation

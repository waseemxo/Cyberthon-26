"""Image forensic analyzer — orchestrates all image analysis techniques."""

import asyncio
import io
import numpy as np
from PIL import Image

from analyzers.base import BaseAnalyzer
from models.schemas import AnalysisTechnique
from forensics.metadata import extract_image_metadata
from forensics.frequency import fft_analysis
from forensics.ela import error_level_analysis


class ImageAnalyzer(BaseAnalyzer):
    def __init__(self):
        self._model_fingerprint: str | None = None
        self._provenance_gaps: list[str] = []

    async def analyze(self, file_path: str, file_bytes: bytes) -> list[AnalysisTechnique]:
        results: list[AnalysisTechnique] = []

        # 1. Metadata inspection (fast, no thread pool needed)
        meta_score, meta_expl, meta_gaps = extract_image_metadata(file_bytes)
        self._provenance_gaps = meta_gaps
        results.append(
            AnalysisTechnique(
                technique="EXIF & Metadata Inspection",
                result=self.score_to_result(meta_score),
                score=round(meta_score, 3),
                explanation=meta_expl,
            )
        )

        # Run CPU-heavy analyses in thread pool
        def _run_image_analyses():
            return (
                fft_analysis(file_bytes),
                error_level_analysis(file_bytes),
                self._pixel_statistics(file_bytes),
                self._color_histogram_analysis(file_bytes),
            )

        fft_result, ela_result, pixel_result, hist_result = await asyncio.to_thread(_run_image_analyses)

        # 2. Frequency domain analysis (FFT)
        results.append(
            AnalysisTechnique(
                technique="Frequency Domain Analysis (FFT)",
                result=self.score_to_result(fft_result[0]),
                score=round(fft_result[0], 3),
                explanation=fft_result[1],
            )
        )

        # 3. Error Level Analysis
        results.append(
            AnalysisTechnique(
                technique="Error Level Analysis (ELA)",
                result=self.score_to_result(ela_result[0]),
                score=round(ela_result[0], 3),
                explanation=ela_result[1],
            )
        )

        # 4. Pixel-level statistical analysis
        results.append(
            AnalysisTechnique(
                technique="Pixel Statistical Analysis",
                result=self.score_to_result(pixel_result[0]),
                score=round(pixel_result[0], 3),
                explanation=pixel_result[1],
            )
        )

        # 5. Color histogram analysis
        results.append(
            AnalysisTechnique(
                technique="Color Histogram Analysis",
                result=self.score_to_result(hist_result[0]),
                score=round(hist_result[0], 3),
                explanation=hist_result[1],
            )
        )

        # Estimate model fingerprint
        scores = [r.score for r in results]
        avg = sum(scores) / len(scores)
        self._estimate_fingerprint(file_bytes, avg)

        return results

    def get_model_fingerprint(self) -> str | None:
        return self._model_fingerprint

    def get_provenance_gaps(self) -> list[str]:
        return self._provenance_gaps

    def _pixel_statistics(self, file_bytes: bytes) -> tuple[float, str]:
        """Analyze pixel-level noise distribution for AI generation indicators."""
        img = Image.open(io.BytesIO(file_bytes)).convert("RGB")
        arr = np.array(img, dtype=np.float64)

        # Compute noise via Laplacian-like filter
        # Differences with neighbors
        noise_h = np.abs(np.diff(arr, axis=1)).mean()
        noise_v = np.abs(np.diff(arr, axis=0)).mean()
        noise_avg = (noise_h + noise_v) / 2

        # Per-channel noise uniformity
        channel_noises = []
        for c in range(3):
            ch = arr[:, :, c]
            ch_noise = (np.abs(np.diff(ch, axis=0)).mean() + np.abs(np.diff(ch, axis=1)).mean()) / 2
            channel_noises.append(ch_noise)

        channel_noise_std = np.std(channel_noises)

        # AI images tend to have very uniform noise across all channels
        score = 0.3
        parts = []

        if channel_noise_std < 0.5:
            score += 0.2
            parts.append(
                f"Extremely uniform noise across color channels (std={channel_noise_std:.3f}). "
                "AI-generated images often have synthetic noise patterns."
            )
        elif channel_noise_std < 1.5:
            parts.append(
                f"Moderate noise channel uniformity (std={channel_noise_std:.3f})."
            )
        else:
            score -= 0.15
            parts.append(
                f"Natural noise variation across channels (std={channel_noise_std:.3f}). "
                "Consistent with camera sensor noise."
            )

        if noise_avg < 3.0:
            score += 0.15
            parts.append(
                f"Very low pixel noise ({noise_avg:.2f}). "
                "Image may be synthetically generated or heavily processed."
            )
        elif noise_avg > 8.0:
            score -= 0.1
            parts.append(
                f"Natural pixel noise level ({noise_avg:.2f}). "
                "Consistent with camera sensor characteristics."
            )

        score = max(0.0, min(1.0, score))
        return score, " ".join(parts)

    def _color_histogram_analysis(self, file_bytes: bytes) -> tuple[float, str]:
        """Analyze color distribution for synthetic image indicators."""
        img = Image.open(io.BytesIO(file_bytes)).convert("RGB")
        arr = np.array(img)

        histograms = []
        for c in range(3):
            hist, _ = np.histogram(arr[:, :, c], bins=256, range=(0, 255))
            histograms.append(hist)

        # Check for gaps in histogram (missing pixel values)
        gaps = [np.sum(h == 0) for h in histograms]
        avg_gaps = np.mean(gaps)

        # Check for unusual peaks/spikes
        smoothness_scores = []
        for h in histograms:
            h_norm = h / (h.sum() + 1e-8)
            diffs = np.abs(np.diff(h_norm))
            smoothness_scores.append(diffs.mean())

        avg_smoothness = np.mean(smoothness_scores)

        score = 0.3
        parts = []

        if avg_gaps > 50:
            score += 0.15
            parts.append(
                f"Significant histogram gaps ({avg_gaps:.0f} avg missing values). "
                "May indicate color quantization from generation."
            )
        elif avg_gaps < 10:
            score -= 0.1
            parts.append(
                f"Full color value range utilized ({avg_gaps:.0f} avg gaps). "
                "Consistent with natural photography."
            )

        if avg_smoothness < 0.0002:
            score += 0.15
            parts.append(
                f"Extremely smooth color distribution. "
                "Natural images typically have more irregular histograms."
            )
        elif avg_smoothness > 0.001:
            score -= 0.1
            parts.append("Natural color distribution with expected irregularities.")

        if not parts:
            parts.append("Color histogram within normal parameters.")

        score = max(0.0, min(1.0, score))
        return score, " ".join(parts)

    def _estimate_fingerprint(self, file_bytes: bytes, avg_score: float):
        """Attempt to identify the generation model from image characteristics."""
        if avg_score < 0.5:
            self._model_fingerprint = None
            return

        img = Image.open(io.BytesIO(file_bytes))
        png_text = {}
        if img.format == "PNG":
            for key, value in img.info.items():
                if isinstance(value, str):
                    png_text[key.lower()] = value.lower()

        all_meta = " ".join(png_text.values())

        if "stable diffusion" in all_meta or "automatic1111" in all_meta or "comfyui" in all_meta:
            self._model_fingerprint = "Stable Diffusion (detected via generation metadata)"
        elif "midjourney" in all_meta:
            self._model_fingerprint = "Midjourney (detected via generation metadata)"
        elif "dall-e" in all_meta or "dall·e" in all_meta:
            self._model_fingerprint = "DALL-E (detected via generation metadata)"
        elif "novelai" in all_meta:
            self._model_fingerprint = "NovelAI (detected via generation metadata)"
        elif avg_score > 0.65:
            # Try to guess from image properties
            w, h = img.size
            if w == h and w in [512, 768, 1024]:
                self._model_fingerprint = (
                    f"Unknown diffusion model (estimated — {w}x{h} square output "
                    "is common for Stable Diffusion / DALL-E)"
                )
            else:
                self._model_fingerprint = "Unknown AI model (estimated — statistical indicators suggest generation)"
        else:
            self._model_fingerprint = None

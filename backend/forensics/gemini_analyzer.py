"""Gemini API forensic analysis — uses multimodal vision for AI content detection & SynthID."""

import os
import io
import logging
from typing import Optional

import cv2
import numpy as np

logger = logging.getLogger(__name__)

_client = None


def _get_client():
    """Lazy-init the Gemini client so import never crashes."""
    global _client
    if _client is not None:
        return _client

    api_key = os.getenv("GEMINI_API_KEY", "")
    if not api_key:
        raise RuntimeError("GEMINI_API_KEY environment variable is not set")

    from google import genai
    _client = genai.Client(api_key=api_key)
    return _client


# ---------------------------------------------------------------------------
# Pydantic response schemas (used for structured JSON output)
# ---------------------------------------------------------------------------
from pydantic import BaseModel, Field


class ArtifactEvidence(BaseModel):
    category: str = Field(description="Category: texture, lighting, anatomy, blending, structure, watermark, temporal, other")
    description: str = Field(description="Specific description of the artifact found")
    severity: str = Field(description="low, medium, or high")


class GeminiImageForensicResponse(BaseModel):
    artifacts_found: list[ArtifactEvidence] = Field(description="List of AI generation artifacts detected")
    overall_assessment: str = Field(description="Brief overall forensic assessment")
    estimated_model: Optional[str] = Field(description="Best guess of the AI model that generated this, or null if likely real")
    synthid_indicators: bool = Field(description="Whether SynthID or Google AI watermark traces were detected")


class GeminiVideoForensicResponse(BaseModel):
    artifacts_found: list[ArtifactEvidence] = Field(description="List of AI generation artifacts detected across frames")
    temporal_issues: list[str] = Field(description="Temporal inconsistencies found between frames")
    overall_assessment: str = Field(description="Brief overall forensic assessment")
    estimated_model: Optional[str] = Field(description="Best guess of the AI model, or null if likely real")
    synthid_indicators: bool = Field(description="Whether SynthID or Google AI watermark traces were detected")


class SynthIDCheckResponse(BaseModel):
    watermark_detected: bool = Field(description="Whether a digital watermark (SynthID or similar) was detected")
    confidence: str = Field(description="none, low, medium, or high")
    evidence: str = Field(description="Description of watermark evidence found, or why none was found")


# ---------------------------------------------------------------------------
# Prompts
# ---------------------------------------------------------------------------

IMAGE_FORENSIC_PROMPT = """You are an expert forensic analyst specializing in detecting AI-generated images.

Analyze this image carefully for signs of AI generation. Look for:
1. **Texture artifacts**: Unnatural smoothness, repeated patterns, smeared details
2. **Lighting inconsistencies**: Impossible shadows, inconsistent light sources, wrong reflections
3. **Anatomical errors**: Extra/missing fingers, asymmetric features, deformed limbs, uncanny faces
4. **Blending artifacts**: Unnatural edges, halo effects, seam lines between regions
5. **Structural errors**: Impossible geometry, warped text, inconsistent perspective
6. **Watermark traces**: SynthID patterns, invisible watermarks, or Google AI generation markers
7. **Background incoherence**: Melting objects, inconsistent depth of field, phantom objects

For each artifact found, categorize it, describe it specifically, and rate its severity.
If the image appears genuine, explain what natural characteristics support that conclusion.

Return a structured JSON response."""

VIDEO_FORENSIC_PROMPT = """You are an expert forensic analyst specializing in detecting AI-generated videos and deepfakes.

I'm providing keyframes extracted from a video. Analyze them for signs of AI generation:
1. **Frame-to-frame consistency**: Lighting changes, object persistence errors, flickering elements
2. **Temporal artifacts**: Unnatural motion blur, jittery backgrounds, inconsistent shadows across frames
3. **Deepfake indicators**: Face warping, edge artifacts around faces, unnatural skin texture, eye/teeth anomalies
4. **Generation artifacts**: Texture repetition, geometric impossibilities, blending seams
5. **Watermark traces**: SynthID patterns or other AI generation markers
6. **Background coherence**: Objects appearing/disappearing, warping backgrounds, inconsistent depth

For each artifact found, categorize it, describe it specifically, and rate its severity.
List any temporal inconsistencies found between frames.

Return a structured JSON response."""

SYNTHID_CHECK_PROMPT = """You are a digital forensics expert specializing in AI watermark detection.

Examine this media carefully for any digital watermarks that indicate AI generation:
1. **SynthID watermark**: Google DeepMind's invisible watermark embedded in AI-generated content
2. **Steganographic markers**: Hidden data patterns in pixel/frequency domain
3. **AI generation signatures**: Metadata or visual patterns specific to known AI models (DALL-E, Midjourney, Stable Diffusion, Imagen, Gemini, etc.)
4. **C2PA/Content Credentials**: Digital provenance markers

Report whether a watermark was detected, your confidence level, and the specific evidence.

Return a structured JSON response."""


# ---------------------------------------------------------------------------
# Core functions
# ---------------------------------------------------------------------------

def _score_from_artifacts(artifacts: list[ArtifactEvidence]) -> float:
    """Convert Gemini's artifact evidence list into a 0-1 score using our backend logic."""
    if not artifacts:
        return 0.2

    severity_weights = {"high": 0.3, "medium": 0.18, "low": 0.08}
    raw = sum(severity_weights.get(a.severity.lower(), 0.1) for a in artifacts)

    # Clamp to [0.15, 0.95] — never fully 0 or 1 from a single technique
    return round(min(0.95, max(0.15, 0.2 + raw)), 3)


async def gemini_image_forensic_analysis(
    file_bytes: bytes, mime_type: str
) -> tuple[float, str, Optional[str], bool]:
    """
    Send image to Gemini for forensic analysis.

    Returns: (score, explanation, model_guess, synthid_detected)
    """
    from google.genai import types

    client = _get_client()

    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=[
            IMAGE_FORENSIC_PROMPT,
            types.Part.from_bytes(data=file_bytes, mime_type=mime_type),
        ],
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=GeminiImageForensicResponse,
            temperature=0.2,
        ),
    )

    import json
    result = json.loads(response.text)
    parsed = GeminiImageForensicResponse(**result)

    score = _score_from_artifacts(parsed.artifacts_found)

    # Build human-readable explanation from evidence
    parts = []
    if parsed.artifacts_found:
        high = [a for a in parsed.artifacts_found if a.severity.lower() == "high"]
        med = [a for a in parsed.artifacts_found if a.severity.lower() == "medium"]
        low = [a for a in parsed.artifacts_found if a.severity.lower() == "low"]
        if high:
            parts.append(f"HIGH severity: {'; '.join(a.description for a in high)}")
        if med:
            parts.append(f"MEDIUM severity: {'; '.join(a.description for a in med)}")
        if low:
            parts.append(f"LOW severity: {'; '.join(a.description for a in low)}")
    parts.append(f"Assessment: {parsed.overall_assessment}")

    explanation = " | ".join(parts)
    return score, explanation, parsed.estimated_model, parsed.synthid_indicators


async def gemini_video_forensic_analysis(
    file_path: str,
) -> tuple[float, str, Optional[str], bool]:
    """
    Upload video via File API, send to Gemini for forensic analysis.

    Returns: (score, explanation, model_guess, synthid_detected)
    """
    from google.genai import types

    client = _get_client()

    # Upload video via File API (required for large files)
    uploaded_file = client.files.upload(file=file_path)
    logger.info("Uploaded video to Gemini File API: %s", uploaded_file.name)

    # Wait for the file to be processed
    import time
    max_wait = 60
    waited = 0
    while uploaded_file.state.name == "PROCESSING" and waited < max_wait:
        time.sleep(2)
        waited += 2
        uploaded_file = client.files.get(name=uploaded_file.name)

    if uploaded_file.state.name != "ACTIVE":
        raise RuntimeError(f"Video file processing failed: state={uploaded_file.state.name}")

    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=[
            VIDEO_FORENSIC_PROMPT,
            types.Part.from_uri(file_uri=uploaded_file.uri, mime_type="video/mp4"),
        ],
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=GeminiVideoForensicResponse,
            temperature=0.2,
        ),
    )

    # Clean up uploaded file
    try:
        client.files.delete(name=uploaded_file.name)
    except Exception:
        pass

    import json
    result = json.loads(response.text)
    parsed = GeminiVideoForensicResponse(**result)

    score = _score_from_artifacts(parsed.artifacts_found)

    # Boost score if temporal issues found
    if parsed.temporal_issues:
        score = min(0.95, score + len(parsed.temporal_issues) * 0.05)
        score = round(score, 3)

    parts = []
    if parsed.artifacts_found:
        high = [a for a in parsed.artifacts_found if a.severity.lower() == "high"]
        med = [a for a in parsed.artifacts_found if a.severity.lower() == "medium"]
        if high:
            parts.append(f"HIGH severity: {'; '.join(a.description for a in high)}")
        if med:
            parts.append(f"MEDIUM severity: {'; '.join(a.description for a in med)}")
    if parsed.temporal_issues:
        parts.append(f"Temporal issues: {'; '.join(parsed.temporal_issues)}")
    parts.append(f"Assessment: {parsed.overall_assessment}")

    explanation = " | ".join(parts)
    return score, explanation, parsed.estimated_model, parsed.synthid_indicators


async def check_synthid_watermark(
    file_bytes: bytes, mime_type: str
) -> tuple[float, str, bool]:
    """
    Dedicated SynthID / digital watermark check via Gemini.

    Returns: (score, explanation, watermark_detected)
    """
    from google.genai import types

    client = _get_client()

    response = client.models.generate_content(
        model="gemini-2.5-flash",
        contents=[
            SYNTHID_CHECK_PROMPT,
            types.Part.from_bytes(data=file_bytes, mime_type=mime_type),
        ],
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=SynthIDCheckResponse,
            temperature=0.1,
        ),
    )

    import json
    result = json.loads(response.text)
    parsed = SynthIDCheckResponse(**result)

    confidence_scores = {"high": 0.85, "medium": 0.65, "low": 0.45, "none": 0.2}
    score = confidence_scores.get(parsed.confidence.lower(), 0.3)

    explanation = parsed.evidence
    if parsed.watermark_detected:
        explanation = f"WATERMARK DETECTED ({parsed.confidence} confidence). {parsed.evidence}"

    return round(score, 3), explanation, parsed.watermark_detected

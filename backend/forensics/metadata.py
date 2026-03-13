"""EXIF and container metadata extraction for forensic analysis."""

import io
import struct
from PIL import Image
from PIL.ExifTags import TAGS


def extract_image_metadata(file_bytes: bytes) -> tuple[float, str, list[str]]:
    """
    Analyze image metadata for AI generation indicators.
    Returns (score, explanation, provenance_gaps).
    """
    provenance_gaps = []
    img = Image.open(io.BytesIO(file_bytes))

    # Gather all metadata findings
    findings = []
    ai_indicators = []

    # 1. Check EXIF data
    exif_data = {}
    try:
        raw_exif = img._getexif()
        if raw_exif:
            exif_data = {TAGS.get(k, k): v for k, v in raw_exif.items()}
    except (AttributeError, Exception):
        pass

    has_camera_info = any(
        key in exif_data
        for key in ["Make", "Model", "LensModel", "FocalLength"]
    )
    has_gps = "GPSInfo" in exif_data
    has_datetime = "DateTimeOriginal" in exif_data or "DateTime" in exif_data

    if not exif_data:
        findings.append("No EXIF data found in image.")
        provenance_gaps.append("No EXIF metadata present")
    else:
        if not has_camera_info:
            findings.append("No camera/device information in EXIF.")
            provenance_gaps.append("No originating camera or device information")
        else:
            findings.append(
                f"Camera info present: {exif_data.get('Make', '?')} "
                f"{exif_data.get('Model', '?')}."
            )

        if not has_gps:
            findings.append("No GPS data found.")
        if not has_datetime:
            findings.append("No original capture date/time.")
            provenance_gaps.append("No original capture timestamp")

    # 2. Check PNG text chunks for AI generation parameters
    png_text = {}
    if img.format == "PNG":
        for key, value in img.info.items():
            if isinstance(value, str):
                png_text[key] = value

    ai_keywords = [
        "stable diffusion", "comfyui", "automatic1111", "midjourney",
        "dall-e", "dall·e", "novelai", "nai diffusion",
        "cfg scale", "sampler", "negative prompt", "steps",
        "seed", "model hash", "clip skip",
    ]

    for key, value in png_text.items():
        val_lower = value.lower()
        for kw in ai_keywords:
            if kw in val_lower or kw in key.lower():
                ai_indicators.append(f"AI generation parameter found in PNG chunk: '{key}'")
                break

    # 3. Check for C2PA / Content Credentials
    # C2PA stores data in JUMBF boxes (JPEG/PNG) — check for the signature
    has_c2pa = False
    raw = file_bytes
    if b'c2pa' in raw or b'jumbf' in raw or b'C2PA' in raw:
        has_c2pa = True
        findings.append("C2PA content credentials signature detected.")
    else:
        provenance_gaps.append("No C2PA content credentials found")

    # 4. Score calculation
    score = 0.4  # Start slightly below neutral

    if not exif_data:
        score += 0.1  # Missing EXIF is common for web images, not strongly suspicious
    elif not has_camera_info:
        score += 0.05

    if ai_indicators:
        score += 0.3
        findings.extend(ai_indicators)

    if has_camera_info and has_datetime:
        score -= 0.25

    if has_c2pa:
        score -= 0.1

    if has_gps:
        score -= 0.1

    score = max(0.0, min(1.0, score))

    explanation = " ".join(findings)
    if not explanation:
        explanation = "Standard metadata analysis completed."

    return score, explanation, provenance_gaps


def extract_audio_metadata(file_bytes: bytes, file_name: str) -> tuple[float, str, list[str]]:
    """Analyze audio file container metadata."""
    provenance_gaps = []
    findings = []

    ext = file_name.rsplit(".", 1)[-1].lower() if "." in file_name else ""

    # Check file size — very small files with perfect quality may be synthetic
    size_kb = len(file_bytes) / 1024

    # Check for common TTS metadata markers
    raw = file_bytes
    tts_markers = [
        b"elevenlabs", b"ElevenLabs",
        b"bark", b"Bark",
        b"tts", b"TTS",
        b"synthesized", b"generated",
        b"tortoise", b"coqui",
    ]

    found_markers = []
    for marker in tts_markers:
        if marker in raw:
            found_markers.append(marker.decode("utf-8", errors="replace"))

    if found_markers:
        score = 0.85
        findings.append(
            f"TTS/AI generation markers found in file: {', '.join(found_markers)}."
        )
    else:
        score = 0.3
        findings.append("No AI generation markers found in file container.")

    # Check for standard recording device metadata
    device_markers = [b"iPhone", b"Android", b"Zoom", b"Audacity", b"Adobe"]
    has_device = any(m in raw for m in device_markers)

    if has_device:
        score -= 0.2
        findings.append("Recording device/software marker detected.")
    else:
        provenance_gaps.append("No recording device information found")

    provenance_gaps.append("No C2PA audio provenance credentials found")

    score = max(0.0, min(1.0, score))
    explanation = " ".join(findings) if findings else "Audio metadata analysis completed."
    return score, explanation, provenance_gaps


def extract_video_metadata(file_bytes: bytes, file_name: str) -> tuple[float, str, list[str]]:
    """Analyze video file container metadata."""
    provenance_gaps = []
    findings = []

    raw = file_bytes[:50000]  # Only check first 50KB for performance

    # AI video tool markers
    ai_markers = [
        b"synthesia", b"Synthesia",
        b"heygen", b"HeyGen",
        b"runway", b"RunwayML",
        b"pika", b"Pika",
        b"sora", b"Sora",
        b"deepfake",
    ]

    found = []
    for marker in ai_markers:
        if marker in raw:
            found.append(marker.decode("utf-8", errors="replace"))

    if found:
        score = 0.85
        findings.append(f"AI video generation markers found: {', '.join(found)}.")
    else:
        score = 0.3
        findings.append("No AI generation markers found in video container.")

    # Camera/device metadata in video
    camera_markers = [b"iPhone", b"GoPro", b"Canon", b"Sony", b"DJI", b"Samsung"]
    has_camera = any(m in raw for m in camera_markers)

    if has_camera:
        score -= 0.2
        findings.append("Camera device marker detected in video.")
    else:
        provenance_gaps.append("No recording device information found")

    provenance_gaps.append("No C2PA video provenance credentials found")

    score = max(0.0, min(1.0, score))
    explanation = " ".join(findings) if findings else "Video metadata analysis completed."
    return score, explanation, provenance_gaps

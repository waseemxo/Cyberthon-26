"""POST /api/analyze — main analysis endpoint."""

import os
import tempfile
from fastapi import APIRouter, UploadFile, File, Request, Response

from api.deps import get_session_id, set_session_cookie
from models.schemas import ForensicReport, FileType
from analyzers.text_analyzer import TextAnalyzer
from analyzers.image_analyzer import ImageAnalyzer
from analyzers.audio_analyzer import AudioAnalyzer
from analyzers.video_analyzer import VideoAnalyzer
from report.generator import build_report
from db.session_store import save_report

router = APIRouter()

MIME_TO_TYPE = {
    "text": FileType.TEXT,
    "image": FileType.IMAGE,
    "audio": FileType.AUDIO,
    "video": FileType.VIDEO,
}

ANALYZERS = {
    FileType.TEXT: TextAnalyzer,
    FileType.IMAGE: ImageAnalyzer,
    FileType.AUDIO: AudioAnalyzer,
    FileType.VIDEO: VideoAnalyzer,
}


def detect_file_type(content_type: str, filename: str) -> FileType:
    """Determine file type from MIME type and extension."""
    if content_type:
        major = content_type.split("/")[0]
        if major in MIME_TO_TYPE:
            return MIME_TO_TYPE[major]

    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    text_exts = {"txt", "md", "csv", "json", "html", "xml", "log", "rtf"}
    image_exts = {"jpg", "jpeg", "png", "gif", "bmp", "webp", "svg", "tiff"}
    audio_exts = {"mp3", "wav", "ogg", "flac", "aac", "m4a", "wma"}
    video_exts = {"mp4", "avi", "mov", "mkv", "webm", "wmv", "flv"}

    if ext in text_exts:
        return FileType.TEXT
    if ext in image_exts:
        return FileType.IMAGE
    if ext in audio_exts:
        return FileType.AUDIO
    if ext in video_exts:
        return FileType.VIDEO

    return FileType.TEXT  # Default fallback


@router.post("/analyze", response_model=ForensicReport)
async def analyze_file(
    request: Request,
    response: Response,
    file: UploadFile = File(...),
):
    session_id = get_session_id(request)
    set_session_cookie(response, session_id)

    file_bytes = await file.read()
    file_name = file.filename or "unknown"
    file_type = detect_file_type(file.content_type or "", file_name)
    file_size = len(file_bytes)

    # Write to temp file (needed for audio/video analysis via librosa/opencv)
    ext = file_name.rsplit(".", 1)[-1] if "." in file_name else "bin"
    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=f".{ext}")
    tmp.write(file_bytes)
    tmp.close()
    tmp_path = tmp.name

    try:
        # Run the appropriate analyzer
        analyzer_cls = ANALYZERS[file_type]
        analyzer = analyzer_cls()
        breakdown = await analyzer.analyze(tmp_path, file_bytes)

        # Build the forensic report
        report = build_report(
            file_name=file_name,
            file_type=file_type,
            file_size=file_size,
            file_bytes=file_bytes,
            breakdown=breakdown,
            model_fingerprint=analyzer.get_model_fingerprint(),
            provenance_gaps=analyzer.get_provenance_gaps(),
        )

        # Save to session history
        await save_report(session_id, report)

        return report
    finally:
        # Clean up temp file
        try:
            os.unlink(tmp_path)
        except OSError:
            pass

"""Video forensic analyzer — orchestrates all video analysis techniques."""

import logging

from analyzers.base import BaseAnalyzer
from models.schemas import AnalysisTechnique
from forensics.metadata import extract_video_metadata
from forensics.temporal import (
    temporal_consistency_analysis,
    face_landmark_analysis,
    optical_flow_analysis,
)
from forensics.gemini_analyzer import (
    gemini_video_forensic_analysis,
    check_synthid_watermark,
)

logger = logging.getLogger(__name__)


class VideoAnalyzer(BaseAnalyzer):
    def __init__(self):
        self._model_fingerprint: str | None = None
        self._provenance_gaps: list[str] = []
        self._gemini_model_guess: str | None = None

    async def analyze(self, file_path: str, file_bytes: bytes) -> list[AnalysisTechnique]:
        results: list[AnalysisTechnique] = []
        file_name = file_path.rsplit("/", 1)[-1] if "/" in file_path else file_path.rsplit("\\", 1)[-1]

        # 1. Container metadata inspection
        meta_score, meta_expl, meta_gaps = extract_video_metadata(file_bytes, file_name)
        self._provenance_gaps = meta_gaps
        results.append(
            AnalysisTechnique(
                technique="Video Container Metadata Inspection",
                result=self.score_to_result(meta_score),
                score=round(meta_score, 3),
                explanation=meta_expl,
            )
        )

        # 2. Temporal consistency analysis
        try:
            temp_score, temp_expl = temporal_consistency_analysis(file_path)
            results.append(
                AnalysisTechnique(
                    technique="Temporal Consistency Analysis",
                    result=self.score_to_result(temp_score),
                    score=round(temp_score, 3),
                    explanation=temp_expl,
                )
            )
        except Exception as e:
            results.append(
                AnalysisTechnique(
                    technique="Temporal Consistency Analysis",
                    result="INCONCLUSIVE",
                    score=0.5,
                    explanation=f"Could not analyze temporal consistency: {e}",
                )
            )

        # 3. Face landmark / deepfake analysis
        try:
            face_score, face_expl = face_landmark_analysis(file_path)
            results.append(
                AnalysisTechnique(
                    technique="Face Landmark & Deepfake Analysis",
                    result=self.score_to_result(face_score),
                    score=round(face_score, 3),
                    explanation=face_expl,
                )
            )
        except Exception as e:
            results.append(
                AnalysisTechnique(
                    technique="Face Landmark & Deepfake Analysis",
                    result="INCONCLUSIVE",
                    score=0.5,
                    explanation=f"Could not perform face analysis: {e}",
                )
            )

        # 4. Optical flow analysis
        try:
            flow_score, flow_expl = optical_flow_analysis(file_path)
            results.append(
                AnalysisTechnique(
                    technique="Optical Flow Analysis",
                    result=self.score_to_result(flow_score),
                    score=round(flow_score, 3),
                    explanation=flow_expl,
                )
            )
        except Exception as e:
            results.append(
                AnalysisTechnique(
                    technique="Optical Flow Analysis",
                    result="INCONCLUSIVE",
                    score=0.5,
                    explanation=f"Could not perform optical flow analysis: {e}",
                )
            )

        # 5. Gemini AI Vision Forensic Analysis (full video via File API)
        try:
            gem_score, gem_expl, gem_model, gem_synthid = await gemini_video_forensic_analysis(
                file_path
            )
            results.append(
                AnalysisTechnique(
                    technique="Gemini AI Vision Forensic Analysis",
                    result=self.score_to_result(gem_score),
                    score=round(gem_score, 3),
                    explanation=gem_expl,
                )
            )
            self._gemini_model_guess = gem_model

            if gem_synthid:
                self._provenance_gaps.append("SynthID watermark traces detected by Gemini vision analysis")

        except Exception as e:
            logger.warning("Gemini video forensic analysis failed: %s", e)
            results.append(
                AnalysisTechnique(
                    technique="Gemini AI Vision Forensic Analysis",
                    result="INCONCLUSIVE",
                    score=0.5,
                    explanation=f"Gemini API unavailable: {e}",
                )
            )

        # 6. SynthID Digital Watermark Detection (send first frame as image)
        try:
            import cv2
            cap = cv2.VideoCapture(file_path)
            ret, frame = cap.read()
            cap.release()
            if ret:
                _, buf = cv2.imencode(".png", frame)
                frame_bytes = buf.tobytes()
                synthid_score, synthid_expl, watermark_found = await check_synthid_watermark(
                    frame_bytes, "image/png"
                )
            else:
                synthid_score, synthid_expl, watermark_found = 0.5, "Could not extract video frame for watermark analysis", False

            results.append(
                AnalysisTechnique(
                    technique="SynthID Digital Watermark Detection",
                    result=self.score_to_result(synthid_score),
                    score=round(synthid_score, 3),
                    explanation=synthid_expl,
                )
            )
            if watermark_found:
                self._provenance_gaps.append("Digital watermark (SynthID) positively identified in video frames")

        except Exception as e:
            logger.warning("SynthID video watermark check failed: %s", e)
            results.append(
                AnalysisTechnique(
                    technique="SynthID Digital Watermark Detection",
                    result="INCONCLUSIVE",
                    score=0.5,
                    explanation=f"SynthID check unavailable: {e}",
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

    def _estimate_fingerprint(self, file_bytes: bytes, avg_score: float):
        # Prefer Gemini's model guess if available
        if self._gemini_model_guess:
            self._model_fingerprint = f"{self._gemini_model_guess} (identified by Gemini vision analysis)"
            return

        if avg_score < 0.5:
            self._model_fingerprint = None
            return

        raw = file_bytes[:50000].lower()

        if b"synthesia" in raw:
            self._model_fingerprint = "Synthesia (detected via file markers)"
        elif b"heygen" in raw:
            self._model_fingerprint = "HeyGen (detected via file markers)"
        elif b"runway" in raw:
            self._model_fingerprint = "RunwayML (detected via file markers)"
        elif b"pika" in raw:
            self._model_fingerprint = "Pika Labs (detected via file markers)"
        elif avg_score > 0.65:
            self._model_fingerprint = "Unknown AI video model (estimated — temporal/visual indicators suggest generation)"
        else:
            self._model_fingerprint = None

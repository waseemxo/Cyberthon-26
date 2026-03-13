"""Video forensic analyzer — orchestrates all video analysis techniques."""

import asyncio

from analyzers.base import BaseAnalyzer
from models.schemas import AnalysisTechnique
from forensics.metadata import extract_video_metadata
from forensics.temporal import (
    extract_keyframes,
    temporal_consistency_analysis,
    face_landmark_analysis,
    optical_flow_analysis,
)


class VideoAnalyzer(BaseAnalyzer):
    def __init__(self):
        self._model_fingerprint: str | None = None
        self._provenance_gaps: list[str] = []

    async def analyze(self, file_path: str, file_bytes: bytes) -> list[AnalysisTechnique]:
        results: list[AnalysisTechnique] = []
        file_name = file_path.rsplit("/", 1)[-1] if "/" in file_path else file_path.rsplit("\\", 1)[-1]

        # 1. Container metadata inspection (fast, no thread pool needed)
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

        # Extract keyframes ONCE in thread pool, reuse for all 3 techniques
        def _run_video_analyses():
            frames = extract_keyframes(file_path, max_frames=30)
            temp_result = _safe_call(temporal_consistency_analysis, file_path, frames)
            face_result = _safe_call(face_landmark_analysis, file_path, frames)
            flow_result = _safe_call(optical_flow_analysis, file_path, frames)
            return temp_result, face_result, flow_result

        temp_result, face_result, flow_result = await asyncio.to_thread(_run_video_analyses)

        # 2. Temporal consistency analysis
        if temp_result[0] is not None:
            results.append(
                AnalysisTechnique(
                    technique="Temporal Consistency Analysis",
                    result=self.score_to_result(temp_result[0]),
                    score=round(temp_result[0], 3),
                    explanation=temp_result[1],
                )
            )
        else:
            results.append(
                AnalysisTechnique(
                    technique="Temporal Consistency Analysis",
                    result="INCONCLUSIVE",
                    score=0.5,
                    explanation=f"Could not analyze temporal consistency: {temp_result[1]}",
                )
            )

        # 3. Face landmark / deepfake analysis
        if face_result[0] is not None:
            results.append(
                AnalysisTechnique(
                    technique="Face Landmark & Deepfake Analysis",
                    result=self.score_to_result(face_result[0]),
                    score=round(face_result[0], 3),
                    explanation=face_result[1],
                )
            )
        else:
            results.append(
                AnalysisTechnique(
                    technique="Face Landmark & Deepfake Analysis",
                    result="INCONCLUSIVE",
                    score=0.5,
                    explanation=f"Could not perform face analysis: {face_result[1]}",
                )
            )

        # 4. Optical flow analysis
        if flow_result[0] is not None:
            results.append(
                AnalysisTechnique(
                    technique="Optical Flow Analysis",
                    result=self.score_to_result(flow_result[0]),
                    score=round(flow_result[0], 3),
                    explanation=flow_result[1],
                )
            )
        else:
            results.append(
                AnalysisTechnique(
                    technique="Optical Flow Analysis",
                    result="INCONCLUSIVE",
                    score=0.5,
                    explanation=f"Could not perform optical flow analysis: {flow_result[1]}",
                )
            )

        # ── Gemini Video Analysis (via File API) ──
        from forensics.gemini_analyzer import analyze_video as gemini_analyze_video

        gemini_result = await asyncio.to_thread(gemini_analyze_video, file_path)
        if gemini_result is not None:
            gemini_score, gemini_explanation = gemini_result
            results.append(
                AnalysisTechnique(
                    technique="Gemini Video Analysis",
                    result=self.score_to_result(gemini_score),
                    score=round(gemini_score, 3),
                    explanation=gemini_explanation,
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


def _safe_call(func, file_path, frames):
    """Call an analysis function, returning (None, error_msg) on failure."""
    try:
        return func(file_path, frames=frames)
    except Exception as e:
        return (None, str(e))

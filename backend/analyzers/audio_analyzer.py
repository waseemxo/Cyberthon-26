"""Audio forensic analyzer — orchestrates all audio analysis techniques."""

import asyncio
import logging

from analyzers.base import BaseAnalyzer
from models.schemas import AnalysisTechnique
from forensics.metadata import extract_audio_metadata
from forensics.spectrogram import (
    load_audio,
    mel_spectrogram_analysis,
    silence_pattern_analysis,
    temporal_jitter_analysis,
)
from forensics.lstm_audio_classifier import classify_audio

logger = logging.getLogger(__name__)


class AudioAnalyzer(BaseAnalyzer):
    def __init__(self):
        self._model_fingerprint: str | None = None
        self._provenance_gaps: list[str] = []

    async def analyze(self, file_path: str, file_bytes: bytes) -> list[AnalysisTechnique]:
        results: list[AnalysisTechnique] = []
        file_name = file_path.rsplit("/", 1)[-1] if "/" in file_path else file_path.rsplit("\\", 1)[-1]

        # 1. Metadata inspection (fast, no need for thread pool)
        meta_score, meta_expl, meta_gaps = extract_audio_metadata(file_bytes, file_name)
        self._provenance_gaps = meta_gaps
        results.append(
            AnalysisTechnique(
                technique="Audio Metadata Inspection",
                result=self.score_to_result(meta_score),
                score=round(meta_score, 3),
                explanation=meta_expl,
            )
        )

        # Load audio ONCE in thread pool, reuse for all 3 techniques
        def _run_audio_analyses():
            y, sr = load_audio(file_path)
            spec_result = _safe_call(mel_spectrogram_analysis, file_path, y, sr)
            silence_result = _safe_call(silence_pattern_analysis, file_path, y, sr)
            jitter_result = _safe_call(temporal_jitter_analysis, file_path, y, sr)
            return spec_result, silence_result, jitter_result

        spec_result, silence_result, jitter_result = await asyncio.to_thread(_run_audio_analyses)

        # 2. Mel-spectrogram analysis
        if spec_result[0] is not None:
            results.append(
                AnalysisTechnique(
                    technique="Mel-Spectrogram Analysis",
                    result=self.score_to_result(spec_result[0]),
                    score=round(spec_result[0], 3),
                    explanation=spec_result[1],
                )
            )
        else:
            results.append(
                AnalysisTechnique(
                    technique="Mel-Spectrogram Analysis",
                    result="INCONCLUSIVE",
                    score=0.5,
                    explanation=f"Could not process audio for spectrogram analysis: {spec_result[1]}",
                )
            )

        # 3. Silence pattern analysis
        if silence_result[0] is not None:
            results.append(
                AnalysisTechnique(
                    technique="Silence Pattern Analysis",
                    result=self.score_to_result(silence_result[0]),
                    score=round(silence_result[0], 3),
                    explanation=silence_result[1],
                )
            )
        else:
            results.append(
                AnalysisTechnique(
                    technique="Silence Pattern Analysis",
                    result="INCONCLUSIVE",
                    score=0.5,
                    explanation=f"Could not analyze silence patterns: {silence_result[1]}",
                )
            )

        # 4. Temporal jitter analysis
        if jitter_result[0] is not None:
            results.append(
                AnalysisTechnique(
                    technique="Pitch & Amplitude Jitter Analysis",
                    result=self.score_to_result(jitter_result[0]),
                    score=round(jitter_result[0], 3),
                    explanation=jitter_result[1],
                )
            )
        else:
            results.append(
                AnalysisTechnique(
                    technique="Pitch & Amplitude Jitter Analysis",
                    result="INCONCLUSIVE",
                    score=0.5,
                    explanation=f"Could not perform jitter analysis: {jitter_result[1]}",
                )
            )

        # 5. LSTM Deep Learning Classifier (runs in thread pool — CPU-bound)
        lstm_result = await asyncio.to_thread(_safe_lstm_call, file_path)
        if lstm_result is not None:
            lstm_score, lstm_expl = lstm_result
            results.append(
                AnalysisTechnique(
                    technique="LSTM Deep Learning Audio Classifier",
                    result=self.score_to_result(lstm_score),
                    score=round(lstm_score, 3),
                    explanation=lstm_expl,
                )
            )
        else:
            logger.info("LSTM audio classifier unavailable or failed — skipping")

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

        raw = file_bytes[:10000]
        raw_lower = raw.lower()

        if b"elevenlabs" in raw_lower:
            self._model_fingerprint = "ElevenLabs TTS (detected via file markers)"
        elif b"bark" in raw_lower:
            self._model_fingerprint = "Bark TTS (detected via file markers)"
        elif b"coqui" in raw_lower:
            self._model_fingerprint = "Coqui TTS (detected via file markers)"
        elif avg_score > 0.65:
            self._model_fingerprint = "Unknown TTS/AI voice model (estimated — spectral indicators suggest synthesis)"
        else:
            self._model_fingerprint = None


def _safe_call(func, file_path, y, sr):
    """Call an analysis function, returning (None, error_msg) on failure."""
    try:
        return func(file_path, y=y, sr=sr)
    except Exception as e:
        return (None, str(e))


def _safe_lstm_call(file_path: str):
    """Run the LSTM classifier, returning None on failure or unavailability."""
    try:
        return classify_audio(file_path)
    except Exception as e:
        logger.exception("LSTM audio classification failed")
        return None

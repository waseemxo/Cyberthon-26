"""Audio forensic analyzer — orchestrates all audio analysis techniques."""

from analyzers.base import BaseAnalyzer
from models.schemas import AnalysisTechnique
from forensics.metadata import extract_audio_metadata
from forensics.spectrogram import (
    mel_spectrogram_analysis,
    silence_pattern_analysis,
    temporal_jitter_analysis,
)


class AudioAnalyzer(BaseAnalyzer):
    def __init__(self):
        self._model_fingerprint: str | None = None
        self._provenance_gaps: list[str] = []

    async def analyze(self, file_path: str, file_bytes: bytes) -> list[AnalysisTechnique]:
        results: list[AnalysisTechnique] = []
        file_name = file_path.rsplit("/", 1)[-1] if "/" in file_path else file_path.rsplit("\\", 1)[-1]

        # 1. Metadata inspection
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

        # 2. Mel-spectrogram analysis
        try:
            spec_score, spec_expl = mel_spectrogram_analysis(file_path)
            results.append(
                AnalysisTechnique(
                    technique="Mel-Spectrogram Analysis",
                    result=self.score_to_result(spec_score),
                    score=round(spec_score, 3),
                    explanation=spec_expl,
                )
            )
        except Exception as e:
            results.append(
                AnalysisTechnique(
                    technique="Mel-Spectrogram Analysis",
                    result="INCONCLUSIVE",
                    score=0.5,
                    explanation=f"Could not process audio for spectrogram analysis: {e}",
                )
            )

        # 3. Silence pattern analysis
        try:
            silence_score, silence_expl = silence_pattern_analysis(file_path)
            results.append(
                AnalysisTechnique(
                    technique="Silence Pattern Analysis",
                    result=self.score_to_result(silence_score),
                    score=round(silence_score, 3),
                    explanation=silence_expl,
                )
            )
        except Exception as e:
            results.append(
                AnalysisTechnique(
                    technique="Silence Pattern Analysis",
                    result="INCONCLUSIVE",
                    score=0.5,
                    explanation=f"Could not analyze silence patterns: {e}",
                )
            )

        # 4. Temporal jitter analysis
        try:
            jitter_score, jitter_expl = temporal_jitter_analysis(file_path)
            results.append(
                AnalysisTechnique(
                    technique="Pitch & Amplitude Jitter Analysis",
                    result=self.score_to_result(jitter_score),
                    score=round(jitter_score, 3),
                    explanation=jitter_expl,
                )
            )
        except Exception as e:
            results.append(
                AnalysisTechnique(
                    technique="Pitch & Amplitude Jitter Analysis",
                    result="INCONCLUSIVE",
                    score=0.5,
                    explanation=f"Could not perform jitter analysis: {e}",
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

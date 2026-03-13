"""Text forensic analyzer — orchestrates all text analysis techniques."""

import asyncio

from analyzers.base import BaseAnalyzer
from models.schemas import AnalysisTechnique
from forensics.stylometry import (
    burstiness_score,
    vocabulary_richness_score,
    perplexity_estimate,
    repetition_score,
    punctuation_pattern_score,
    watermark_detection,
)


class TextAnalyzer(BaseAnalyzer):
    def __init__(self):
        self._model_fingerprint: str | None = None
        self._provenance_gaps: list[str] = []

    async def analyze(self, file_path: str, file_bytes: bytes) -> list[AnalysisTechnique]:
        text = file_bytes.decode("utf-8", errors="replace")

        if len(text.strip()) < 50:
            return [
                AnalysisTechnique(
                    technique="Text Length Check",
                    result="INCONCLUSIVE",
                    score=0.5,
                    explanation="Text too short for reliable forensic analysis (< 50 characters).",
                )
            ]

        results: list[AnalysisTechnique] = []

        # Run all techniques
        techniques = [
            ("Perplexity Estimation", perplexity_estimate),
            ("Burstiness Analysis", burstiness_score),
            ("Vocabulary Richness (TTR)", vocabulary_richness_score),
            ("N-gram Repetition Analysis", repetition_score),
            ("Punctuation Pattern Analysis", punctuation_pattern_score),
            ("Unicode Watermark Detection", watermark_detection),
        ]

        scores = []
        for name, func in techniques:
            score, explanation = func(text)
            scores.append(score)
            results.append(
                AnalysisTechnique(
                    technique=name,
                    result=self.score_to_result(score),
                    score=round(score, 3),
                    explanation=explanation,
                )
            )

        # ── BERT Deep Learning Classification ──
        from forensics.bert_classifier import classify_text

        bert_result = await asyncio.to_thread(classify_text, text)
        if bert_result is not None:
            bert_score, bert_explanation = bert_result
            scores.append(bert_score)
            results.append(
                AnalysisTechnique(
                    technique="Deep Learning Analysis (BERT)",
                    result=self.score_to_result(bert_score),
                    score=round(bert_score, 3),
                    explanation=bert_explanation,
                )
            )

        # Estimate model fingerprint based on combined indicators
        avg_score = sum(scores) / len(scores) if scores else 0.5
        self._estimate_fingerprint(text, avg_score)

        # Provenance gaps
        self._provenance_gaps = [
            "No document authorship metadata available",
            "No content signing or digital provenance chain",
        ]

        return results

    def get_model_fingerprint(self) -> str | None:
        return self._model_fingerprint

    def get_provenance_gaps(self) -> list[str]:
        return self._provenance_gaps

    def _estimate_fingerprint(self, text: str, avg_score: float):
        """Best-effort model fingerprint estimation based on text patterns."""
        if avg_score < 0.5:
            self._model_fingerprint = None
            return

        text_lower = text.lower()

        # Check for common LLM patterns
        gpt_indicators = [
            "it's worth noting", "it's important to note", "in conclusion",
            "here are some", "let me", "i'd be happy to",
        ]
        claude_indicators = [
            "i appreciate", "that said", "to be straightforward",
            "it would be", "certainly",
        ]

        gpt_count = sum(1 for p in gpt_indicators if p in text_lower)
        claude_count = sum(1 for p in claude_indicators if p in text_lower)

        if gpt_count > claude_count and gpt_count >= 2:
            self._model_fingerprint = "GPT-3.5/GPT-4 (estimated — based on phrasing patterns)"
        elif claude_count > gpt_count and claude_count >= 2:
            self._model_fingerprint = "Claude (estimated — based on phrasing patterns)"
        elif avg_score > 0.65:
            self._model_fingerprint = "Unknown LLM (estimated — statistical indicators suggest AI)"
        else:
            self._model_fingerprint = None

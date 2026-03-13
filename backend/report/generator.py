"""Forensic report generator — aggregates analysis results into a ForensicReport."""

import hashlib
import uuid
from datetime import datetime, timezone

from models.schemas import (
    ForensicReport,
    AnalysisTechnique,
    FileType,
    VerdictLevel,
    RiskLevel,
)


def compute_file_hash(file_bytes: bytes) -> str:
    return f"sha256:{hashlib.sha256(file_bytes).hexdigest()}"


def compute_verdict(score: float) -> VerdictLevel:
    if score >= 0.85:
        return VerdictLevel.AI_GENERATED
    if score >= 0.65:
        return VerdictLevel.LIKELY_AI
    if score >= 0.45:
        return VerdictLevel.INCONCLUSIVE
    if score >= 0.25:
        return VerdictLevel.LIKELY_HUMAN
    return VerdictLevel.HUMAN


def compute_risk_level(score: float) -> RiskLevel:
    if score >= 0.85:
        return RiskLevel.CRITICAL
    if score >= 0.65:
        return RiskLevel.HIGH
    if score >= 0.45:
        return RiskLevel.MEDIUM
    if score >= 0.25:
        return RiskLevel.LOW
    return RiskLevel.NONE


def generate_forensic_summary(
    file_name: str,
    file_type: FileType,
    verdict: VerdictLevel,
    score: float,
    breakdown: list[AnalysisTechnique],
    model_fingerprint: str | None,
) -> str:
    """Generate a human-readable forensic summary from analysis results."""
    suspicious = [t for t in breakdown if t.result == "SUSPICIOUS"]
    clean = [t for t in breakdown if t.result == "CLEAN"]

    type_label = file_type.value

    parts = []

    if suspicious:
        techniques = ", ".join(t.technique for t in suspicious)
        parts.append(
            f"Forensic analysis of this {type_label} file identified "
            f"{len(suspicious)} suspicious indicator(s) via: {techniques}."
        )
    else:
        parts.append(
            f"Forensic analysis of this {type_label} file found no strongly "
            "suspicious indicators."
        )

    if model_fingerprint:
        parts.append(f"Estimated source: {model_fingerprint}.")

    if verdict in (VerdictLevel.AI_GENERATED, VerdictLevel.LIKELY_AI):
        parts.append(
            f"Overall confidence score of {score:.0%} indicates the content "
            "is likely produced by an AI system."
        )
    elif verdict == VerdictLevel.INCONCLUSIVE:
        parts.append(
            f"Overall confidence score of {score:.0%} is inconclusive — "
            "the content may be human-authored with AI editing, or a "
            "well-disguised AI generation."
        )
    else:
        parts.append(
            f"Overall confidence score of {score:.0%} suggests the content "
            "is likely of human origin."
        )

    if clean:
        parts.append(
            f"{len(clean)} technique(s) returned clean results, supporting "
            "non-synthetic characteristics."
        )

    return " ".join(parts)


def build_report(
    file_name: str,
    file_type: FileType,
    file_size: int,
    file_bytes: bytes,
    breakdown: list[AnalysisTechnique],
    model_fingerprint: str | None,
    provenance_gaps: list[str],
) -> ForensicReport:
    """Build a complete ForensicReport from analysis results."""
    # Weighted average score — suspicious techniques get more weight,
    # and EXIF/metadata techniques carry extra forensic importance
    EXIF_KEYWORDS = ("exif", "metadata")
    BERT_KEYWORDS = ("bert", "deep learning")
    GEMINI_KEYWORDS = ("gemini",)

    if not breakdown:
        avg_score = 0.5
    else:
        total_weight = 0
        weighted_sum = 0
        for t in breakdown:
            name_lower = t.technique.lower()
            is_bert = any(kw in name_lower for kw in BERT_KEYWORDS)
            is_gemini = any(kw in name_lower for kw in GEMINI_KEYWORDS)
            is_exif = any(kw in name_lower for kw in EXIF_KEYWORDS)
            if is_bert:
                weight = 5.0
            elif is_gemini:
                weight = 4.0
            elif is_exif:
                weight = 2.0
            elif t.result == "SUSPICIOUS":
                weight = 1.5
            elif t.result == "CLEAN":
                weight = 1.3
            else:
                weight = 1.0
            weighted_sum += t.score * weight
            total_weight += weight
        avg_score = weighted_sum / total_weight

    avg_score = round(max(0.0, min(1.0, avg_score)), 3)
    verdict = compute_verdict(avg_score)
    risk_level = compute_risk_level(avg_score)

    summary = generate_forensic_summary(
        file_name, file_type, verdict, avg_score, breakdown, model_fingerprint
    )

    return ForensicReport(
        id=uuid.uuid4().hex[:12],
        file_name=file_name,
        file_type=file_type,
        file_size=file_size,
        file_hash=compute_file_hash(file_bytes),
        overall_verdict=verdict,
        confidence_score=avg_score,
        risk_level=risk_level,
        analysis_breakdown=breakdown,
        model_fingerprint=model_fingerprint,
        provenance_gaps=provenance_gaps,
        forensic_summary=summary,
        analyzed_at=datetime.now(timezone.utc).isoformat(),
    )

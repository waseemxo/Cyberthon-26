from enum import Enum
from typing import Optional
from pydantic import BaseModel


class FileType(str, Enum):
    TEXT = "text"
    IMAGE = "image"
    AUDIO = "audio"
    VIDEO = "video"


class VerdictLevel(str, Enum):
    AI_GENERATED = "AI-Generated"
    LIKELY_AI = "Likely AI-Generated"
    INCONCLUSIVE = "Inconclusive"
    LIKELY_HUMAN = "Likely Human"
    HUMAN = "Human"


class RiskLevel(str, Enum):
    CRITICAL = "CRITICAL"
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"
    NONE = "NONE"


class TechniqueResult(str, Enum):
    SUSPICIOUS = "SUSPICIOUS"
    INCONCLUSIVE = "INCONCLUSIVE"
    CLEAN = "CLEAN"


class AnalysisTechnique(BaseModel):
    technique: str
    result: TechniqueResult
    score: float
    explanation: str


class ForensicReport(BaseModel):
    id: str
    file_name: str
    file_type: FileType
    file_size: int
    file_hash: str
    overall_verdict: VerdictLevel
    confidence_score: float
    risk_level: RiskLevel
    analysis_breakdown: list[AnalysisTechnique]
    model_fingerprint: Optional[str] = None
    provenance_gaps: list[str]
    forensic_summary: str
    analyzed_at: str


class SessionHistoryItem(BaseModel):
    id: str
    file_name: str
    file_type: FileType
    confidence_score: float
    overall_verdict: VerdictLevel
    risk_level: RiskLevel
    analyzed_at: str

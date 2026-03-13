from abc import ABC, abstractmethod
from models.schemas import AnalysisTechnique


class BaseAnalyzer(ABC):
    """Base class for all media-type analyzers."""

    @abstractmethod
    async def analyze(self, file_path: str, file_bytes: bytes) -> list[AnalysisTechnique]:
        """Run all forensic techniques and return a list of technique results."""
        ...

    @abstractmethod
    def get_model_fingerprint(self) -> str | None:
        """Return best-guess model fingerprint after analysis, or None."""
        ...

    @abstractmethod
    def get_provenance_gaps(self) -> list[str]:
        """Return list of provenance gaps detected."""
        ...

    @staticmethod
    def score_to_result(score: float) -> str:
        if score >= 0.65:
            return "SUSPICIOUS"
        if score >= 0.35:
            return "INCONCLUSIVE"
        return "CLEAN"

"""LSTM-based deepfake audio classifier — singleton model loader + inference.

Uses an LSTM neural network (ONNX Runtime) trained on MFCC features to detect
AI-generated (deepfake) audio.  Accepts .wav, .flac, .mp3, .ogg files.
"""

import logging
from pathlib import Path

import numpy as np

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Module-level singletons (mirroring bert_classifier.py pattern)
# ---------------------------------------------------------------------------
_session = None
_scaler = None
_available: bool | None = None

# Feature-extraction constants (must match training)
_CHUNK_DURATION = 1.0
_N_MFCC = 40
_MAX_PAD_LEN = 44
_SR = 22050


def _get_model_dir() -> Path:
    return Path(__file__).resolve().parent.parent / "ml_models" / "lstm_audio_deepfake"


def is_available() -> bool:
    """Return True if all required dependencies and model files are present."""
    global _available
    if _available is not None:
        return _available
    try:
        import onnxruntime  # noqa: F401
        import joblib  # noqa: F401
        import librosa  # noqa: F401

        model_dir = _get_model_dir()
        onnx_path = model_dir / "deepfake_audio.onnx"
        scaler_path = model_dir / "scaler.joblib"
        if not onnx_path.exists() or not scaler_path.exists():
            logger.warning(
                "LSTM audio model files missing (expected %s and %s)",
                onnx_path, scaler_path,
            )
            _available = False
        else:
            _available = True
    except ImportError as e:
        logger.warning("LSTM audio classifier unavailable — missing dependency: %s", e)
        _available = False
    return _available


def load_model() -> bool:
    """Load the ONNX LSTM model and scikit-learn scaler.  Idempotent."""
    global _session, _scaler

    if _session is not None:
        return True

    if not is_available():
        return False

    try:
        import onnxruntime as ort
        import joblib

        model_dir = _get_model_dir()

        logger.info("Loading LSTM audio deepfake ONNX model from %s ...", model_dir)
        _session = ort.InferenceSession(
            str(model_dir / "deepfake_audio.onnx"),
            providers=["CPUExecutionProvider"],
        )

        logger.info("Loading MFCC scaler ...")
        _scaler = joblib.load(str(model_dir / "scaler.joblib"))

        logger.info("LSTM audio classifier loaded successfully (ONNX Runtime)")
        return True
    except Exception:
        logger.exception("Failed to load LSTM audio classifier")
        _session = None
        _scaler = None
        return False


def classify_audio(file_path: str) -> tuple[float, str] | None:
    """
    Run LSTM inference on an audio file.

    Returns ``(score, explanation)`` where *score* is 0..1 (higher = more
    likely AI/deepfake), or ``None`` if the model is not loaded.
    """
    if _session is None or _scaler is None:
        return None

    import librosa

    # --- feature extraction (same pipeline as training) ---
    try:
        y, _ = librosa.load(file_path, sr=_SR, mono=True)
    except Exception as e:
        logger.warning("Could not load audio for LSTM classification: %s", e)
        return None

    samples_per_chunk = int(_CHUNK_DURATION * _SR)
    mfcc_chunks: list[np.ndarray] = []

    for start in range(0, len(y), samples_per_chunk):
        chunk = y[start : start + samples_per_chunk]
        if len(chunk) == 0:
            continue
        if len(chunk) < samples_per_chunk:
            chunk = np.pad(chunk, (0, samples_per_chunk - len(chunk)))

        mfcc = librosa.feature.mfcc(
            y=chunk, sr=_SR, n_mfcc=_N_MFCC, n_fft=2048, hop_length=512
        ).T

        if mfcc.shape[0] >= _MAX_PAD_LEN:
            mfcc = mfcc[:_MAX_PAD_LEN, :]
        else:
            mfcc = np.pad(mfcc, ((0, _MAX_PAD_LEN - mfcc.shape[0]), (0, 0)))

        mfcc_chunks.append(mfcc)

    if not mfcc_chunks:
        logger.warning("No audio chunks extracted for LSTM classification")
        return None

    chunks = np.array(mfcc_chunks, dtype=np.float32)

    # --- scale features ---
    flat = chunks.reshape(-1, chunks.shape[-1])
    scaled = _scaler.transform(flat)
    chunks = scaled.reshape(-1, chunks.shape[1], chunks.shape[2])

    # --- inference via ONNX Runtime ---
    input_name = _session.get_inputs()[0].name
    preds = _session.run(None, {input_name: chunks})[0]
    avg_score = float(preds.mean())

    label = "AI-Generated" if avg_score >= 0.5 else "Human-Audio"
    confidence = avg_score if avg_score >= 0.5 else 1.0 - avg_score

    explanation = (
        f"Classification: {label} | Confidence: {confidence:.1%} | "
        f"LSTM neural network trained on MFCC features from real and deepfake "
        f"audio. Analyzed {len(mfcc_chunks)} one-second audio segments."
    )

    return avg_score, explanation

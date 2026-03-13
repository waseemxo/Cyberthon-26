"""BERT-based AI text classifier — singleton model loader + inference."""

import logging
from pathlib import Path

logger = logging.getLogger(__name__)

_model = None
_tokenizer = None
_device = None
_available: bool | None = None


def _get_model_dir() -> Path:
    return Path(__file__).resolve().parent.parent / "ml_models" / "bert_ai_detector"


def is_available() -> bool:
    global _available
    if _available is not None:
        return _available
    try:
        import torch  # noqa: F401
        import transformers  # noqa: F401
        import peft  # noqa: F401

        _available = True
    except ImportError as e:
        logger.warning("BERT classifier unavailable — missing dependency: %s", e)
        _available = False
    return _available


def load_model() -> bool:
    """Load the BERT + LoRA model into memory. Idempotent."""
    global _model, _tokenizer, _device

    if _model is not None:
        return True

    if not is_available():
        return False

    model_dir = _get_model_dir()
    if not model_dir.exists():
        logger.error("BERT model directory not found: %s", model_dir)
        return False

    try:
        import torch
        from transformers import AutoModelForSequenceClassification, AutoTokenizer
        from peft import PeftModel

        logger.info("Loading BERT tokenizer from %s ...", model_dir)
        _tokenizer = AutoTokenizer.from_pretrained(str(model_dir))

        logger.info("Loading bert-base-cased base model ...")
        base_model = AutoModelForSequenceClassification.from_pretrained(
            "bert-base-cased", num_labels=2
        )

        logger.info("Applying LoRA adapter weights ...")
        _model = PeftModel.from_pretrained(base_model, str(model_dir))

        _device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        _model.to(_device)
        _model.eval()

        logger.info("BERT classifier loaded successfully on %s", _device)
        return True

    except Exception:
        logger.exception("Failed to load BERT classifier")
        _model = None
        _tokenizer = None
        return False


def classify_text(text: str) -> tuple[float, str] | None:
    """
    Run BERT inference on the given text.

    Returns (score, explanation) where score is 0..1 (higher = more likely AI),
    or None if the model is not loaded.
    """
    if _model is None or _tokenizer is None:
        return None

    import torch

    inputs = _tokenizer(text, return_tensors="pt", max_length=512, truncation=True)
    inputs = {k: v.to(_device) for k, v in inputs.items()}

    with torch.no_grad():
        logits = _model(**inputs).logits

    probs = torch.softmax(logits, dim=-1)[0]
    predicted_class = logits.argmax(dim=-1).item()
    confidence = probs[predicted_class].item()

    if predicted_class == 1:  # AI-Generated
        score = confidence
        label = "AI-Generated"
    else:  # Human-Written
        score = 1.0 - confidence
        label = "Human-Written"

    explanation = (
        f"Classification: {label} | Confidence: {confidence:.1%} | "
        f"Fine-tuned BERT (bert-base-cased) with LoRA adapters, trained on "
        f"human and AI-generated text. Based on first ~512 tokens."
    )

    return score, explanation

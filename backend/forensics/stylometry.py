"""Text stylometric analysis for AI detection."""

import re
import math
from collections import Counter


def compute_sentence_lengths(text: str) -> list[int]:
    sentences = re.split(r'[.!?]+', text)
    return [len(s.split()) for s in sentences if s.strip()]


def burstiness_score(text: str) -> tuple[float, str]:
    """
    Measures variance in sentence length. Human text is "bursty" —
    mixing short and long sentences. AI text tends to be uniform.
    Returns (score 0-1 where 1 = likely AI, explanation).
    """
    lengths = compute_sentence_lengths(text)
    if len(lengths) < 3:
        return 0.5, "Insufficient sentences for burstiness analysis."

    mean = sum(lengths) / len(lengths)
    if mean == 0:
        return 0.5, "Empty or trivial text."

    variance = sum((l - mean) ** 2 for l in lengths) / len(lengths)
    std_dev = math.sqrt(variance)
    coeff_of_variation = std_dev / mean if mean > 0 else 0

    # Human text typically has CV > 0.5; AI text < 0.4
    if coeff_of_variation < 0.25:
        score = 0.9
        explanation = (
            f"Very low sentence-length variation (CV={coeff_of_variation:.2f}). "
            "Highly uniform structure typical of AI generation."
        )
    elif coeff_of_variation < 0.40:
        score = 0.7
        explanation = (
            f"Low sentence-length variation (CV={coeff_of_variation:.2f}). "
            "Below typical human writing variation."
        )
    elif coeff_of_variation < 0.55:
        score = 0.5
        explanation = (
            f"Moderate sentence-length variation (CV={coeff_of_variation:.2f}). "
            "Within range of both human and AI text."
        )
    else:
        score = 0.2
        explanation = (
            f"High sentence-length variation (CV={coeff_of_variation:.2f}). "
            "Natural burstiness consistent with human writing."
        )

    return score, explanation


def vocabulary_richness_score(text: str) -> tuple[float, str]:
    """
    Type-Token Ratio (TTR) analysis. AI text often has narrower vocabulary
    range per passage length.
    """
    words = re.findall(r'\b[a-zA-Z]+\b', text.lower())
    if len(words) < 20:
        return 0.5, "Insufficient words for vocabulary analysis."

    unique = set(words)
    ttr = len(unique) / len(words)

    # For shorter texts, TTR is naturally higher; normalize
    # Typical AI: TTR 0.45-0.55 for 200+ words; Human: 0.55-0.75
    if len(words) > 100:
        if ttr < 0.45:
            score = 0.7
            explanation = (
                f"Low vocabulary richness (TTR={ttr:.3f} over {len(words)} words). "
                "Repetitive vocabulary may indicate AI generation."
            )
        elif ttr < 0.55:
            score = 0.6
            explanation = (
                f"Moderate vocabulary richness (TTR={ttr:.3f} over {len(words)} words). "
                "Within overlap zone of human and AI text."
            )
        else:
            score = 0.25
            explanation = (
                f"High vocabulary richness (TTR={ttr:.3f} over {len(words)} words). "
                "Diverse vocabulary consistent with human authorship."
            )
    else:
        score = 0.5
        explanation = (
            f"Short text sample (TTR={ttr:.3f} over {len(words)} words). "
            "Vocabulary analysis less reliable for short passages."
        )

    return score, explanation


def perplexity_estimate(text: str) -> tuple[float, str]:
    """
    Proxy perplexity via word frequency distribution analysis.
    AI text tends to use consistently common words (low entropy).
    """
    words = re.findall(r'\b[a-zA-Z]+\b', text.lower())
    if len(words) < 30:
        return 0.5, "Insufficient words for perplexity estimation."

    freq = Counter(words)
    total = len(words)
    probs = [count / total for count in freq.values()]
    entropy = -sum(p * math.log2(p) for p in probs if p > 0)

    # Normalize entropy by log2 of vocabulary size
    max_entropy = math.log2(len(freq)) if len(freq) > 1 else 1
    normalized = entropy / max_entropy if max_entropy > 0 else 0

    if normalized > 0.92:
        score = 0.2
        explanation = (
            f"High word entropy (H={entropy:.2f}, normalized={normalized:.3f}). "
            "Diverse word distribution consistent with human text."
        )
    elif normalized > 0.82:
        score = 0.5
        explanation = (
            f"Moderate word entropy (H={entropy:.2f}, normalized={normalized:.3f}). "
            "Word predictability in borderline range."
        )
    else:
        score = 0.8
        explanation = (
            f"Low word entropy (H={entropy:.2f}, normalized={normalized:.3f}). "
            "Concentrated word usage pattern typical of AI-generated text."
        )

    return score, explanation


def repetition_score(text: str) -> tuple[float, str]:
    """Detect repeated n-grams which are common in AI text."""
    words = re.findall(r'\b[a-zA-Z]+\b', text.lower())
    if len(words) < 20:
        return 0.5, "Insufficient text for repetition analysis."

    # Check trigram repetition
    trigrams = [tuple(words[i : i + 3]) for i in range(len(words) - 2)]
    trigram_counts = Counter(trigrams)
    total_trigrams = len(trigrams)

    if total_trigrams == 0:
        return 0.5, "No trigrams found."

    repeated = sum(1 for c in trigram_counts.values() if c > 1)
    repeat_ratio = repeated / len(trigram_counts) if trigram_counts else 0

    if repeat_ratio > 0.3:
        score = 0.85
        explanation = (
            f"High trigram repetition ({repeat_ratio:.1%} of unique trigrams repeated). "
            "Phrase recycling common in AI-generated text."
        )
    elif repeat_ratio > 0.15:
        score = 0.55
        explanation = (
            f"Moderate trigram repetition ({repeat_ratio:.1%}). "
            "Some phrase reuse detected."
        )
    else:
        score = 0.2
        explanation = (
            f"Low trigram repetition ({repeat_ratio:.1%}). "
            "Minimal phrase recycling, consistent with diverse human writing."
        )

    return score, explanation


def punctuation_pattern_score(text: str) -> tuple[float, str]:
    """Analyze punctuation distribution. AI tends toward uniform punctuation."""
    sentences = [s.strip() for s in re.split(r'(?<=[.!?])\s+', text) if s.strip()]
    if len(sentences) < 5:
        return 0.5, "Insufficient sentences for punctuation analysis."

    endings = []
    for s in sentences:
        if s.endswith('!'):
            endings.append('!')
        elif s.endswith('?'):
            endings.append('?')
        elif s.endswith('.'):
            endings.append('.')
        else:
            endings.append('other')

    counts = Counter(endings)
    period_ratio = counts.get('.', 0) / len(endings)

    # Count comma usage per sentence
    comma_counts = [s.count(',') for s in sentences]
    avg_commas = sum(comma_counts) / len(comma_counts) if comma_counts else 0
    comma_var = (
        sum((c - avg_commas) ** 2 for c in comma_counts) / len(comma_counts)
        if comma_counts
        else 0
    )

    # AI text: mostly periods, very consistent comma usage
    if period_ratio > 0.92 and comma_var < 0.5:
        score = 0.75
        explanation = (
            f"Highly uniform punctuation ({period_ratio:.0%} periods, "
            f"comma variance={comma_var:.2f}). Pattern typical of AI text."
        )
    elif period_ratio > 0.85:
        score = 0.55
        explanation = (
            f"Mostly period endings ({period_ratio:.0%}), limited variety. "
            "Slightly mechanical punctuation pattern."
        )
    else:
        score = 0.25
        explanation = (
            f"Varied punctuation ({period_ratio:.0%} periods, "
            f"comma variance={comma_var:.2f}). Natural writing style detected."
        )

    return score, explanation


def watermark_detection(text: str) -> tuple[float, str]:
    """
    Check for hidden Unicode characters that could indicate AI watermarking.
    Some providers embed zero-width characters or specific Unicode markers.
    """
    suspicious_chars = []

    zero_width = {
        '\u200b': 'ZERO WIDTH SPACE',
        '\u200c': 'ZERO WIDTH NON-JOINER',
        '\u200d': 'ZERO WIDTH JOINER',
        '\u2060': 'WORD JOINER',
        '\ufeff': 'ZERO WIDTH NO-BREAK SPACE (BOM)',
        '\u200e': 'LEFT-TO-RIGHT MARK',
        '\u200f': 'RIGHT-TO-LEFT MARK',
    }

    found = {}
    for char, name in zero_width.items():
        count = text.count(char)
        if count > 0:
            found[name] = count

    if found:
        total = sum(found.values())
        details = ", ".join(f"{name}: {count}" for name, count in found.items())
        if total > 5:
            score = 0.9
            explanation = (
                f"Multiple hidden Unicode characters detected ({total} total: {details}). "
                "Strong indicator of AI text watermarking."
            )
        else:
            score = 0.6
            explanation = (
                f"Some hidden Unicode characters detected ({total} total: {details}). "
                "May indicate watermarking or copy-paste artifacts."
            )
    else:
        score = 0.3
        explanation = "No hidden Unicode watermark characters detected."

    return score, explanation

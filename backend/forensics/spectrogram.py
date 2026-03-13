"""Audio spectrogram and spectral analysis for AI voice detection."""

import io
import numpy as np


def load_audio(file_path: str, sr: int = 22050, duration: float = 60):
    """Load audio once, reuse across all analysis functions."""
    import librosa
    return librosa.load(file_path, sr=sr, mono=True, duration=duration)


def mel_spectrogram_analysis(file_path: str, y=None, sr=None) -> tuple[float, str]:
    """
    Analyze mel-spectrogram of audio for AI generation indicators.
    AI-generated audio (TTS) tends to have:
    - Overly smooth harmonics with missing micro-variations
    - Unnaturally clean spectral profiles
    - Missing background noise floor typical of real recordings
    """
    import librosa

    if y is None or sr is None:
        y, sr = librosa.load(file_path, sr=22050, mono=True, duration=60)

    if len(y) < sr:
        return 0.5, "Audio clip too short for reliable spectrogram analysis."

    # Compute mel spectrogram
    mel_spec = librosa.feature.melspectrogram(y=y, sr=sr, n_mels=128)
    mel_db = librosa.power_to_db(mel_spec, ref=np.max)

    # 1. Spectral smoothness — AI audio is often unnaturally smooth
    spec_diff = np.diff(mel_db, axis=1)
    temporal_roughness = np.mean(np.abs(spec_diff))

    # 2. Noise floor analysis — real recordings have ambient noise
    # Bottom 10% of spectral energy
    sorted_energies = np.sort(mel_db.ravel())
    noise_floor = sorted_energies[: len(sorted_energies) // 10].mean()

    # 3. Harmonic consistency — AI tends to have overly regular harmonics
    spectral_centroid = librosa.feature.spectral_centroid(y=y, sr=sr)[0]
    centroid_var = np.std(spectral_centroid) / (np.mean(spectral_centroid) + 1e-8)

    # 4. Band energy distribution
    low_band = mel_db[:32, :].mean()
    mid_band = mel_db[32:96, :].mean()
    high_band = mel_db[96:, :].mean()

    score = 0.3  # Start below neutral
    parts = []

    # Low temporal roughness = suspiciously smooth
    if temporal_roughness < 3.0:
        score += 0.2
        parts.append(
            f"Unnaturally smooth spectral transitions (roughness={temporal_roughness:.2f}). "
            "TTS systems often produce overly clean audio."
        )
    elif temporal_roughness > 8.0:
        score -= 0.15
        parts.append(
            f"Natural spectral variation detected (roughness={temporal_roughness:.2f})."
        )
    else:
        score -= 0.05
        parts.append(
            f"Moderate spectral transitions (roughness={temporal_roughness:.2f})."
        )

    # Very clean noise floor = likely synthetic
    if noise_floor > -60:
        score += 0.15
        parts.append(
            f"Suspiciously clean noise floor ({noise_floor:.1f} dB). "
            "Real recordings typically have ambient noise."
        )
    elif noise_floor < -75:
        score -= 0.1
        parts.append(f"Natural noise floor present ({noise_floor:.1f} dB).")
    else:
        score -= 0.05
        parts.append(f"Normal noise floor ({noise_floor:.1f} dB).")

    # Low spectral centroid variation = monotonous = AI-like
    if centroid_var < 0.15:
        score += 0.15
        parts.append(
            f"Low spectral centroid variation (CV={centroid_var:.3f}). "
            "Indicates monotonous tonal quality common in TTS."
        )
    elif centroid_var > 0.35:
        score -= 0.1
        parts.append(
            f"High spectral centroid variation (CV={centroid_var:.3f}). "
            "Natural tonal dynamics consistent with human speech."
        )

    score = max(0.0, min(1.0, score))

    if not parts:
        parts.append("Spectrogram analysis within normal parameters.")

    return score, " ".join(parts)


def silence_pattern_analysis(file_path: str, y=None, sr=None) -> tuple[float, str]:
    """
    Analyze silence/pause patterns. AI-generated speech has unnaturally
    uniform pauses, while human speech has irregular silence gaps.
    """
    import librosa

    if y is None or sr is None:
        y, sr = librosa.load(file_path, sr=22050, mono=True, duration=60)

    if len(y) < sr * 2:
        return 0.5, "Audio too short for silence pattern analysis."

    # Detect non-silent intervals
    intervals = librosa.effects.split(y, top_db=30)

    if len(intervals) < 3:
        return 0.5, "Insufficient speech segments for pause analysis."

    # Compute gaps (silences) between intervals
    gaps = []
    for i in range(1, len(intervals)):
        gap_samples = intervals[i][0] - intervals[i - 1][1]
        gap_ms = (gap_samples / sr) * 1000
        if gap_ms > 50:  # Only count meaningful pauses
            gaps.append(gap_ms)

    if len(gaps) < 2:
        return 0.5, "Not enough pauses detected for analysis."

    gap_array = np.array(gaps)
    mean_gap = gap_array.mean()
    std_gap = gap_array.std()
    cv_gap = std_gap / mean_gap if mean_gap > 0 else 0

    # AI speech: very uniform pauses (low CV)
    # Human speech: varied pauses (high CV)
    if cv_gap < 0.25:
        score = 0.8
        explanation = (
            f"Highly uniform pause durations ({len(gaps)} pauses, mean={mean_gap:.0f}ms, "
            f"CV={cv_gap:.3f}). Mechanical timing typical of TTS systems."
        )
    elif cv_gap < 0.45:
        score = 0.55
        explanation = (
            f"Moderately uniform pauses ({len(gaps)} pauses, mean={mean_gap:.0f}ms, "
            f"CV={cv_gap:.3f}). Timing pattern in borderline range."
        )
    else:
        score = 0.2
        explanation = (
            f"Natural pause variation ({len(gaps)} pauses, mean={mean_gap:.0f}ms, "
            f"CV={cv_gap:.3f}). Irregular timing consistent with human speech."
        )

    return score, explanation


def temporal_jitter_analysis(file_path: str, y=None, sr=None) -> tuple[float, str]:
    """
    Measure micro-timing variations in audio. Human speech has natural
    jitter in pitch and rhythm that AI often fails to replicate.
    """
    import librosa

    if y is None or sr is None:
        y, sr = librosa.load(file_path, sr=22050, mono=True, duration=60)

    if len(y) < sr:
        return 0.5, "Audio too short for jitter analysis."

    # Extract pitch (F0) using pyin
    f0, voiced_flag, voiced_prob = librosa.pyin(
        y, fmin=librosa.note_to_hz('C2'), fmax=librosa.note_to_hz('C7')
    )

    # Filter to only voiced segments
    voiced_f0 = f0[voiced_flag]

    if len(voiced_f0) < 20:
        return 0.5, "Insufficient voiced frames for jitter analysis."

    # Compute jitter (pitch perturbation)
    pitch_diffs = np.abs(np.diff(voiced_f0))
    mean_f0 = np.mean(voiced_f0)
    jitter_percent = (np.mean(pitch_diffs) / mean_f0) * 100 if mean_f0 > 0 else 0

    # Compute shimmer (amplitude perturbation) via RMS
    rms = librosa.feature.rms(y=y)[0]
    rms_diffs = np.abs(np.diff(rms))
    mean_rms = np.mean(rms)
    shimmer_percent = (np.mean(rms_diffs) / mean_rms) * 100 if mean_rms > 0 else 0

    # Human speech: jitter ~0.5-1.5%, shimmer ~3-8%
    # AI speech: jitter <0.3% (too stable), shimmer <2%
    score = 0.4
    parts = []

    if jitter_percent < 0.3:
        score += 0.25
        parts.append(
            f"Very low pitch jitter ({jitter_percent:.3f}%). "
            "Unnaturally stable pitch typical of AI voice synthesis."
        )
    elif jitter_percent > 1.0:
        score -= 0.2
        parts.append(
            f"Natural pitch jitter ({jitter_percent:.3f}%). "
            "Micro-variations consistent with human speech."
        )
    else:
        parts.append(f"Moderate pitch jitter ({jitter_percent:.3f}%).")

    if shimmer_percent < 2.0:
        score += 0.15
        parts.append(
            f"Low amplitude shimmer ({shimmer_percent:.2f}%). "
            "Overly consistent volume typical of synthetic speech."
        )
    elif shimmer_percent > 5.0:
        score -= 0.1
        parts.append(
            f"Natural amplitude shimmer ({shimmer_percent:.2f}%)."
        )

    score = max(0.0, min(1.0, score))
    return score, " ".join(parts)

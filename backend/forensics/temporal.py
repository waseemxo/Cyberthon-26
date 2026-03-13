"""Video temporal consistency and deepfake detection forensics."""

import io
import numpy as np
import cv2


def extract_keyframes(file_path: str, max_frames: int = 30) -> list[np.ndarray]:
    """Extract evenly-spaced keyframes from video."""
    cap = cv2.VideoCapture(file_path)
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))

    if total_frames <= 0:
        cap.release()
        return []

    step = max(1, total_frames // max_frames)
    frames = []

    for i in range(0, total_frames, step):
        cap.set(cv2.CAP_PROP_POS_FRAMES, i)
        ret, frame = cap.read()
        if ret:
            frames.append(frame)
        if len(frames) >= max_frames:
            break

    cap.release()
    return frames


def temporal_consistency_analysis(file_path: str, frames: list[np.ndarray] | None = None) -> tuple[float, str]:
    """
    Check temporal consistency between frames. AI-generated videos often
    have flickering artifacts, inconsistent lighting, and unnatural
    inter-frame changes.
    """
    if frames is None:
        frames = extract_keyframes(file_path, max_frames=30)

    if len(frames) < 5:
        return 0.5, "Insufficient frames for temporal analysis."

    # Convert to grayscale for analysis
    gray_frames = [cv2.cvtColor(f, cv2.COLOR_BGR2GRAY).astype(np.float64) for f in frames]

    # 1. Inter-frame brightness consistency
    mean_brightness = [f.mean() for f in gray_frames]
    brightness_diffs = np.abs(np.diff(mean_brightness))
    brightness_std = np.std(brightness_diffs)

    # 2. Structural consistency using frame differences
    frame_diffs = []
    for i in range(1, len(gray_frames)):
        diff = np.abs(gray_frames[i] - gray_frames[i - 1]).mean()
        frame_diffs.append(diff)

    diff_array = np.array(frame_diffs)
    diff_mean = diff_array.mean()
    diff_std = diff_array.std()
    diff_cv = diff_std / diff_mean if diff_mean > 0 else 0

    # 3. Edge consistency — AI videos sometimes lose edge coherence
    edge_counts = []
    for f in gray_frames:
        edges = cv2.Canny(f.astype(np.uint8), 50, 150)
        edge_counts.append(np.sum(edges > 0))

    edge_std = np.std(edge_counts) / (np.mean(edge_counts) + 1e-8)

    # Scoring
    score = 0.3
    parts = []

    # High brightness flicker = AI artifact
    if brightness_std > 5.0:
        score += 0.25
        parts.append(
            f"Brightness flickering detected between frames (std={brightness_std:.2f}). "
            "Inconsistent lighting is a common AI video artifact."
        )
    elif brightness_std < 1.5:
        score -= 0.1
        parts.append(f"Very stable brightness across frames (std={brightness_std:.2f}), consistent with real footage.")
    else:
        parts.append(f"Stable brightness across frames (std={brightness_std:.2f}).")

    # Very uniform frame differences OR very erratic = suspicious
    if diff_cv < 0.15:
        score += 0.15
        parts.append(
            f"Unnaturally uniform inter-frame changes (CV={diff_cv:.3f}). "
            "Real video has varied motion between frames."
        )
    elif diff_cv > 1.0:
        score += 0.15
        parts.append(
            f"Erratic inter-frame changes (CV={diff_cv:.3f}). "
            "May indicate frame generation inconsistencies."
        )
    else:
        score -= 0.05
        parts.append(f"Natural inter-frame variation (CV={diff_cv:.3f}).")

    # Edge instability
    if edge_std > 0.3:
        score += 0.15
        parts.append(
            f"Edge instability across frames (CV={edge_std:.3f}). "
            "AI-generated video often has wavering edge definition."
        )
    elif edge_std < 0.1:
        score -= 0.05
        parts.append(f"Consistent edge definition (CV={edge_std:.3f}), typical of real video.")

    score = max(0.0, min(1.0, score))
    return score, " ".join(parts)


def face_landmark_analysis(file_path: str, frames: list[np.ndarray] | None = None) -> tuple[float, str]:
    """
    Analyze facial landmarks for deepfake indicators:
    asymmetry, unnatural proportions, temporal inconsistencies.
    """
    if frames is None:
        frames = extract_keyframes(file_path, max_frames=20)

    if len(frames) < 3:
        return 0.5, "Insufficient frames for face analysis."

    face_cascade = cv2.CascadeClassifier(
        cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
    )

    face_sizes = []
    face_positions = []
    frames_with_faces = 0

    for frame in frames:
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        faces = face_cascade.detectMultiScale(gray, 1.1, 4, minSize=(50, 50))

        if len(faces) > 0:
            frames_with_faces += 1
            x, y, w, h = faces[0]  # Take largest/first face
            face_sizes.append(w * h)
            face_positions.append((x + w / 2, y + h / 2))

    if frames_with_faces < 3:
        return 0.5, "Insufficient face detections for deepfake analysis."

    # 1. Face size consistency
    size_array = np.array(face_sizes, dtype=np.float64)
    size_cv = np.std(size_array) / (np.mean(size_array) + 1e-8)

    # 2. Face position jitter
    positions = np.array(face_positions)
    pos_diffs = np.sqrt(np.sum(np.diff(positions, axis=0) ** 2, axis=1))
    pos_jitter = np.std(pos_diffs) / (np.mean(pos_diffs) + 1e-8)

    # 3. Face detection consistency
    detection_rate = frames_with_faces / len(frames)

    score = 0.3
    parts = []

    # Inconsistent face sizes = possible deepfake artifact
    if size_cv > 0.3:
        score += 0.2
        parts.append(
            f"Face size fluctuation detected (CV={size_cv:.3f}). "
            "May indicate face replacement artifacts."
        )
    elif size_cv < 0.1:
        score -= 0.1
        parts.append(f"Consistent face sizing (CV={size_cv:.3f}), typical of real footage.")

    # High position jitter with low overall motion = deepfake
    if pos_jitter > 0.8:
        score += 0.2
        parts.append(
            f"Erratic face position/tracking (jitter CV={pos_jitter:.3f}). "
            "Deepfakes often show unstable face alignment."
        )
    elif pos_jitter < 0.3:
        score -= 0.05
        parts.append(f"Stable face tracking (jitter CV={pos_jitter:.3f}).")

    # Inconsistent face detection (face disappears in some frames)
    if detection_rate < 0.7 and detection_rate > 0.3:
        score += 0.1
        parts.append(
            f"Face detection inconsistent ({detection_rate:.0%} of frames). "
            "Face may degrade in certain frames."
        )
    elif detection_rate >= 0.9:
        score -= 0.05
        parts.append(f"Consistent face detection ({detection_rate:.0%} of frames).")

    if not parts:
        parts.append("Face analysis within normal parameters.")

    score = max(0.0, min(1.0, score))
    return score, " ".join(parts)


def optical_flow_analysis(file_path: str, frames: list[np.ndarray] | None = None) -> tuple[float, str]:
    """
    Analyze optical flow patterns. AI-generated video often has
    unrealistic motion patterns that optical flow can reveal.
    """
    if frames is None:
        frames = extract_keyframes(file_path, max_frames=20)

    if len(frames) < 5:
        return 0.5, "Insufficient frames for optical flow analysis."

    gray_frames = [cv2.cvtColor(f, cv2.COLOR_BGR2GRAY) for f in frames]

    flow_magnitudes = []
    flow_angle_stds = []

    for i in range(1, len(gray_frames)):
        flow = cv2.calcOpticalFlowFarneback(
            gray_frames[i - 1], gray_frames[i],
            None, 0.5, 3, 15, 3, 5, 1.2, 0
        )
        magnitude, angle = cv2.cartToPolar(flow[..., 0], flow[..., 1])
        flow_magnitudes.append(magnitude.mean())
        flow_angle_stds.append(np.std(angle))

    mag_array = np.array(flow_magnitudes)
    angle_std_array = np.array(flow_angle_stds)

    mag_cv = np.std(mag_array) / (np.mean(mag_array) + 1e-8)
    angle_consistency = np.mean(angle_std_array)

    score = 0.3
    parts = []

    # Very uniform flow magnitude = possibly synthetic motion
    if mag_cv < 0.2 and np.mean(mag_array) > 0.5:
        score += 0.25
        parts.append(
            f"Unnaturally uniform motion flow (magnitude CV={mag_cv:.3f}). "
            "AI-generated video often has mechanical, repetitive motion."
        )
    elif mag_cv > 1.5:
        score += 0.15
        parts.append(
            f"Erratic motion flow (CV={mag_cv:.3f}). "
            "May indicate frame generation inconsistencies."
        )
    elif mag_cv > 0.4:
        score -= 0.1
        parts.append(f"Natural motion flow variation (CV={mag_cv:.3f}).")

    # Low angle diversity = motion in only one direction (suspicious for AI)
    if angle_consistency < 0.8:
        score += 0.1
        parts.append(
            f"Low flow direction diversity (angle std={angle_consistency:.3f}). "
            "Motion appears constrained."
        )
    elif angle_consistency > 1.2:
        score -= 0.05
        parts.append(f"Good flow direction diversity (angle std={angle_consistency:.3f}).")

    if not parts:
        parts.append(
            f"Optical flow patterns within normal range "
            f"(mag CV={mag_cv:.3f}, angle diversity={angle_consistency:.3f})."
        )

    score = max(0.0, min(1.0, score))
    return score, " ".join(parts)

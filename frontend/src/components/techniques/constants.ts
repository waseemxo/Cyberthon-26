import { AlertTriangle, HelpCircle, CheckCircle } from 'lucide-react';
import type { TechniqueResult } from '../../types';

export const TECHNIQUE_ICONS: Record<TechniqueResult, typeof AlertTriangle> = {
  SUSPICIOUS: AlertTriangle,
  INCONCLUSIVE: HelpCircle,
  CLEAN: CheckCircle,
};

export function isBertTechnique(name: string): boolean {
  const lower = name.toLowerCase();
  return lower.includes('bert') || lower.includes('deep learning') || lower.includes('lstm');
}

export function isGeminiTechnique(name: string): boolean {
  return name.toLowerCase().includes('gemini');
}

export function getInterpretation(result: TechniqueResult, score: number, technique: string): string {
  const name = technique.toLowerCase();

  if (name.includes('lstm')) {
    if (result === 'SUSPICIOUS')
      return 'The LSTM neural network classified this audio as AI-generated (deepfake). This deep learning model was trained on MFCC features extracted from real and synthetic audio, detecting temporal patterns characteristic of AI speech synthesis.';
    if (result === 'CLEAN')
      return 'The LSTM neural network classified this audio as authentic human speech. The MFCC feature patterns across audio segments are consistent with natural recordings.';
    return 'The LSTM deep learning classifier returned an inconclusive result. The audio exhibits characteristics of both natural and AI-generated speech according to the neural network\'s learned patterns.';
  }

  if (name.includes('bert') || name.includes('deep learning')) {
    if (result === 'SUSPICIOUS')
      return 'The BERT neural network classified this text as AI-generated. This deep learning model was fine-tuned on thousands of human and AI text samples and detects subtle statistical patterns invisible to rule-based analysis.';
    if (result === 'CLEAN')
      return 'The BERT neural network classified this text as human-written. The model\'s learned representations of AI-generated text did not trigger for this content, supporting human authorship.';
    return 'The BERT deep learning classifier returned an inconclusive result. The text exhibits characteristics of both human and AI writing according to the neural network\'s learned patterns.';
  }

  if (name.includes('gemini')) {
    if (result === 'SUSPICIOUS')
      return `Google Gemini, a frontier multimodal AI model, analyzed this content and identified multiple indicators of AI generation with ${Math.round(score * 100)}% confidence. Gemini examines content holistically, detecting patterns that specialized tools may miss.`;
    if (result === 'CLEAN')
      return `Google Gemini multimodal analysis found no significant indicators of AI generation (score: ${Math.round(score * 100)}%). The content exhibits characteristics consistent with human-created material.`;
    return `Google Gemini's multimodal analysis was inconclusive (score: ${Math.round(score * 100)}%). The content has some characteristics that could indicate either human or AI origin.`;
  }

  if (result === 'SUSPICIOUS') {
    if (name.includes('metadata') || name.includes('exif'))
      return 'Metadata analysis found significant indicators of AI generation — missing or inconsistent EXIF data, absent camera information, or metadata patterns typical of AI tools.';
    if (name.includes('fft') || name.includes('frequency'))
      return 'Frequency domain analysis detected unusual spectral patterns — the distribution of high-frequency components deviates from natural content, suggesting synthetic generation.';
    if (name.includes('ela') || name.includes('error level'))
      return 'Error Level Analysis found suspiciously uniform error distributions — natural content typically shows varied compression artifacts, while AI-generated content is more uniform.';
    if (name.includes('pixel'))
      return 'Pixel-level statistics revealed abnormal noise patterns — the noise distribution across color channels is too uniform, a common hallmark of AI-generated imagery.';
    if (name.includes('histogram') || name.includes('color'))
      return 'Color distribution analysis found synthetic patterns — histogram gaps or unusual smoothness that diverges from natural photographic characteristics.';
    if (name.includes('spectrogram') || name.includes('mel'))
      return 'Spectral analysis of audio found overly clean harmonic patterns — natural recordings have micro-variations that AI-generated audio typically lacks.';
    if (name.includes('silence') || name.includes('pause'))
      return 'Pause/silence patterns are unnaturally uniform — human speech has irregular timing, while AI-generated speech tends to produce evenly-spaced pauses.';
    if (name.includes('jitter') || name.includes('temporal') && name.includes('jitter'))
      return 'Micro-timing analysis detected insufficient pitch and rhythm variation — human voice naturally exhibits jitter that AI synthesis often fails to replicate.';
    if (name.includes('optical flow'))
      return 'Motion analysis between frames shows synthetic patterns — the optical flow characteristics differ from natural camera-captured motion.';
    if (name.includes('temporal consistency'))
      return 'Frame-to-frame analysis found unnatural consistency — AI-generated video often has suspiciously stable characteristics across frames.';
    if (name.includes('face') || name.includes('landmark'))
      return 'Facial landmark analysis detected anomalies — geometric relationships between facial features show patterns inconsistent with natural human faces.';
    return `This technique flagged the content as suspicious (score: ${Math.round(score * 100)}%) — the measured characteristics deviate significantly from expected natural patterns.`;
  }
  if (result === 'INCONCLUSIVE') {
    return `Analysis was inconclusive (score: ${Math.round(score * 100)}%) — measured values fall in a gray zone where both natural and AI-generated content can produce similar patterns. This neither confirms nor rules out AI generation.`;
  }
  return `This technique found no significant indicators of AI generation (score: ${Math.round(score * 100)}%) — the measured characteristics fall within expected ranges for natural content.`;
}

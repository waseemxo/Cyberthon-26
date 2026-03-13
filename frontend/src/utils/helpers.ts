import type { FileType, RiskLevel, TechniqueResult } from '../types';

export function detectFileType(file: File): FileType {
  const mime = file.type;
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('audio/')) return 'audio';
  if (mime.startsWith('video/')) return 'video';
  return 'text';
}

export function getFileTypeLabel(type: FileType): string {
  const labels: Record<FileType, string> = {
    text: 'Text',
    image: 'Image',
    audio: 'Audio',
    video: 'Video',
  };
  return labels[type];
}

export function getRiskColor(risk: RiskLevel): string {
  const colors: Record<RiskLevel, string> = {
    CRITICAL: '#ef4444',
    HIGH: '#f97316',
    MEDIUM: '#f59e0b',
    LOW: '#10b981',
    NONE: '#6b7280',
  };
  return colors[risk];
}

export function getScoreColor(score: number): string {
  if (score >= 0.8) return '#ef4444';
  if (score >= 0.6) return '#f97316';
  if (score >= 0.4) return '#f59e0b';
  if (score >= 0.2) return '#10b981';
  return '#6b7280';
}

export function getTechniqueColor(result: TechniqueResult): string {
  const colors: Record<TechniqueResult, string> = {
    SUSPICIOUS: '#ef4444',
    INCONCLUSIVE: '#f59e0b',
    CLEAN: '#10b981',
  };
  return colors[result];
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleString();
}

export const ACCEPTED_TYPES: Record<FileType, string[]> = {
  text: ['.txt', '.md', '.csv', '.json', '.html', '.xml', '.log', '.rtf', '.doc', '.docx', '.pdf'],
  image: ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg', '.tiff'],
  audio: ['.mp3', '.wav', '.ogg', '.flac', '.aac', '.m4a', '.wma'],
  video: ['.mp4', '.avi', '.mov', '.mkv', '.webm', '.wmv', '.flv'],
};

export const ALL_ACCEPTED_EXTENSIONS = Object.values(ACCEPTED_TYPES).flat();

export const ACCEPTED_MIME_TYPES: Record<string, string[]> = {
  'text/*': ACCEPTED_TYPES.text,
  'image/*': ACCEPTED_TYPES.image,
  'audio/*': ACCEPTED_TYPES.audio,
  'video/*': ACCEPTED_TYPES.video,
};

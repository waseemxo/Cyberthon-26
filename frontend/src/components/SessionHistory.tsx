import { Link } from 'react-router-dom';
import {
  Clock,
  FileText,
  Image,
  Music,
  Video,
  ChevronRight,
} from 'lucide-react';
import type { SessionHistoryItem, FileType } from '../types';
import { getScoreColor, getRiskColor, formatDate } from '../utils/helpers';

const FILE_ICONS: Record<FileType, typeof FileText> = {
  text: FileText,
  image: Image,
  audio: Music,
  video: Video,
};

interface SessionHistoryProps {
  items: SessionHistoryItem[];
}

export default function SessionHistory({ items }: SessionHistoryProps) {
  if (items.length === 0) {
    return (
      <div className="text-center py-16">
        <Clock className="w-12 h-12 text-text-muted mx-auto mb-4 opacity-50" />
        <p className="text-lg text-text-secondary mb-1 font-mono">No analyses yet</p>
        <p className="text-sm text-text-muted font-mono">
          <span className="text-primary/50">&gt;</span> Upload a file to start your forensic analysis
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item) => {
        const FileIcon = FILE_ICONS[item.file_type];
        const scoreColor = getScoreColor(item.confidence_score);
        const riskColor = getRiskColor(item.risk_level);
        const percentage = Math.round(item.confidence_score * 100);

        return (
          <Link
            key={item.id}
            to={`/analysis/${item.id}`}
            className="flex items-center gap-4 p-4 cyber-card hover:border-primary/30 transition-all group no-underline"
          >
            {/* File type icon */}
            <div className="w-10 h-10 rounded-lg bg-surface-lighter border border-border/50 flex items-center justify-center shrink-0">
              <FileIcon className="w-5 h-5 text-text-secondary" />
            </div>

            {/* File info */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-text-primary font-mono truncate">
                {item.file_name}
              </p>
              <p className="text-xs text-text-muted font-mono">
                {formatDate(item.analyzed_at)}
              </p>
            </div>

            {/* Score */}
            <div className="flex items-center gap-3">
              <span
                className="text-xs font-bold font-mono px-2 py-0.5 rounded-md border"
                style={{ color: riskColor, backgroundColor: `${riskColor}10`, borderColor: `${riskColor}30` }}
              >
                {item.risk_level}
              </span>
              <span
                className="text-lg font-bold font-mono tabular-nums"
                style={{ color: scoreColor }}
              >
                {percentage}%
              </span>
              <ChevronRight className="w-4 h-4 text-text-muted group-hover:text-primary transition-colors" />
            </div>
          </Link>
        );
      })}
    </div>
  );
}

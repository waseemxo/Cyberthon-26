import {
  AlertTriangle,
  HelpCircle,
  CheckCircle,
  FileText,
  Image,
  Music,
  Video,
  Download,
  ChevronDown,
  ChevronUp,
  Fingerprint,
  AlertCircle,
} from 'lucide-react';
import { useState } from 'react';
import type { ForensicReport, FileType, TechniqueResult } from '../types';
import ScoreGauge from './ScoreGauge';
import {
  getRiskColor,
  getTechniqueColor,
  formatFileSize,
  formatDate,
} from '../utils/helpers';
import { getReportPdfUrl } from '../services/api';

const FILE_ICONS: Record<FileType, typeof FileText> = {
  text: FileText,
  image: Image,
  audio: Music,
  video: Video,
};

const TECHNIQUE_ICONS: Record<TechniqueResult, typeof AlertTriangle> = {
  SUSPICIOUS: AlertTriangle,
  INCONCLUSIVE: HelpCircle,
  CLEAN: CheckCircle,
};

interface AnalysisResultProps {
  report: ForensicReport;
}

export default function AnalysisResult({ report }: AnalysisResultProps) {
  const [expandedTechniques, setExpandedTechniques] = useState<Set<number>>(
    new Set()
  );

  const toggleTechnique = (index: number) => {
    setExpandedTechniques((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const FileIcon = FILE_ICONS[report.file_type];
  const riskColor = getRiskColor(report.risk_level);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header Card */}
      <div className="bg-surface-light border border-border rounded-2xl p-6 sm:p-8">
        <div className="flex flex-col lg:flex-row items-center gap-8">
          {/* Score Gauge */}
          <ScoreGauge
            score={report.confidence_score}
            label={report.overall_verdict}
          />

          {/* File Info & Summary */}
          <div className="flex-1 text-center lg:text-left">
            <div className="flex items-center justify-center lg:justify-start gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-surface-lighter flex items-center justify-center">
                <FileIcon className="w-5 h-5 text-text-secondary" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-text-primary">
                  {report.file_name}
                </h2>
                <div className="flex items-center gap-2 text-sm text-text-muted">
                  <span>{formatFileSize(report.file_size)}</span>
                  <span>·</span>
                  <span>{formatDate(report.analyzed_at)}</span>
                </div>
              </div>
            </div>

            {/* Risk Badge */}
            <div className="flex items-center justify-center lg:justify-start gap-2 mb-4">
              <span
                className="text-xs font-bold px-2.5 py-1 rounded-md uppercase tracking-wider"
                style={{
                  color: riskColor,
                  backgroundColor: `${riskColor}15`,
                }}
              >
                {report.risk_level} Risk
              </span>
              <code className="text-xs text-text-muted bg-surface-lighter px-2 py-1 rounded-md font-mono">
                SHA-256: {report.file_hash.slice(0, 16)}...
              </code>
            </div>

            {/* Forensic Summary */}
            <p className="text-sm text-text-secondary leading-relaxed">
              {report.forensic_summary}
            </p>

            {/* Model Fingerprint */}
            {report.model_fingerprint && (
              <div className="mt-4 flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/10 text-primary-light text-sm">
                <Fingerprint className="w-4 h-4 shrink-0" />
                <span>
                  <strong>Estimated Model:</strong> {report.model_fingerprint}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Techniques Breakdown */}
      <div className="bg-surface-light border border-border rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b border-border">
          <h3 className="text-lg font-semibold text-text-primary">
            Analysis Breakdown
          </h3>
          <p className="text-sm text-text-muted">
            {report.analysis_breakdown.length} forensic techniques applied
          </p>
        </div>

        <div className="divide-y divide-border">
          {report.analysis_breakdown.map((technique, index) => {
            const isExpanded = expandedTechniques.has(index);
            const color = getTechniqueColor(technique.result);
            const ResultIcon = TECHNIQUE_ICONS[technique.result];
            const scorePercent = Math.round(technique.score * 100);

            return (
              <div key={index}>
                <button
                  onClick={() => toggleTechnique(index)}
                  className="w-full flex items-center gap-4 px-6 py-4 hover:bg-surface-lighter transition-colors text-left"
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                    style={{ backgroundColor: `${color}15` }}
                  >
                    <ResultIcon className="w-4 h-4" style={{ color }} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">
                      {technique.technique}
                    </p>
                    <p className="text-xs font-medium" style={{ color }}>
                      {technique.result}
                    </p>
                  </div>

                  {/* Score bar */}
                  <div className="hidden sm:flex items-center gap-3 w-32">
                    <div className="flex-1 h-1.5 rounded-full bg-surface-lighter overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${scorePercent}%`,
                          backgroundColor: color,
                        }}
                      />
                    </div>
                    <span
                      className="text-xs font-mono font-bold w-8 text-right"
                      style={{ color }}
                    >
                      {scorePercent}%
                    </span>
                  </div>

                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-text-muted shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-text-muted shrink-0" />
                  )}
                </button>

                {isExpanded && (
                  <div className="px-6 pb-4 pl-18 animate-fade-in">
                    <div className="ml-12 p-4 rounded-lg bg-surface text-sm text-text-secondary leading-relaxed">
                      {technique.explanation}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Provenance Gaps */}
      {report.provenance_gaps.length > 0 && (
        <div className="bg-surface-light border border-border rounded-2xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle className="w-5 h-5 text-warning" />
            <h3 className="text-lg font-semibold text-text-primary">
              Provenance Gaps
            </h3>
          </div>
          <ul className="space-y-2">
            {report.provenance_gaps.map((gap, i) => (
              <li
                key={i}
                className="flex items-start gap-2 text-sm text-text-secondary"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-warning mt-1.5 shrink-0" />
                {gap}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-center gap-4">
        <a
          href={getReportPdfUrl(report.id)}
          download
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-primary hover:bg-primary-dark text-white font-medium transition-colors no-underline"
        >
          <Download className="w-4 h-4" />
          Download PDF Report
        </a>
      </div>
    </div>
  );
}

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
  Shield,
  Hash,
  Clock,
  FileType2,
  HardDrive,
  Copy,
  Check,
  Eye,
  Activity,
  Search,
} from 'lucide-react';
import { useState } from 'react';
import type { ForensicReport, FileType, TechniqueResult } from '../types';
import ScoreGauge from './ScoreGauge';
import {
  getRiskColor,
  getTechniqueColor,
  getScoreColor,
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
    new Set(report.analysis_breakdown.map((_, i) => i))
  );
  const [copiedHash, setCopiedHash] = useState(false);
  const [copiedId, setCopiedId] = useState(false);

  const toggleTechnique = (index: number) => {
    setExpandedTechniques((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const expandAll = () =>
    setExpandedTechniques(new Set(report.analysis_breakdown.map((_, i) => i)));
  const collapseAll = () => setExpandedTechniques(new Set());

  const copyToClipboard = (text: string, setter: (v: boolean) => void) => {
    navigator.clipboard.writeText(text);
    setter(true);
    setTimeout(() => setter(false), 2000);
  };

  const FileIcon = FILE_ICONS[report.file_type];
  const riskColor = getRiskColor(report.risk_level);

  const suspiciousCount = report.analysis_breakdown.filter(
    (t) => t.result === 'SUSPICIOUS'
  ).length;
  const inconclusiveCount = report.analysis_breakdown.filter(
    (t) => t.result === 'INCONCLUSIVE'
  ).length;
  const cleanCount = report.analysis_breakdown.filter(
    (t) => t.result === 'CLEAN'
  ).length;
  const totalTechniques = report.analysis_breakdown.length;

  const highestScore = Math.max(
    ...report.analysis_breakdown.map((t) => t.score)
  );
  const lowestScore = Math.min(
    ...report.analysis_breakdown.map((t) => t.score)
  );
  const avgScore =
    report.analysis_breakdown.reduce((s, t) => s + t.score, 0) /
    totalTechniques;

  const hashValue = report.file_hash.startsWith('sha256:')
    ? report.file_hash.slice(7)
    : report.file_hash;

  return (
    <div className="space-y-4 animate-fade-in">
      {/* ── Case Header ── */}
      <div className="bg-surface-light border border-border rounded-xl p-4">
        <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary-light" />
            <h1 className="text-base font-bold text-text-primary tracking-wide uppercase">
              Forensic Analysis Report
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <span
              className="text-xs font-bold px-2.5 py-1 rounded uppercase tracking-wider border"
              style={{
                color: riskColor,
                backgroundColor: `${riskColor}10`,
                borderColor: `${riskColor}30`,
              }}
            >
              {report.risk_level} RISK
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-surface rounded-lg p-3 border border-border/50">
            <div className="flex items-center gap-1.5 mb-1">
              <Hash className="w-3.5 h-3.5 text-text-muted" />
              <span className="text-[10px] uppercase tracking-wider text-text-muted font-semibold">
                Case ID
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <code className="text-xs font-mono text-primary-light">
                {report.id}
              </code>
              <button
                onClick={() => copyToClipboard(report.id, setCopiedId)}
                className="text-text-muted hover:text-text-primary transition-colors"
                title="Copy Case ID"
              >
                {copiedId ? (
                  <Check className="w-3 h-3 text-success" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
              </button>
            </div>
          </div>

          <div className="bg-surface rounded-lg p-3 border border-border/50">
            <div className="flex items-center gap-1.5 mb-1">
              <Clock className="w-3.5 h-3.5 text-text-muted" />
              <span className="text-[10px] uppercase tracking-wider text-text-muted font-semibold">
                Analyzed
              </span>
            </div>
            <span className="text-xs font-mono text-text-secondary">
              {formatDate(report.analyzed_at)}
            </span>
          </div>

          <div className="bg-surface rounded-lg p-3 border border-border/50">
            <div className="flex items-center gap-1.5 mb-1">
              <FileType2 className="w-3.5 h-3.5 text-text-muted" />
              <span className="text-[10px] uppercase tracking-wider text-text-muted font-semibold">
                File Type
              </span>
            </div>
            <span className="text-xs font-mono text-text-secondary uppercase">
              {report.file_type}
            </span>
          </div>

          <div className="bg-surface rounded-lg p-3 border border-border/50">
            <div className="flex items-center gap-1.5 mb-1">
              <HardDrive className="w-3.5 h-3.5 text-text-muted" />
              <span className="text-[10px] uppercase tracking-wider text-text-muted font-semibold">
                File Size
              </span>
            </div>
            <span className="text-xs font-mono text-text-secondary">
              {formatFileSize(report.file_size)} ({report.file_size.toLocaleString()} bytes)
            </span>
          </div>
        </div>

        {/* File identity */}
        <div className="mt-3 bg-surface rounded-lg p-3 border border-border/50">
          <div className="flex items-center gap-2 mb-2">
            <FileIcon className="w-4 h-4 text-text-muted" />
            <span className="text-sm font-semibold text-text-primary">
              {report.file_name}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] uppercase tracking-wider text-text-muted font-semibold shrink-0">
              SHA-256:
            </span>
            <code className="text-[11px] font-mono text-text-secondary break-all">
              {hashValue}
            </code>
            <button
              onClick={() => copyToClipboard(hashValue, setCopiedHash)}
              className="text-text-muted hover:text-text-primary transition-colors shrink-0"
              title="Copy hash"
            >
              {copiedHash ? (
                <Check className="w-3 h-3 text-success" />
              ) : (
                <Copy className="w-3 h-3" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ── Threat Assessment ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Score Gauge */}
        <div className="bg-surface-light border border-border rounded-xl p-6 flex flex-col items-center justify-center">
          <span className="text-[10px] uppercase tracking-wider text-text-muted font-semibold mb-3">
            AI Confidence Score
          </span>
          <ScoreGauge
            score={report.confidence_score}
            label={report.overall_verdict}
          />
        </div>

        {/* Evidence Summary */}
        <div className="bg-surface-light border border-border rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-4 h-4 text-text-muted" />
            <span className="text-[10px] uppercase tracking-wider text-text-muted font-semibold">
              Evidence Summary
            </span>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-danger" />
                <span className="text-sm text-text-secondary">Suspicious Indicators</span>
              </div>
              <span className="text-sm font-bold font-mono text-danger">
                {suspiciousCount}/{totalTechniques}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-warning" />
                <span className="text-sm text-text-secondary">Inconclusive</span>
              </div>
              <span className="text-sm font-bold font-mono text-warning">
                {inconclusiveCount}/{totalTechniques}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-success" />
                <span className="text-sm text-text-secondary">Clean</span>
              </div>
              <span className="text-sm font-bold font-mono text-success">
                {cleanCount}/{totalTechniques}
              </span>
            </div>
          </div>

          {/* Distribution bar */}
          <div className="mt-4 h-2.5 rounded-full overflow-hidden flex bg-surface-lighter">
            {suspiciousCount > 0 && (
              <div
                className="h-full bg-danger transition-all"
                style={{ width: `${(suspiciousCount / totalTechniques) * 100}%` }}
              />
            )}
            {inconclusiveCount > 0 && (
              <div
                className="h-full bg-warning transition-all"
                style={{ width: `${(inconclusiveCount / totalTechniques) * 100}%` }}
              />
            )}
            {cleanCount > 0 && (
              <div
                className="h-full bg-success transition-all"
                style={{ width: `${(cleanCount / totalTechniques) * 100}%` }}
              />
            )}
          </div>
        </div>

        {/* Score Statistics */}
        <div className="bg-surface-light border border-border rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Search className="w-4 h-4 text-text-muted" />
            <span className="text-[10px] uppercase tracking-wider text-text-muted font-semibold">
              Score Statistics
            </span>
          </div>

          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-text-muted">Highest Score</span>
                <span
                  className="text-sm font-bold font-mono"
                  style={{ color: getScoreColor(highestScore) }}
                >
                  {Math.round(highestScore * 100)}%
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-surface-lighter overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${highestScore * 100}%`,
                    backgroundColor: getScoreColor(highestScore),
                  }}
                />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-text-muted">Mean Score</span>
                <span
                  className="text-sm font-bold font-mono"
                  style={{ color: getScoreColor(avgScore) }}
                >
                  {Math.round(avgScore * 100)}%
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-surface-lighter overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${avgScore * 100}%`,
                    backgroundColor: getScoreColor(avgScore),
                  }}
                />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-text-muted">Lowest Score</span>
                <span
                  className="text-sm font-bold font-mono"
                  style={{ color: getScoreColor(lowestScore) }}
                >
                  {Math.round(lowestScore * 100)}%
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-surface-lighter overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${lowestScore * 100}%`,
                    backgroundColor: getScoreColor(lowestScore),
                  }}
                />
              </div>
            </div>
            <div className="pt-2 border-t border-border/50">
              <div className="flex items-center justify-between">
                <span className="text-xs text-text-muted">Weighted Confidence</span>
                <span
                  className="text-sm font-bold font-mono"
                  style={{ color: getScoreColor(report.confidence_score) }}
                >
                  {Math.round(report.confidence_score * 100)}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Model Fingerprint + Provenance ── */}
      {(report.model_fingerprint || report.provenance_gaps.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {report.model_fingerprint && (
            <div className="bg-surface-light border border-border rounded-xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <Fingerprint className="w-4 h-4 text-primary-light" />
                <span className="text-[10px] uppercase tracking-wider text-text-muted font-semibold">
                  Model Fingerprint
                </span>
              </div>
              <div className="bg-primary/10 border border-primary/20 rounded-lg p-3">
                <p className="text-sm font-medium text-primary-light">
                  {report.model_fingerprint}
                </p>
              </div>
            </div>
          )}

          {report.provenance_gaps.length > 0 && (
            <div className="bg-surface-light border border-border rounded-xl p-5">
              <div className="flex items-center gap-2 mb-3">
                <AlertCircle className="w-4 h-4 text-warning" />
                <span className="text-[10px] uppercase tracking-wider text-text-muted font-semibold">
                  Provenance Gaps ({report.provenance_gaps.length})
                </span>
              </div>
              <ul className="space-y-2">
                {report.provenance_gaps.map((gap, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-sm text-text-secondary bg-warning/5 border border-warning/15 rounded-lg p-2.5"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-warning mt-1.5 shrink-0" />
                    {gap}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* ── Forensic Summary ── */}
      <div className="bg-surface-light border border-border rounded-xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <Eye className="w-4 h-4 text-text-muted" />
          <span className="text-[10px] uppercase tracking-wider text-text-muted font-semibold">
            Forensic Summary
          </span>
        </div>
        <div className="bg-surface rounded-lg p-4 border border-border/50">
          <p className="text-sm text-text-secondary leading-relaxed">
            {report.forensic_summary}
          </p>
        </div>
      </div>

      {/* ── Technique Score Heatmap ── */}
      <div className="bg-surface-light border border-border rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Activity className="w-4 h-4 text-text-muted" />
          <span className="text-[10px] uppercase tracking-wider text-text-muted font-semibold">
            Technique Score Matrix
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {report.analysis_breakdown.map((technique, index) => {
            const color = getTechniqueColor(technique.result);
            const scorePercent = Math.round(technique.score * 100);
            return (
              <div
                key={index}
                className="bg-surface rounded-lg p-3 border border-border/50 cursor-pointer hover:border-border transition-colors"
                onClick={() => {
                  const el = document.getElementById(`technique-${index}`);
                  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  setExpandedTechniques((prev) => new Set([...prev, index]));
                }}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-medium text-text-secondary truncate mr-2">
                    {technique.technique}
                  </span>
                  <span
                    className="text-xs font-bold font-mono shrink-0"
                    style={{ color }}
                  >
                    {scorePercent}%
                  </span>
                </div>
                <div className="h-2 rounded-full bg-surface-lighter overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${scorePercent}%`,
                      backgroundColor: color,
                      boxShadow: `0 0 6px ${color}40`,
                    }}
                  />
                </div>
                <div className="mt-1.5 flex items-center gap-1">
                  <div
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                  <span className="text-[10px] font-mono uppercase" style={{ color }}>
                    {technique.result}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Detailed Technique Breakdown ── */}
      <div className="bg-surface-light border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-text-primary uppercase tracking-wide">
              Detailed Analysis Breakdown
            </h3>
            <p className="text-xs text-text-muted mt-0.5">
              {totalTechniques} forensic techniques applied · Click to expand/collapse
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={expandAll}
              className="text-[10px] uppercase tracking-wider text-text-muted hover:text-primary-light transition-colors font-semibold"
            >
              Expand All
            </button>
            <span className="text-text-muted">|</span>
            <button
              onClick={collapseAll}
              className="text-[10px] uppercase tracking-wider text-text-muted hover:text-primary-light transition-colors font-semibold"
            >
              Collapse All
            </button>
          </div>
        </div>

        <div className="divide-y divide-border">
          {report.analysis_breakdown.map((technique, index) => {
            const isExpanded = expandedTechniques.has(index);
            const color = getTechniqueColor(technique.result);
            const ResultIcon = TECHNIQUE_ICONS[technique.result];
            const scorePercent = Math.round(technique.score * 100);

            return (
              <div key={index} id={`technique-${index}`}>
                <button
                  onClick={() => toggleTechnique(index)}
                  className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-surface-lighter transition-colors text-left"
                >
                  {/* Index badge */}
                  <span className="text-[10px] font-mono text-text-muted w-5 shrink-0">
                    #{index + 1}
                  </span>

                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                    style={{ backgroundColor: `${color}15` }}
                  >
                    <ResultIcon className="w-3.5 h-3.5" style={{ color }} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">
                      {technique.technique}
                    </p>
                  </div>

                  {/* Score + bar */}
                  <div className="hidden sm:flex items-center gap-3 w-40">
                    <div className="flex-1 h-2 rounded-full bg-surface-lighter overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${scorePercent}%`,
                          backgroundColor: color,
                        }}
                      />
                    </div>
                    <span
                      className="text-xs font-mono font-bold w-10 text-right"
                      style={{ color }}
                    >
                      {scorePercent}%
                    </span>
                  </div>

                  {/* Result badge */}
                  <span
                    className="text-[10px] font-bold font-mono px-2 py-0.5 rounded uppercase shrink-0"
                    style={{
                      color,
                      backgroundColor: `${color}12`,
                    }}
                  >
                    {technique.result}
                  </span>

                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-text-muted shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-text-muted shrink-0" />
                  )}
                </button>

                {isExpanded && (
                  <div className="px-5 pb-4 animate-fade-in">
                    <div className="ml-12 bg-surface border border-border/50 rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-[10px] uppercase tracking-wider text-text-muted font-semibold">
                          Findings
                        </span>
                        <div
                          className="h-px flex-1"
                          style={{ backgroundColor: `${color}20` }}
                        />
                      </div>
                      <p className="text-sm text-text-secondary leading-relaxed">
                        {technique.explanation}
                      </p>
                      <div className="mt-3 flex items-center gap-4 text-[10px] font-mono text-text-muted">
                        <span>
                          SCORE: <span style={{ color }} className="font-bold">{technique.score.toFixed(3)}</span>
                        </span>
                        <span>
                          RESULT: <span style={{ color }} className="font-bold">{technique.result}</span>
                        </span>
                        <span>
                          WEIGHT: <span className="font-bold text-text-secondary">{
                          technique.technique.toLowerCase().includes('exif') || technique.technique.toLowerCase().includes('metadata')
                            ? '2.0x'
                            : technique.result === 'SUSPICIOUS' ? '1.5x' : '1.0x'
                        }</span>
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Actions ── */}
      <div className="flex items-center justify-center gap-4 pt-2 pb-4">
        <a
          href={getReportPdfUrl(report.id)}
          download
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-primary hover:bg-primary-dark text-white font-medium transition-colors no-underline text-sm"
        >
          <Download className="w-4 h-4" />
          Export PDF Report
        </a>
      </div>
    </div>
  );
}

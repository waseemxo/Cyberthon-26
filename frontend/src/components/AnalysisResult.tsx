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
  Hash,
  Clock,
  FileType2,
  HardDrive,
  Copy,
  Check,
  Eye,
  Activity,
  Search,
  Terminal,
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

function getInterpretation(result: TechniqueResult, score: number, technique: string): string {
  const name = technique.toLowerCase();
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
      <div className="cyber-card p-4">
        <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
          <div className="flex items-center gap-2">
            <Terminal className="w-5 h-5 text-primary" />
            <h1 className="text-base font-bold text-primary font-mono tracking-wide uppercase glow-text">
              Forensic Analysis Report
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <span
              className="text-xs font-bold font-mono px-2.5 py-1 rounded uppercase tracking-wider border"
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
              <span className="text-[10px] uppercase tracking-wider text-text-muted font-semibold font-mono">
                Case ID
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <code className="text-xs font-mono text-primary-light">
                {report.id}
              </code>
              <button
                onClick={() => copyToClipboard(report.id, setCopiedId)}
                className="text-text-muted hover:text-primary transition-colors"
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
              <span className="text-[10px] uppercase tracking-wider text-text-muted font-semibold font-mono">
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
              <span className="text-[10px] uppercase tracking-wider text-text-muted font-semibold font-mono">
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
              <span className="text-[10px] uppercase tracking-wider text-text-muted font-semibold font-mono">
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
            <FileIcon className="w-4 h-4 text-primary/60" />
            <span className="text-sm font-semibold text-text-primary font-mono">
              {report.file_name}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] uppercase tracking-wider text-text-muted font-semibold font-mono shrink-0">
              SHA-256:
            </span>
            <code className="text-[11px] font-mono text-text-secondary break-all">
              {hashValue}
            </code>
            <button
              onClick={() => copyToClipboard(hashValue, setCopiedHash)}
              className="text-text-muted hover:text-primary transition-colors shrink-0"
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
        <div className="cyber-card p-6 flex flex-col items-center justify-center">
          <span className="text-[10px] uppercase tracking-wider text-text-muted font-semibold font-mono mb-3">
            AI Confidence Score
          </span>
          <ScoreGauge
            score={report.confidence_score}
            label={report.overall_verdict}
          />
        </div>

        {/* Evidence Summary */}
        <div className="cyber-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-4 h-4 text-primary/60" />
            <span className="text-[10px] uppercase tracking-wider text-text-muted font-semibold font-mono">
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
        <div className="cyber-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Search className="w-4 h-4 text-primary/60" />
            <span className="text-[10px] uppercase tracking-wider text-text-muted font-semibold font-mono">
              Score Statistics
            </span>
          </div>

          <div className="space-y-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-text-muted font-mono">Highest Score</span>
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
                <span className="text-xs text-text-muted font-mono">Mean Score</span>
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
                <span className="text-xs text-text-muted font-mono">Lowest Score</span>
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
                <span className="text-xs text-text-muted font-mono">Weighted Confidence</span>
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
            <div className="cyber-card p-5">
              <div className="flex items-center gap-2 mb-3">
                <Fingerprint className="w-4 h-4 text-primary" />
                <span className="text-[10px] uppercase tracking-wider text-text-muted font-semibold font-mono">
                  Model Fingerprint
                </span>
              </div>
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
                <p className="text-sm font-medium text-primary-light font-mono">
                  {report.model_fingerprint}
                </p>
              </div>
            </div>
          )}

          {report.provenance_gaps.length > 0 && (
            <div className="cyber-card p-5">
              <div className="flex items-center gap-2 mb-3">
                <AlertCircle className="w-4 h-4 text-warning" />
                <span className="text-[10px] uppercase tracking-wider text-text-muted font-semibold font-mono">
                  Provenance Gaps ({report.provenance_gaps.length})
                </span>
              </div>
              <ul className="space-y-2">
                {report.provenance_gaps.map((gap, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-sm text-text-secondary bg-warning/5 border border-warning/15 rounded-lg p-2.5 font-mono text-xs"
                  >
                    <span className="text-warning shrink-0">!</span>
                    {gap}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* ── Forensic Summary ── */}
      <div className="cyber-card p-5">
        <div className="flex items-center gap-2 mb-3">
          <Eye className="w-4 h-4 text-primary/60" />
          <span className="text-[10px] uppercase tracking-wider text-text-muted font-semibold font-mono">
            Forensic Summary
          </span>
        </div>
        <div className="bg-surface rounded-lg p-4 border border-primary/10">
          <p className="text-sm text-text-secondary leading-relaxed font-mono">
            <span className="text-primary/50">$ </span>
            {report.forensic_summary}
          </p>
        </div>
      </div>

      {/* ── Technique Score Heatmap ── */}
      <div className="cyber-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Activity className="w-4 h-4 text-primary/60" />
          <span className="text-[10px] uppercase tracking-wider text-text-muted font-semibold font-mono">
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
                className="bg-surface rounded-lg p-3 border border-border/50 cursor-pointer hover:border-primary/30 transition-colors"
                onClick={() => {
                  const el = document.getElementById(`technique-${index}`);
                  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  setExpandedTechniques((prev) => new Set([...prev, index]));
                }}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-mono text-text-secondary truncate mr-2">
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
      <div className="cyber-card overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-primary font-mono uppercase tracking-wide">
              Detailed Analysis Breakdown
            </h3>
            <p className="text-xs text-text-muted mt-0.5 font-mono">
              {totalTechniques} forensic techniques applied
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={expandAll}
              className="text-[10px] uppercase tracking-wider text-text-muted hover:text-primary transition-colors font-semibold font-mono"
            >
              Expand All
            </button>
            <span className="text-border">|</span>
            <button
              onClick={collapseAll}
              className="text-[10px] uppercase tracking-wider text-text-muted hover:text-primary transition-colors font-semibold font-mono"
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
            const weight =
              technique.technique.toLowerCase().includes('exif') || technique.technique.toLowerCase().includes('metadata')
                ? '2.0x'
                : technique.result === 'SUSPICIOUS' ? '1.5x' : '1.0x';

            return (
              <div key={index} id={`technique-${index}`}>
                <button
                  onClick={() => toggleTechnique(index)}
                  className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-surface-lighter transition-colors text-left"
                >
                  {/* Index badge */}
                  <span className="text-[10px] font-mono text-primary/40 w-5 shrink-0">
                    #{index + 1}
                  </span>

                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                    style={{ backgroundColor: `${color}15` }}
                  >
                    <ResultIcon className="w-3.5 h-3.5" style={{ color }} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary font-mono truncate">
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
                    <div className="ml-12 space-y-3">
                      {/* Findings */}
                      <div className="bg-surface border border-border/50 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-[10px] uppercase tracking-wider text-text-muted font-semibold font-mono">
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
                      </div>

                      {/* What this means */}
                      <div className="bg-surface border border-primary/10 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-[10px] uppercase tracking-wider text-primary/60 font-semibold font-mono">
                            What This Means
                          </span>
                          <div className="h-px flex-1 bg-primary/10" />
                        </div>
                        <p className="text-sm text-text-secondary leading-relaxed">
                          {getInterpretation(technique.result, technique.score, technique.technique)}
                        </p>
                      </div>

                      {/* Technical detail bar */}
                      <div className="bg-surface border border-border/50 rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-[10px] uppercase tracking-wider text-text-muted font-semibold font-mono">
                            Technical Detail
                          </span>
                          <div className="h-px flex-1 bg-border/30" />
                        </div>
                        {/* Score bar with thresholds */}
                        <div className="relative h-3 rounded-full bg-surface-lighter overflow-hidden mb-2">
                          <div
                            className="h-full rounded-full transition-all duration-700"
                            style={{
                              width: `${scorePercent}%`,
                              backgroundColor: color,
                              boxShadow: `0 0 8px ${color}40`,
                            }}
                          />
                          {/* Threshold markers */}
                          <div className="absolute top-0 bottom-0 left-[35%] w-px bg-text-muted/30" title="Clean threshold (0.35)" />
                          <div className="absolute top-0 bottom-0 left-[65%] w-px bg-text-muted/30" title="Suspicious threshold (0.65)" />
                        </div>
                        <div className="flex items-center justify-between text-[9px] font-mono text-text-muted mb-3">
                          <span>0%</span>
                          <span className="text-success">CLEAN &lt;35%</span>
                          <span className="text-warning">INCONCLUSIVE</span>
                          <span className="text-danger">&gt;65% SUSPICIOUS</span>
                          <span>100%</span>
                        </div>
                        <div className="flex items-center gap-4 text-[10px] font-mono text-text-muted">
                          <span>
                            SCORE: <span style={{ color }} className="font-bold">{technique.score.toFixed(3)}</span>
                          </span>
                          <span>
                            RESULT: <span style={{ color }} className="font-bold">{technique.result}</span>
                          </span>
                          <span>
                            WEIGHT: <span className="font-bold text-text-secondary">{weight}</span>
                          </span>
                        </div>
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
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-primary/20 border border-primary/30 hover:bg-primary/30 text-primary font-mono font-medium transition-colors no-underline text-sm"
        >
          <Download className="w-4 h-4" />
          Export PDF Report
        </a>
      </div>
    </div>
  );
}

import {
  FileText,
  Image,
  Music,
  Video,
  Download,
  Fingerprint,
  AlertCircle,
  Copy,
  Check,
  Eye,
  Activity,
  Terminal,
} from 'lucide-react';
import { useState } from 'react';
import type { ForensicReport, FileType, AnalysisTechnique } from '../types';
import ScoreGauge from './ScoreGauge';
import {
  getRiskColor,
  formatFileSize,
  formatDate,
} from '../utils/helpers';
import { getReportPdfUrl } from '../services/api';
import { TextTechniques, ImageTechniques, VideoTechniques, AudioTechniques } from './techniques';

const FILE_ICONS: Record<FileType, typeof FileText> = {
  text: FileText,
  image: Image,
  audio: Music,
  video: Video,
};

const TECHNIQUE_COMPONENTS: Record<FileType, React.ComponentType<{ techniques: AnalysisTechnique[] }>> = {
  text: TextTechniques,
  image: ImageTechniques,
  audio: AudioTechniques,
  video: VideoTechniques,
};

interface AnalysisResultProps {
  report: ForensicReport;
}

export default function AnalysisResult({ report }: AnalysisResultProps) {
  const [copiedHash, setCopiedHash] = useState(false);
  const [copiedId, setCopiedId] = useState(false);

  const copyToClipboard = (text: string, setter: (v: boolean) => void) => {
    navigator.clipboard.writeText(text);
    setter(true);
    setTimeout(() => setter(false), 2000);
  };

  const FileIcon = FILE_ICONS[report.file_type];
  const riskColor = getRiskColor(report.risk_level);
  const TechniqueSection = TECHNIQUE_COMPONENTS[report.file_type];

  const suspiciousCount = report.analysis_breakdown.filter((t) => t.result === 'SUSPICIOUS').length;
  const inconclusiveCount = report.analysis_breakdown.filter((t) => t.result === 'INCONCLUSIVE').length;
  const cleanCount = report.analysis_breakdown.filter((t) => t.result === 'CLEAN').length;
  const totalTechniques = report.analysis_breakdown.length;

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

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 text-xs font-mono">
          <div className="bg-surface rounded-lg p-2.5 border border-border/50">
            <span className="text-text-muted block text-[10px] uppercase tracking-wider mb-0.5">Case ID</span>
            <div className="flex items-center gap-1">
              <code className="text-primary-light">{report.id}</code>
              <button onClick={() => copyToClipboard(report.id, setCopiedId)} className="text-text-muted hover:text-primary transition-colors">
                {copiedId ? <Check className="w-3 h-3 text-success" /> : <Copy className="w-3 h-3" />}
              </button>
            </div>
          </div>
          <div className="bg-surface rounded-lg p-2.5 border border-border/50">
            <span className="text-text-muted block text-[10px] uppercase tracking-wider mb-0.5">Analyzed</span>
            <span className="text-text-secondary">{formatDate(report.analyzed_at)}</span>
          </div>
          <div className="bg-surface rounded-lg p-2.5 border border-border/50">
            <span className="text-text-muted block text-[10px] uppercase tracking-wider mb-0.5">Type</span>
            <span className="text-text-secondary uppercase">{report.file_type}</span>
          </div>
          <div className="bg-surface rounded-lg p-2.5 border border-border/50">
            <span className="text-text-muted block text-[10px] uppercase tracking-wider mb-0.5">Size</span>
            <span className="text-text-secondary">{formatFileSize(report.file_size)}</span>
          </div>
        </div>

        <div className="mt-2 bg-surface rounded-lg p-2.5 border border-border/50 flex items-center gap-2">
          <FileIcon className="w-3.5 h-3.5 text-primary/60 shrink-0" />
          <span className="text-xs font-mono text-text-primary truncate">{report.file_name}</span>
          <span className="text-text-muted mx-1">|</span>
          <code className="text-[10px] font-mono text-text-muted truncate">{hashValue}</code>
          <button onClick={() => copyToClipboard(hashValue, setCopiedHash)} className="text-text-muted hover:text-primary transition-colors shrink-0">
            {copiedHash ? <Check className="w-3 h-3 text-success" /> : <Copy className="w-3 h-3" />}
          </button>
        </div>
      </div>

      {/* ── File-type-specific Technique Analysis ── */}
      <TechniqueSection techniques={report.analysis_breakdown} />

      {/* ── Overall Confidence + Evidence ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="cyber-card p-5 flex flex-col items-center justify-center">
          <span className="text-[10px] uppercase tracking-wider text-text-muted font-semibold font-mono mb-3">
            Weighted Confidence Score
          </span>
          <ScoreGauge score={report.confidence_score} label={report.overall_verdict} />
        </div>

        <div className="cyber-card p-5">
          <div className="flex items-center gap-2 mb-3">
            <Activity className="w-4 h-4 text-primary/60" />
            <span className="text-[10px] uppercase tracking-wider text-text-muted font-semibold font-mono">
              Evidence Summary
            </span>
          </div>
          <div className="space-y-2">
            {[
              { label: 'Suspicious', count: suspiciousCount, cls: 'bg-danger', textCls: 'text-danger' },
              { label: 'Inconclusive', count: inconclusiveCount, cls: 'bg-warning', textCls: 'text-warning' },
              { label: 'Clean', count: cleanCount, cls: 'bg-success', textCls: 'text-success' },
            ].map(({ label, count, cls, textCls }) => (
              <div key={label} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${cls}`} />
                  <span className="text-xs text-text-secondary">{label}</span>
                </div>
                <span className={`text-xs font-bold font-mono ${textCls}`}>{count}/{totalTechniques}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 h-2 rounded-full overflow-hidden flex bg-surface-lighter">
            {suspiciousCount > 0 && <div className="h-full bg-danger" style={{ width: `${(suspiciousCount / totalTechniques) * 100}%` }} />}
            {inconclusiveCount > 0 && <div className="h-full bg-warning" style={{ width: `${(inconclusiveCount / totalTechniques) * 100}%` }} />}
            {cleanCount > 0 && <div className="h-full bg-success" style={{ width: `${(cleanCount / totalTechniques) * 100}%` }} />}
          </div>

          {/* Model fingerprint inline */}
          {report.model_fingerprint && (
            <div className="mt-3 pt-3 border-t border-border/50">
              <div className="flex items-center gap-1.5 mb-1">
                <Fingerprint className="w-3.5 h-3.5 text-primary/60" />
                <span className="text-[10px] uppercase tracking-wider text-text-muted font-semibold font-mono">Model Fingerprint</span>
              </div>
              <p className="text-xs font-mono text-primary-light">{report.model_fingerprint}</p>
            </div>
          )}
        </div>
      </div>

      {/* ── Forensic Summary ── */}
      <div className="cyber-card p-4">
        <div className="flex items-center gap-2 mb-2">
          <Eye className="w-4 h-4 text-primary/60" />
          <span className="text-[10px] uppercase tracking-wider text-text-muted font-semibold font-mono">
            Forensic Summary
          </span>
        </div>
        <p className="text-sm text-text-secondary leading-relaxed font-mono">
          <span className="text-primary/50">$ </span>
          {report.forensic_summary}
        </p>
      </div>

      {/* ── Provenance Gaps ── */}
      {report.provenance_gaps.length > 0 && (
        <div className="cyber-card p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="w-4 h-4 text-warning" />
            <span className="text-[10px] uppercase tracking-wider text-text-muted font-semibold font-mono">
              Provenance Gaps ({report.provenance_gaps.length})
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {report.provenance_gaps.map((gap, i) => (
              <span key={i} className="text-[10px] font-mono text-warning bg-warning/5 border border-warning/15 rounded px-2 py-1">
                ! {gap}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ── Actions ── */}
      <div className="flex items-center justify-center gap-4 pt-1 pb-4">
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

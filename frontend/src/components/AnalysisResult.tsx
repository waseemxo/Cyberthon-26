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
  Brain,
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

function isBertTechnique(name: string): boolean {
  const lower = name.toLowerCase();
  return lower.includes('bert') || lower.includes('deep learning');
}

function getInterpretation(result: TechniqueResult, score: number, technique: string): string {
  const name = technique.toLowerCase();

  if (name.includes('bert') || name.includes('deep learning')) {
    if (result === 'SUSPICIOUS')
      return `A fine-tuned BERT neural network classified this text as likely AI-generated with ${Math.round(score * 100)}% confidence. This deep learning model was trained on thousands of human and AI text samples and detects subtle statistical patterns invisible to rule-based analysis.`;
    if (result === 'CLEAN')
      return `A fine-tuned BERT neural network classified this text as likely human-written (score: ${Math.round(score * 100)}%). The model's learned representations of AI-generated text did not trigger for this content, supporting human authorship.`;
    return `The BERT deep learning classifier returned an inconclusive result (score: ${Math.round(score * 100)}%). The text exhibits characteristics of both human and AI writing according to the neural network's learned patterns.`;
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

interface AnalysisResultProps {
  report: ForensicReport;
}

export default function AnalysisResult({ report }: AnalysisResultProps) {
  const [expandedTechniques, setExpandedTechniques] = useState<Set<number>>(new Set());
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

  const copyToClipboard = (text: string, setter: (v: boolean) => void) => {
    navigator.clipboard.writeText(text);
    setter(true);
    setTimeout(() => setter(false), 2000);
  };

  const FileIcon = FILE_ICONS[report.file_type];
  const riskColor = getRiskColor(report.risk_level);

  // Separate BERT from other techniques
  const bertTechnique = report.analysis_breakdown.find((t) => isBertTechnique(t.technique));
  const otherTechniques = report.analysis_breakdown.filter((t) => !isBertTechnique(t.technique));

  const suspiciousCount = report.analysis_breakdown.filter((t) => t.result === 'SUSPICIOUS').length;
  const inconclusiveCount = report.analysis_breakdown.filter((t) => t.result === 'INCONCLUSIVE').length;
  const cleanCount = report.analysis_breakdown.filter((t) => t.result === 'CLEAN').length;
  const totalTechniques = report.analysis_breakdown.length;

  const hashValue = report.file_hash.startsWith('sha256:')
    ? report.file_hash.slice(7)
    : report.file_hash;

  return (
    <div className="space-y-4 animate-fade-in">
      {/* ── Case Header (compact) ── */}
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

      {/* ── BERT Primary Verdict (Hero Card) ── */}
      {bertTechnique && (() => {
        const bertScore = Math.round(bertTechnique.score * 100);
        const bertColor = getTechniqueColor(bertTechnique.result);
        const BertResultIcon = TECHNIQUE_ICONS[bertTechnique.result];
        return (
          <div className="cyber-card p-0 overflow-hidden border-2" style={{ borderColor: `${bertColor}40` }}>
            <div className="p-5 bg-gradient-to-r from-surface via-surface-light to-surface">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center">
                  <Brain className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-primary font-mono uppercase tracking-wide">
                    BERT Deep Learning Classifier
                  </h2>
                  <span className="text-[10px] font-mono text-text-muted uppercase tracking-wider">
                    Primary Detection Engine — Weight: 5.0x
                  </span>
                </div>
                <div className="ml-auto flex items-center gap-3">
                  <span
                    className="text-xs font-bold font-mono px-3 py-1.5 rounded-lg uppercase tracking-wider border"
                    style={{ color: bertColor, backgroundColor: `${bertColor}12`, borderColor: `${bertColor}30` }}
                  >
                    <BertResultIcon className="w-3.5 h-3.5 inline mr-1.5 -mt-0.5" />
                    {bertTechnique.result}
                  </span>
                </div>
              </div>

              {/* Large score display */}
              <div className="flex items-end gap-6 mb-4">
                <div>
                  <span className="text-5xl font-bold font-mono" style={{ color: bertColor }}>
                    {bertScore}
                  </span>
                  <span className="text-xl font-mono text-text-muted">%</span>
                </div>
                <div className="flex-1 pb-2">
                  <div className="relative h-4 rounded-full bg-surface-lighter overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-1000"
                      style={{
                        width: `${bertScore}%`,
                        backgroundColor: bertColor,
                        boxShadow: `0 0 16px ${bertColor}60`,
                      }}
                    />
                    <div className="absolute top-0 bottom-0 left-[35%] w-px bg-text-muted/20" />
                    <div className="absolute top-0 bottom-0 left-[65%] w-px bg-text-muted/20" />
                  </div>
                  <div className="flex justify-between text-[9px] font-mono text-text-muted mt-1">
                    <span>0%</span>
                    <span className="text-success">CLEAN</span>
                    <span className="text-warning">INCONCLUSIVE</span>
                    <span className="text-danger">SUSPICIOUS</span>
                    <span>100%</span>
                  </div>
                </div>
              </div>

              {/* Interpretation */}
              <div className="bg-surface/80 rounded-lg p-4 border border-primary/10">
                <p className="text-sm text-text-secondary leading-relaxed">
                  {getInterpretation(bertTechnique.result, bertTechnique.score, bertTechnique.technique)}
                </p>
              </div>

              {/* Raw explanation */}
              <p className="text-xs text-text-muted mt-3 font-mono leading-relaxed">
                <span className="text-primary/50">$ </span>
                {bertTechnique.explanation}
              </p>
            </div>
          </div>
        );
      })()}

      {/* ── Overall Confidence + Evidence (side by side) ── */}
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

      {/* ── Supporting Techniques (compact) ── */}
      {otherTechniques.length > 0 && (
        <div className="cyber-card overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold text-text-secondary font-mono uppercase tracking-wide">
                Supporting Analysis Techniques
              </h3>
              <p className="text-[10px] text-text-muted font-mono">
                {otherTechniques.length} heuristic techniques
              </p>
            </div>
          </div>

          <div className="divide-y divide-border/50">
            {otherTechniques.map((technique) => {
              const origIndex = report.analysis_breakdown.indexOf(technique);
              const isExpanded = expandedTechniques.has(origIndex);
              const color = getTechniqueColor(technique.result);
              const ResultIcon = TECHNIQUE_ICONS[technique.result];
              const scorePercent = Math.round(technique.score * 100);
              const nameLower = technique.technique.toLowerCase();
              const isExif = nameLower.includes('exif') || nameLower.includes('metadata');
              const weight = isExif
                ? '2.0x'
                : technique.result === 'SUSPICIOUS'
                  ? '1.5x'
                  : technique.result === 'CLEAN'
                    ? '1.3x'
                    : '1.0x';

              return (
                <div key={origIndex} id={`technique-${origIndex}`}>
                  <button
                    onClick={() => toggleTechnique(origIndex)}
                    className="w-full flex items-center gap-2.5 px-4 py-2.5 hover:bg-surface-lighter/50 transition-colors text-left"
                  >
                    <div
                      className="w-5 h-5 rounded flex items-center justify-center shrink-0"
                      style={{ backgroundColor: `${color}15` }}
                    >
                      <ResultIcon className="w-3 h-3" style={{ color }} />
                    </div>

                    <span className="text-xs font-mono text-text-secondary flex-1 min-w-0 truncate">
                      {technique.technique}
                    </span>

                    <div className="hidden sm:flex items-center gap-2 w-28">
                      <div className="flex-1 h-1.5 rounded-full bg-surface-lighter overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${scorePercent}%`, backgroundColor: color }}
                        />
                      </div>
                      <span className="text-[10px] font-mono font-bold w-8 text-right" style={{ color }}>
                        {scorePercent}%
                      </span>
                    </div>

                    <span
                      className="text-[9px] font-bold font-mono px-1.5 py-0.5 rounded uppercase shrink-0"
                      style={{ color, backgroundColor: `${color}10` }}
                    >
                      {technique.result}
                    </span>

                    {isExpanded
                      ? <ChevronUp className="w-3.5 h-3.5 text-text-muted shrink-0" />
                      : <ChevronDown className="w-3.5 h-3.5 text-text-muted shrink-0" />
                    }
                  </button>

                  {isExpanded && (
                    <div className="px-4 pb-3 animate-fade-in">
                      <div className="ml-7 space-y-2">
                        <p className="text-xs text-text-secondary leading-relaxed">
                          {technique.explanation}
                        </p>
                        <p className="text-xs text-text-muted leading-relaxed italic">
                          {getInterpretation(technique.result, technique.score, technique.technique)}
                        </p>
                        <div className="flex items-center gap-3 text-[9px] font-mono text-text-muted">
                          <span>SCORE: <span style={{ color }} className="font-bold">{technique.score.toFixed(3)}</span></span>
                          <span>RESULT: <span style={{ color }} className="font-bold">{technique.result}</span></span>
                          <span>WEIGHT: <span className="font-bold text-text-secondary">{weight}</span></span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

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

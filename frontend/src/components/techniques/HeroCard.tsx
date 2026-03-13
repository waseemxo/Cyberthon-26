import type { AnalysisTechnique, TechniqueResult } from '../../types';
import type { LucideIcon } from 'lucide-react';
import { TECHNIQUE_ICONS, getInterpretation, isBertTechnique } from './constants';
import { getTechniqueColor } from '../../utils/helpers';

interface HeroCardProps {
  technique: AnalysisTechnique;
  icon: LucideIcon;
  accent: 'primary' | 'accent';
  title: string;
  subtitle: string;
}

const ACCENT_STYLES = {
  primary: {
    iconBg: 'bg-primary/15',
    iconText: 'text-primary',
    titleText: 'text-primary',
    interpBorder: 'border-primary/10',
    prefixText: 'text-primary/50',
  },
  accent: {
    iconBg: 'bg-accent/15',
    iconText: 'text-accent',
    titleText: 'text-accent',
    interpBorder: 'border-accent/10',
    prefixText: 'text-accent/50',
  },
} as const;

/**
 * Parse BERT explanation: "Classification: AI-Generated | Confidence: 93.2% | ..."
 */
function parseBertClassification(explanation: string) {
  const classMatch = explanation.match(/Classification:\s*([^|]+)/);
  const confMatch = explanation.match(/Confidence:\s*([^|]+)/);
  if (!classMatch || !confMatch) return null;
  const secondPipe = explanation.indexOf('|', explanation.indexOf('|') + 1);
  const detail = secondPipe !== -1 ? explanation.slice(secondPipe + 1).trim() : '';
  return { label: classMatch[1].trim(), confidence: confMatch[1].trim(), detail };
}

export default function HeroCard({ technique, icon: Icon, accent, title, subtitle }: HeroCardProps) {
  const score = Math.round(technique.score * 100);
  const color = getTechniqueColor(technique.result);
  const ResultIcon = TECHNIQUE_ICONS[technique.result];
  const styles = ACCENT_STYLES[accent];
  const borderOpacity = accent === 'primary' ? '40' : '30';

  const isClassifier = isBertTechnique(technique.technique);
  const bertParsed = isClassifier ? parseBertClassification(technique.explanation) : null;

  return (
    <div className="cyber-card p-0 overflow-hidden border-2" style={{ borderColor: `${color}${borderOpacity}` }}>
      <div className="p-5 bg-gradient-to-r from-surface via-surface-light to-surface">
        <div className="flex items-center gap-2 mb-4">
          <div className={`w-8 h-8 rounded-lg ${styles.iconBg} flex items-center justify-center`}>
            <Icon className={`w-5 h-5 ${styles.iconText}`} />
          </div>
          <div>
            <h2 className={`text-sm font-bold ${styles.titleText} font-mono uppercase tracking-wide`}>
              {title}
            </h2>
            <span className="text-[10px] font-mono text-text-muted uppercase tracking-wider">
              {subtitle}
            </span>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <span
              className="text-xs font-bold font-mono px-3 py-1.5 rounded-lg uppercase tracking-wider border"
              style={{ color, backgroundColor: `${color}12`, borderColor: `${color}30` }}
            >
              <ResultIcon className="w-3.5 h-3.5 inline mr-1.5 -mt-0.5" />
              {technique.result}
            </span>
          </div>
        </div>

        {/* BERT classifier → verdict + confidence boxes */}
        {isClassifier && bertParsed ? (
          <div className="flex flex-wrap items-stretch gap-4 mb-4">
            <div className="flex flex-col items-center justify-center bg-surface rounded-xl border border-border px-6 py-4 min-w-[150px]">
              <span className="text-[10px] font-mono text-text-muted uppercase tracking-widest mb-1.5">
                Classification
              </span>
              <span className="text-lg font-bold font-mono tracking-wide" style={{ color }}>
                {bertParsed.label}
              </span>
            </div>
            <div className="flex flex-col items-center justify-center bg-surface rounded-xl border border-border px-6 py-4 min-w-[110px]">
              <span className="text-[10px] font-mono text-text-muted uppercase tracking-widest mb-1.5">
                Confidence
              </span>
              <span className="text-lg font-bold font-mono" style={{ color }}>
                {bertParsed.confidence}
              </span>
            </div>
            {bertParsed.detail && (
              <div className="flex-1 min-w-[180px] flex flex-col justify-center bg-surface rounded-xl border border-border px-5 py-4">
                <span className="text-[10px] font-mono text-text-muted uppercase tracking-widest mb-1">
                  Model
                </span>
                <span className="text-xs font-mono text-text-secondary leading-relaxed">
                  {bertParsed.detail}
                </span>
              </div>
            )}
          </div>
        ) : (
          /* Non-classifier techniques → percentage bar */
          <div className="flex items-end gap-6 mb-4">
            <div>
              <span className="text-5xl font-bold font-mono" style={{ color }}>
                {score}
              </span>
              <span className="text-xl font-mono text-text-muted">%</span>
            </div>
            <div className="flex-1 pb-2">
              <div className="relative h-4 rounded-full bg-surface-lighter overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-1000"
                  style={{
                    width: `${score}%`,
                    backgroundColor: color,
                    boxShadow: `0 0 16px ${color}60`,
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
        )}

        {/* Interpretation */}
        <div className={`bg-surface/80 rounded-lg p-4 border ${styles.interpBorder}`}>
          <p className="text-sm text-text-secondary leading-relaxed">
            {getInterpretation(technique.result, technique.score, technique.technique)}
          </p>
        </div>

        {/* Raw explanation — skip for BERT since it's already shown above */}
        {!bertParsed && (
          <p className="text-xs text-text-muted mt-3 font-mono leading-relaxed">
            <span className={styles.prefixText}>$ </span>
            {technique.explanation}
          </p>
        )}
      </div>
    </div>
  );
}

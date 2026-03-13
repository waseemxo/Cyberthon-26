import type { AnalysisTechnique, TechniqueResult } from '../../types';
import type { LucideIcon } from 'lucide-react';
import { TECHNIQUE_ICONS, getInterpretation } from './constants';
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

export default function HeroCard({ technique, icon: Icon, accent, title, subtitle }: HeroCardProps) {
  const score = Math.round(technique.score * 100);
  const color = getTechniqueColor(technique.result);
  const ResultIcon = TECHNIQUE_ICONS[technique.result];
  const styles = ACCENT_STYLES[accent];
  const borderOpacity = accent === 'primary' ? '40' : '30';

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

        {/* Large score display */}
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

        {/* Interpretation */}
        <div className={`bg-surface/80 rounded-lg p-4 border ${styles.interpBorder}`}>
          <p className="text-sm text-text-secondary leading-relaxed">
            {getInterpretation(technique.result, technique.score, technique.technique)}
          </p>
        </div>

        {/* Raw explanation */}
        <p className="text-xs text-text-muted mt-3 font-mono leading-relaxed">
          <span className={styles.prefixText}>$ </span>
          {technique.explanation}
        </p>
      </div>
    </div>
  );
}

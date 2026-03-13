import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import type { AnalysisTechnique } from '../../types';
import { TECHNIQUE_ICONS, getInterpretation, isBertTechnique } from './constants';
import { getTechniqueColor } from '../../utils/helpers';

interface TechniqueAccordionProps {
  techniques: AnalysisTechnique[];
  label?: string;
}

function getWeight(technique: AnalysisTechnique): string {
  const name = technique.technique.toLowerCase();
  if (name.includes('bert') || name.includes('deep learning')) return '5.0x';
  if (name.includes('gemini')) return '4.0x';
  if (name.includes('exif') || name.includes('metadata')) return '2.0x';
  if (technique.result === 'SUSPICIOUS') return '1.5x';
  if (technique.result === 'CLEAN') return '1.3x';
  return '1.0x';
}

/** Extract the classification label from BERT explanation string. */
function parseBertLabel(explanation: string): string | null {
  const match = explanation.match(/Classification:\s*([^|]+)/);
  return match ? match[1].trim() : null;
}

export default function TechniqueAccordion({ techniques, label = 'Supporting Analysis Techniques' }: TechniqueAccordionProps) {
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  const toggle = (i: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  };

  return (
    <div className="cyber-card overflow-hidden">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <div>
          <h3 className="text-xs font-bold text-text-secondary font-mono uppercase tracking-wide">
            {label}
          </h3>
          <p className="text-[10px] text-text-muted font-mono">
            {techniques.length} techniques
          </p>
        </div>
      </div>

      <div className="divide-y divide-border/50">
        {techniques.map((technique, i) => {
          const isExpanded = expanded.has(i);
          const color = getTechniqueColor(technique.result);
          const ResultIcon = TECHNIQUE_ICONS[technique.result];
          const scorePercent = Math.round(technique.score * 100);
          const weight = getWeight(technique);
          const isClassifier = isBertTechnique(technique.technique);
          const bertLabel = isClassifier ? parseBertLabel(technique.explanation) : null;

          return (
            <div key={i}>
              <button
                onClick={() => toggle(i)}
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

                {/* BERT: show label instead of percentage bar */}
                {isClassifier && bertLabel ? (
                  <span
                    className="hidden sm:inline text-[10px] font-mono font-bold px-2 py-0.5 rounded border"
                    style={{ color, backgroundColor: `${color}10`, borderColor: `${color}25` }}
                  >
                    {bertLabel}
                  </span>
                ) : (
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
                )}

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
                      {!isClassifier && (
                        <span>SCORE: <span style={{ color }} className="font-bold">{technique.score.toFixed(3)}</span></span>
                      )}
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
  );
}

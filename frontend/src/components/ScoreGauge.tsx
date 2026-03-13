import { getScoreColor } from '../utils/helpers';

interface ScoreGaugeProps {
  score: number;
  size?: number;
  strokeWidth?: number;
  label?: string;
}

export default function ScoreGauge({
  score,
  size = 180,
  strokeWidth = 12,
  label,
}: ScoreGaugeProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = score * circumference;
  const color = getScoreColor(score);
  const percentage = Math.round(score * 100);

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          className="-rotate-90"
          viewBox={`0 0 ${size} ${size}`}
        >
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            className="text-surface-lighter"
            strokeWidth={strokeWidth}
          />
          {/* Progress circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={circumference - progress}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
            style={{
              filter: `drop-shadow(0 0 10px ${color}50)`,
            }}
          />
        </svg>
        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className="text-4xl font-bold font-mono tabular-nums"
            style={{ color }}
          >
            {percentage}
          </span>
          <span className="text-xs text-text-muted font-mono uppercase tracking-wider">
            percent
          </span>
        </div>
      </div>
      {label && (
        <span
          className="text-sm font-semibold font-mono px-3 py-1 rounded-full border"
          style={{ color, backgroundColor: `${color}10`, borderColor: `${color}30` }}
        >
          {label}
        </span>
      )}
    </div>
  );
}

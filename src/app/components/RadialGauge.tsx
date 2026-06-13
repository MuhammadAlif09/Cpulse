import React from "react";

interface RadialGaugeProps {
  value: number;
  max?: number;
  size?: number;
  color?: string;
  trackColor?: string;
  label: string;
  sublabel?: string;
  showValue?: boolean;
}

export function RadialGauge({
  value,
  max = 100,
  size = 120,
  color = "#4f46e5",
  trackColor = "#e2e8f0",
  label,
  sublabel,
  showValue = true,
}: RadialGaugeProps) {
  const pct = Math.min(value / max, 1);
  const strokeW = 9;
  const r = (size - strokeW * 2) / 2;
  const circ = 2 * Math.PI * r;
  const dash = pct * circ;
  const gap = circ - dash;

  return (
    <div className="flex flex-col items-center gap-1.5 w-full h-full justify-center">
      <div className="relative flex items-center justify-center" style={{ width: size, height: size, maxWidth: '100%', maxHeight: '100%' }}>
        <svg viewBox={`0 0 ${size} ${size}`} className="-rotate-90 w-full h-full" style={{ display: "block" }}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={trackColor} strokeWidth={strokeW} />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={color}
            strokeWidth={strokeW}
            strokeDasharray={`${dash} ${gap}`}
            strokeLinecap="round"
            style={{ transition: "stroke-dasharray 1.2s cubic-bezier(.4,0,.2,1)", filter: `drop-shadow(0 0 6px ${color}60)` }}
          />
        </svg>
        {showValue && (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-base font-bold" style={{ color }}>{value}%</span>
          </div>
        )}
      </div>
      <span className="text-xs font-medium text-center text-[#ffffff]">{label}</span>
      {sublabel && <span className="text-xs text-slate-400 text-center">{sublabel}</span>}
    </div>
  );
}

import React, { useState } from "react";
import { cn } from "./utils";

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  color: string;
}

export function StatCard({ icon, label, value, sub, color }: StatCardProps) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className={cn(
        "rounded-2xl p-4 relative transition-all duration-300 hover:shadow-lg group cursor-default bg-card/80 backdrop-blur-md"
      )}
      style={{
        border: "1px solid var(--border)",
        background: `linear-gradient(145deg, var(--card) 60%, color-mix(in srgb, ${color} 4%, transparent))`,
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* 
        Tracing Border Progress Line (Clockwise Rotating):
        Normally a small vertical indicator bar on the left edge.
        On hover, it animates (traces) clockwise to cover 100% of the card border.
      */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none rounded-2xl">
        <rect
          x="2"
          y="2"
          width="calc(100% - 4px)"
          height="calc(100% - 4px)"
          rx="14"
          fill="none"
          stroke={color}
          strokeWidth="2"
          pathLength="100"
          style={{
            strokeDasharray: isHovered ? "100 0" : "12 88",
            strokeDashoffset: isHovered ? 0 : 16,
            transition:
              "stroke-dasharray 0.6s cubic-bezier(0.16, 1, 0.3, 1), stroke-dashoffset 0.6s cubic-bezier(0.16, 1, 0.3, 1)",
            opacity: isHovered ? 0.9 : 0.7,
          }}
        />
      </svg>

      <div className="pl-3 relative z-10">
        <div className="flex items-center gap-2 mb-2" style={{ color }}>
          {icon}
          <span className="text-xs font-semibold tracking-wide uppercase opacity-80">{label}</span>
        </div>
        <div
          className="text-2xl font-bold tracking-tight text-foreground"
          style={{ fontFamily: "'Satoshi', sans-serif", fontVariantNumeric: "tabular-nums" }}
        >
          {value}
        </div>
        {sub && <div className="text-[11px] text-muted-foreground mt-1 truncate">{sub}</div>}
      </div>
    </div>
  );
}

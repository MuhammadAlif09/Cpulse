import React from "react";
import { cn } from "./utils";

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  color: string;
}

export function StatCard({ icon, label, value, sub, color }: StatCardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl p-4 relative overflow-hidden transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 group"
      )}
      style={{
        border: `1px solid color-mix(in srgb, ${color} 20%, transparent)`,
        background: `linear-gradient(145deg, var(--card) 60%, color-mix(in srgb, ${color} 5%, transparent))`,
      }}
    >
      {/* background hover stripe effect */}
      <div
        className="absolute left-0 top-4 bottom-4 w-0.5 rounded-full transition-all duration-300 ease-out group-hover:w-full group-hover:top-0 group-hover:bottom-0 group-hover:rounded-none opacity-100 group-hover:opacity-10 z-0"
        style={{ background: color }}
      />
      <div className="pl-3 relative z-10">
        <div className="flex items-center gap-2 mb-2" style={{ color }}>
          {icon}
          <span className="text-xs font-semibold tracking-wide uppercase opacity-80">
            {label}
          </span>
        </div>
        <div
          className="text-2xl font-bold tracking-tight text-foreground"
          style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
        >
          {value}
        </div>
        {sub && (
          <div className="text-[11px] text-muted-foreground mt-1 truncate">{sub}</div>
        )}
      </div>
    </div>
  );
}

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
        "rounded-2xl p-4 relative overflow-hidden transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 group cursor-default"
      )}
      style={{
        border: `1px solid color-mix(in srgb, ${color} 20%, transparent)`,
        background: `linear-gradient(145deg, var(--card) 60%, color-mix(in srgb, ${color} 5%, transparent))`,
      }}
    >
      {/*
        Expanding Hollow Outline Effect:
        Starts as a 4px wide bar on the left.
        On hover, the width expands to 100%, and since it has transparent top and bottom borders,
        it effectively creates a top/bottom border tracking outward.
        It is hollow in the middle.
      */}
      <div
        className="absolute left-0 top-4 bottom-4 w-[4px] border-2 rounded-2xl transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:top-0 group-hover:bottom-0 group-hover:w-full pointer-events-none"
        style={{ borderColor: color }}
      />

      <div className="pl-3 relative z-10 transition-transform duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:translate-x-1">
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
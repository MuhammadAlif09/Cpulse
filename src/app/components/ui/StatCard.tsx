import React from "react";
import { cn } from "./utils"; // Assuming utils holds cn

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
        "rounded-2xl p-4 border border-slate-200 dark:border-slate-800/40 shadow-sm relative overflow-hidden transition-all duration-150 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100",
        "hover:shadow-md"
      )}
    >
      <div className="flex items-start justify-between mb-3">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors"
          style={{ background: `${color}20`, color: color }}
        >
          {icon}
        </div>
      </div>
      <div className="text-2xl font-semibold tracking-tight text-slate-800 dark:text-slate-100">
        {value}
      </div>
      <div
        className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium"
        style={{ color: color }}
      >
        {label}
      </div>
      {sub && (
        <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 truncate">{sub}</div>
      )}
    </div>
  );
}

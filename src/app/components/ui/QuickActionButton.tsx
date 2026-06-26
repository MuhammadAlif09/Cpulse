import React from "react";
import { RefreshCw } from "lucide-react";

interface QuickActionButtonProps {
  id: string;
  icon: React.ReactNode;
  label: string;
  sub: string;
  color: string;
  onClick: () => void;
  isLoading?: boolean;
}

export function QuickActionButton({
  id,
  icon,
  label,
  sub,
  color,
  onClick,
  isLoading = false,
}: QuickActionButtonProps) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-2.5 p-4 rounded-2xl border border-slate-100 dark:border-slate-800/60 hover:border-slate-200 dark:hover:border-slate-700/60 transition-all duration-300 hover:-translate-y-1 hover:shadow-md active:scale-95 group text-left w-full cursor-pointer bg-white dark:bg-slate-900"
      style={{ background: `linear-gradient(135deg, ${color}05, ${color}0f)` }}
    >
      <div
        className="w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 group-hover:scale-110"
        style={{ background: `${color}15`, color: color }}
      >
        {isLoading ? (
          <RefreshCw size={20} className="animate-spin" data-testid="loading-spinner" />
        ) : (
          icon
        )}
      </div>
      <div className="text-center">
        <div className="text-xs font-bold text-slate-800 dark:text-slate-100">{label}</div>
        <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">{sub}</div>
      </div>
    </button>
  );
}

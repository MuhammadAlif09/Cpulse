import React from "react";
import { RefreshCw, CheckCircle2 } from "lucide-react";

interface QuickActionButtonProps {
  id: string;
  icon: React.ReactNode;
  label: string;
  sub: string;
  color: string;
  onClick: () => void;
  isLoading?: boolean;
  done?: boolean;
}

export function QuickActionButton({
  id,
  icon,
  label,
  sub,
  color,
  onClick,
  isLoading = false,
  done = false,
}: QuickActionButtonProps) {
  const activeColor = done ? "#10b981" : color;

  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 p-3.5 rounded-xl text-left w-full cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 active:scale-[0.99]"
      style={{
        border: `1px solid color-mix(in srgb, ${activeColor} 25%, transparent)`,
        background: `color-mix(in srgb, ${activeColor} 6%, var(--card))`,
      }}
    >
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform duration-200"
        style={{
          background: `color-mix(in srgb, ${activeColor} 12%, transparent)`,
          color: activeColor,
        }}
      >
        {isLoading ? (
          <RefreshCw size={18} className="animate-spin" data-testid="loading-spinner" />
        ) : done ? (
          <CheckCircle2 size={18} />
        ) : (
          icon
        )}
      </div>
      <div className="min-w-0">
        <div className="text-sm font-semibold text-foreground truncate">{label}</div>
        <div className="text-[11px] text-muted-foreground truncate mt-0.5">{sub}</div>
      </div>
    </button>
  );
}

import React from "react";
import { RefreshCw, Check } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

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
      className="flex items-center gap-3 p-3.5 rounded-xl text-left w-full cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0 active:scale-[0.99] backdrop-blur-sm"
      style={{
        border: `1px solid color-mix(in srgb, ${activeColor} 20%, transparent)`,
        background: `color-mix(in srgb, ${activeColor} 5%, var(--card))`,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = `0 4px 16px -4px color-mix(in srgb, ${activeColor} 25%, transparent)`;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = `none`;
      }}
    >
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform duration-200"
        style={{
          background: `color-mix(in srgb, ${activeColor} 12%, transparent)`,
          color: activeColor,
        }}
      >
        <AnimatePresence mode="wait">
          {isLoading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
            >
              <RefreshCw size={18} className="animate-spin" data-testid="loading-spinner" />
            </motion.div>
          ) : done ? (
            <motion.div
              key="done"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", stiffness: 400, damping: 18 }}
            >
              <Check size={18} strokeWidth={3} />
            </motion.div>
          ) : (
            <motion.div
              key="icon"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
            >
              {icon}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <div className="min-w-0">
        <div className="text-sm font-semibold text-foreground truncate">{label}</div>
        <div className="text-[11px] text-muted-foreground truncate mt-0.5">{sub}</div>
      </div>
    </button>
  );
}

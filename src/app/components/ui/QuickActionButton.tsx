import React from "react";
import { motion } from "framer-motion";
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
    <motion.button
      onClick={onClick}
      className="flex flex-col items-center gap-2.5 p-4 rounded-2xl border border-white/5 dark:border-slate-800/60 hover:border-indigo-500/30 transition-colors duration-300 group text-left w-full cursor-pointer bg-slate-900/50 dark:bg-slate-950/40 backdrop-blur-md"
      style={{ background: `linear-gradient(135deg, ${color}10, ${color}1a)` }}
      whileHover={{ scale: 1.03, y: -2 }}
      whileTap={{ scale: 0.97 }}
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
        <div className="text-xs font-bold text-slate-100">{label}</div>
        <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">{sub}</div>
      </div>
    </motion.button>
  );
}

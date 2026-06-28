import React from "react";
import { motion } from "motion/react";
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
    <motion.div
      className={cn(
        "rounded-2xl p-4 border border-white/5 dark:border-slate-800/40 relative overflow-hidden transition-colors duration-150 bg-slate-900/50 dark:bg-slate-950/40 backdrop-blur-md text-slate-100",
        "hover:border-indigo-500/30"
      )}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
    >
      <div className="flex items-start justify-between mb-3">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors"
          style={{ background: `${color}20`, color: color }}
        >
          {icon}
        </div>
      </div>
      <div className="text-2xl font-semibold tracking-tight text-slate-100">{value}</div>
      <div className="text-xs mt-1 font-medium" style={{ color }}>
        {label}
      </div>
      {sub && (
        <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 truncate">{sub}</div>
      )}
    </motion.div>
  );
}

import React from "react";
import { HardDrive } from "lucide-react";

interface Disk {
  name: string;
  model?: string;
  used: number; // GB
  total: number; // GB
  disk_type?: string;
}

interface DiskRowProps {
  disk: Disk;
  t: (text: string) => string;
}

const C = {
  indigo: "#4f46e5",
  amber: "#f59e0b",
  rose: "#f43f5e",
};

export function DiskRow({ disk, t }: DiskRowProps) {
  const usedPct = disk.total > 0 ? Math.round((disk.used / disk.total) * 100) : 0;
  const barColor = usedPct > 85 ? C.rose : usedPct > 70 ? C.amber : C.indigo;
  const barBg =
    usedPct > 85
      ? "rgba(244,63,94,0.15)"
      : usedPct > 70
        ? "rgba(245,158,11,0.15)"
        : "rgba(79,70,229,0.15)";

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 min-w-0">
          <HardDrive size={13} className="text-slate-400 dark:text-slate-500 flex-shrink-0" />
          <span className="truncate">{disk.name}</span>
          <span className="text-[9px] font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/30 px-1 py-0.25 rounded flex-shrink-0">
            {disk.disk_type || "SSD"}
          </span>
          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium truncate hidden md:inline">
            {disk.model}
          </span>
        </div>
        <span className="font-semibold text-slate-600 dark:text-slate-300 flex-shrink-0">
          {disk.used.toFixed(1)} / {disk.total.toFixed(1)} GB
        </span>
      </div>
      <div className="w-full h-2 rounded-full" style={{ backgroundColor: barBg }}>
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${usedPct}%`,
            backgroundColor: barColor,
          }}
        />
      </div>
      <div className="text-[9px] text-slate-400 dark:text-slate-500 flex md:hidden items-center justify-between font-medium">
        <span className="truncate max-w-[150px]">{disk.model}</span>
        <span>
          {usedPct}% {t("used")}
        </span>
      </div>
    </div>
  );
}

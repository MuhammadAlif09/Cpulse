import React from "react";
import { HardDrive } from "lucide-react";
import { P } from "../../../design/tokens";

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

export function DiskRow({ disk, t }: DiskRowProps) {
  const usedPct = disk.total > 0 ? Math.round((disk.used / disk.total) * 100) : 0;
  const barColor = usedPct > 85 ? P.bad : usedPct > 70 ? P.warn : P.teal;
  const barBg = `${barColor}20`;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <div className="font-bold text-foreground flex items-center gap-1.5 min-w-0">
          <HardDrive size={13} className="text-muted-foreground flex-shrink-0" />
          <span className="truncate">{disk.name}</span>
          <span
            className="text-[9px] font-semibold px-1 py-0.25 rounded flex-shrink-0"
            style={{ color: P.teal, backgroundColor: `${P.teal}18` }}
          >
            {disk.disk_type || "SSD"}
          </span>
          <span className="text-[10px] text-muted-foreground font-medium truncate hidden md:inline">
            {disk.model}
          </span>
        </div>
        <span className="font-semibold text-foreground flex-shrink-0">
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
      <div className="text-[9px] text-muted-foreground flex md:hidden items-center justify-between font-medium">
        <span className="truncate max-w-[150px]">{disk.model}</span>
        <span>
          {usedPct}% {t("used")}
        </span>
      </div>
    </div>
  );
}

import React, { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  CheckCircle2,
  AlertTriangle,
  Cpu,
  MemoryStick,
  HardDrive,
  Wifi,
  Trash2,
  PackageX,
  Lock,
  Sparkles,
  RefreshCw,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { RadialGauge } from "../components/RadialGauge";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { useSystemMetrics } from "../hooks/useSystemMetrics";
import { useJunkScanner } from "../hooks/useJunkScanner";
import { useAppStore } from "../store/useAppStore";

const C = {
  indigo: "#4f46e5",
  violet: "#7c3aed",
  cyan: "#0ea5e9",
  emerald: "#10b981",
  amber: "#f59e0b",
  rose: "#f43f5e",
  pink: "#ec4899",
  slate: "#64748b",
};

function cn(...classes: (string | undefined | false)[]) {
  return classes.filter(Boolean).join(" ");
}

function GradientCard({
  children,
  className = "",
  style = {},
  gradient,
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  gradient?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl p-5 border border-white/60 shadow-sm relative overflow-hidden",
        className
      )}
      style={{
        background: gradient ?? "#ffffff",
        boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function DashboardTab() {
  const { t } = useTranslation();
  const setTab = useAppStore((state) => state.setTab);
  const { metrics, cpuData, ramData } = useSystemMetrics();
  const { junkCats, scanning, cleaning, startScan, doClean } = useJunkScanner();
  const [ramCleanState, setRamCleanState] = useState<"ready" | "cleaning" | "done">("ready");
  const [freedRam, setFreedRam] = useState("0 MB");
  const [freedJunk, setFreedJunk] = useState("0 MB");

  // Mocks for now, can extract later
  const score = 85;
  const issues: string[] = [];
  const startupCountStr = "0 items active";

  const totalDiskUsed = metrics ? metrics.disks.reduce((acc, d) => acc + d.used, 0) : 0;
  const totalDiskSize = metrics ? metrics.disks.reduce((acc, d) => acc + d.total, 0) : 1;
  const diskUsagePct = metrics ? Math.round((totalDiskUsed / totalDiskSize) * 100) : 0;

  let cpuTempStr = "N/A";
  if (metrics && metrics.cpu_temp > 0.0) {
    cpuTempStr = `${Math.round(metrics.cpu_temp)}°C`;
  }

  const STATS = metrics
    ? [
        {
          label: "CPU Usage",
          value: `${Math.round(metrics.cpu_usage)}%`,
          sub: cpuTempStr === "N/A" ? t("Run as Admin for Temp") : metrics.cpu_name,
          icon: <Cpu size={18} />,
          color: C.indigo,
          temp: cpuTempStr,
          trend: 0,
          gradient: "linear-gradient(135deg,#ede9fe,#ddd6fe)",
        },
        {
          label: "RAM Usage",
          value: `${Math.round(metrics.ram_usage)}%`,
          sub: `${metrics.used_ram.toFixed(1)} / ${metrics.total_ram.toFixed(1)} GB ${t("in use")}`,
          icon: <MemoryStick size={18} />,
          color: C.violet,
          trend: 0,
          gradient: "linear-gradient(135deg,#f3e8ff,#e9d5ff)",
        },
        {
          label: "Disk Usage",
          value: `${diskUsagePct}%`,
          sub: `${totalDiskUsed.toFixed(1)} / ${totalDiskSize.toFixed(1)} GB ${t("in use")}`,
          icon: <HardDrive size={18} />,
          color: C.amber,
          trend: 0,
          gradient: "linear-gradient(135deg,#fef3c7,#fde68a)",
        },
        {
          label: "Network I/O",
          value: `${(metrics.network_up + metrics.network_down).toFixed(1)} MB/s`,
          sub: `${t("Up")}: ${metrics.network_up.toFixed(1)} | ${t("Down")}: ${metrics.network_down.toFixed(1)}`,
          icon: <Wifi size={18} />,
          color: C.emerald,
          trend: 0,
          gradient: "linear-gradient(135deg,#d1fae5,#a7f3d0)",
        },
      ]
    : [
        {
          label: "CPU Usage",
          value: "...",
          sub: t("Waiting for data"),
          icon: <Cpu size={18} />,
          color: C.indigo,
          temp: "",
          trend: 0,
          gradient: "linear-gradient(135deg,#ede9fe,#ddd6fe)",
        },
        {
          label: "RAM Usage",
          value: "...",
          sub: t("Waiting for data"),
          icon: <MemoryStick size={18} />,
          color: C.violet,
          trend: 0,
          gradient: "linear-gradient(135deg,#f3e8ff,#e9d5ff)",
        },
        {
          label: "Disk Usage",
          value: "...",
          sub: t("Waiting for data"),
          icon: <HardDrive size={18} />,
          color: C.amber,
          trend: 0,
          gradient: "linear-gradient(135deg,#fef3c7,#fde68a)",
        },
        {
          label: "Network I/O",
          value: "...",
          sub: t("Waiting for data"),
          icon: <Wifi size={18} />,
          color: C.emerald,
          trend: 0,
          gradient: "linear-gradient(135deg,#d1fae5,#a7f3d0)",
        },
      ];

  return (
    <div className="space-y-5">
      <GradientCard
        className="text-white border border-white/40 shadow-xl relative overflow-hidden"
        style={{
          background:
            "linear-gradient(135deg, rgba(79,70,229,0.9) 0%, rgba(124,58,237,0.85) 50%, rgba(14,165,233,0.9) 100%)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
        }}
      >
        <div className="relative flex items-center justify-between flex-wrap gap-6">
          <div>
            <p className="text-indigo-100 text-sm mb-1">{t("System Health Score")}</p>
            <div className="flex items-end gap-3">
              <span className="text-6xl font-bold tracking-tight">{score}</span>
              <span className="text-2xl text-indigo-200 mb-2">/100</span>
            </div>
          </div>
          <div className="flex flex-wrap md:flex-nowrap gap-6 w-full md:w-auto items-center justify-center">
            <RadialGauge
              value={metrics ? Math.round(metrics.cpu_usage) : 0}
              label="CPU"
              color="rgba(255,255,255,0.9)"
              trackColor="rgba(255,255,255,0.2)"
              size={90}
            />
            <RadialGauge
              value={metrics ? Math.round(metrics.ram_usage) : 0}
              label="RAM"
              color="rgba(255,255,255,0.9)"
              trackColor="rgba(255,255,255,0.2)"
              size={90}
            />
            <RadialGauge
              value={diskUsagePct}
              label="Disk"
              color="rgba(255,255,255,0.9)"
              trackColor="rgba(255,255,255,0.2)"
              size={90}
            />
          </div>
        </div>
      </GradientCard>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {STATS.map((s) => (
          <GradientCard key={s.label} gradient={s.gradient}>
            <div className="flex items-start justify-between mb-3">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: `${s.color}20`, color: s.color }}
              >
                {s.icon}
              </div>
            </div>
            <div className="text-2xl font-bold text-slate-800">
              {s.label === "CPU Usage" && s.temp ? s.temp : s.value}
            </div>
            <div className="text-xs text-slate-500 mt-0.5 truncate">{s.sub}</div>
            <div className="text-xs font-medium mt-2" style={{ color: s.color }}>
              {t(s.label)}
            </div>
          </GradientCard>
        ))}
      </div>
    </div>
  );
}

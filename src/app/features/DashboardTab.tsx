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
  Zap,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { RadialGauge } from "../components/RadialGauge";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { useSystemMetrics } from "../hooks/useSystemMetrics";
import { useJunkScanner } from "../hooks/useJunkScanner";
import { addHistoryLog } from "../utils/history";

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

interface DashboardTabProps {
  lang?: string;
  setTab: (
    tab: "dashboard" | "cleaner" | "booster" | "startup" | "privacy" | "history" | "settings"
  ) => void;
  metrics?: any;
  junkItems?: any[];
  setJunkItems?: any;
  startupItems?: any[];
  score: number;
  issues: string[];
  healthText: string;
}

export function DashboardTab({
  lang,
  setTab,
  junkItems = [],
  startupItems = [],
  score,
  issues,
  healthText,
}: DashboardTabProps) {
  const { t } = useTranslation();
  const { metrics, cpuData, ramData } = useSystemMetrics();

  // In-place Clean Action States
  const [cleanActionState, setCleanActionState] = useState<
    "idle" | "scanning" | "cleaning" | "cleaned"
  >("idle");
  const [cleanedSize, setCleanedSize] = useState("");

  // In-place RAM Boost States
  const [boostActionState, setBoostActionState] = useState<"idle" | "running" | "boosted">("idle");
  const [boostedSize, setBoostedSize] = useState("");

  const activeStartup = startupItems ? startupItems.filter((i) => i.enabled).length : 0;
  const startupCountStr = `${activeStartup} ${t("items active")}`;

  const totalDiskUsed = metrics
    ? metrics.disks.reduce((acc: number, d: any) => acc + d.used, 0)
    : 0;
  const totalDiskSize = metrics
    ? metrics.disks.reduce((acc: number, d: any) => acc + d.total, 0)
    : 1;
  const diskUsagePct = metrics ? Math.round((totalDiskUsed / totalDiskSize) * 100) : 0;

  const totalJunkBytes = junkItems ? junkItems.reduce((acc, c) => acc + c.bytes, 0) : 0;
  const junkSizeStr =
    totalJunkBytes > 0 ? `${(totalJunkBytes / 1048576).toFixed(1)} MB ready` : t("0 MB ready");

  let cpuTempStr = "N/A";
  if (metrics && metrics.cpu_temp > 0.0) {
    cpuTempStr = `${Math.round(metrics.cpu_temp)}°C`;
  }

  const handleCleanJunk = async () => {
    if (cleanActionState !== "idle") return;
    setCleanActionState("scanning");
    const startTime = Date.now();
    try {
      const results: any[] = await invoke("scan_junk");
      const bytes = results.reduce((acc, c) => acc + c.bytes, 0);
      const sizeStr = (bytes / 1048576).toFixed(1) + " MB";
      setCleanedSize(sizeStr);

      const filesCount = results.reduce((acc, c) => acc + c.count, 0);

      if (bytes > 0) {
        setCleanActionState("cleaning");
        const categories = results.map((r) => r.name);
        await invoke("clean_junk", { categories });
        setCleanActionState("cleaned");

        const duration = ((Date.now() - startTime) / 1000).toFixed(1) + "s";
        addHistoryLog({
          type: "Quick Clean",
          freed: sizeStr,
          fixed: filesCount,
          duration,
        });
      } else {
        setCleanActionState("cleaned");
        setCleanedSize("0 MB");

        const duration = ((Date.now() - startTime) / 1000).toFixed(1) + "s";
        addHistoryLog({
          type: "Quick Clean",
          freed: "0 MB",
          fixed: 0,
          duration,
        });
      }

      setTimeout(() => {
        setCleanActionState("idle");
      }, 4000);
    } catch (err) {
      console.error("Quick clean error:", err);
      setCleanActionState("idle");
    }
  };

  const handleRamBoost = async () => {
    if (boostActionState !== "idle") return;
    setBoostActionState("running");
    const startTime = Date.now();
    try {
      const bytesFreed = await invoke<number>("clean_ram");
      const sizeStr =
        bytesFreed > 1073741824
          ? `+${(bytesFreed / 1073741824).toFixed(1)} GB freed`
          : `+${(bytesFreed / 1048576).toFixed(0)} MB freed`;

      const freedLogStr =
        bytesFreed > 1073741824
          ? `${(bytesFreed / 1073741824).toFixed(1)} GB`
          : `${(bytesFreed / 1048576).toFixed(0)} MB`;

      setBoostedSize(sizeStr);
      setBoostActionState("boosted");

      const duration = ((Date.now() - startTime) / 1000).toFixed(1) + "s";
      addHistoryLog({
        type: "RAM Boost",
        freed: freedLogStr,
        fixed: 1,
        duration,
      });

      setTimeout(() => {
        setBoostActionState("idle");
      }, 4000);
    } catch (err) {
      console.error("RAM clean error:", err);
      setBoostActionState("idle");
    }
  };

  const STATS = metrics
    ? [
        {
          label: "CPU Usage",
          value: `${Math.round(metrics.cpu_usage)}%`,
          sub: t("Global CPU Load"),
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
            <p className="text-indigo-200 text-xs mt-1">
              {issues && issues.length > 0
                ? `${t(healthText)} — ${issues.length} ${t(issues.length === 1 ? "issue found" : "issues found")}`
                : t("System is running optimally")}
            </p>
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
        <div className="relative flex flex-wrap gap-3 mt-5 pt-4 border-t border-white/20">
          <div className="flex items-center gap-1.5 text-xs text-indigo-100">
            <CheckCircle2 size={13} /> {t("Real-time protection active")}
          </div>
          {issues &&
            issues.map((issue, idx) => (
              <div key={idx} className="flex items-center gap-1.5 text-xs text-indigo-100">
                <AlertTriangle size={13} /> {t(issue)}
              </div>
            ))}
          {(!issues || issues.length === 0) && (
            <div className="flex items-center gap-1.5 text-xs text-indigo-100">
              <CheckCircle2 size={13} /> {t("Disk and memory are healthy")}
            </div>
          )}
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
            <div className="text-2xl font-bold text-slate-800">{s.value}</div>
            <div className="text-xs text-slate-500 mt-0.5 truncate">{s.sub}</div>
            <div className="text-xs font-medium mt-2" style={{ color: s.color }}>
              {t(s.label)}
            </div>
          </GradientCard>
        ))}
      </div>

      {/* charts + disk space */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* CPU History */}
        <GradientCard style={{ background: "white", overflow: "hidden" }}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-slate-700">{t("CPU History")}</span>
            <span className="text-xs text-slate-400">{t("Last 20s")}</span>
          </div>
          <div className="relative h-20">
            {/* big bg number */}
            <div className="absolute inset-0 flex items-center justify-end pr-2 pointer-events-none select-none overflow-hidden">
              <span
                className="font-black leading-none"
                style={{
                  fontSize: "4.5rem",
                  background: `linear-gradient(180deg, ${C.indigo}18 0%, ${C.indigo}02 100%)`,
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                  letterSpacing: "-0.04em",
                }}
              >
                {metrics ? Math.round(metrics.cpu_usage) : 0}%
              </span>
            </div>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={cpuData} margin={{ top: 0, right: 0, left: -30, bottom: 0 }}>
                <defs>
                  <linearGradient id="cpuGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop key="cpu-stop-top" offset="5%" stopColor={C.indigo} stopOpacity={0.2} />
                    <stop key="cpu-stop-bot" offset="95%" stopColor={C.indigo} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="t" hide />
                <YAxis domain={[0, 100]} hide />
                <Tooltip
                  contentStyle={{
                    fontSize: 11,
                    borderRadius: 8,
                    border: "none",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
                  }}
                  labelStyle={{ display: "none" }}
                  formatter={(v: number) => [`${v}%`, "CPU"]}
                />
                <Area
                  type="monotone"
                  dataKey="v"
                  stroke={C.indigo}
                  strokeWidth={2}
                  fill="url(#cpuGrad)"
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </GradientCard>

        {/* RAM History */}
        <GradientCard style={{ background: "white", overflow: "hidden" }}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-slate-700">{t("RAM History")}</span>
            <span className="text-xs text-slate-400">{t("Last 20s")}</span>
          </div>
          <div className="relative h-20">
            {/* big bg number */}
            <div className="absolute inset-0 flex items-center justify-end pr-2 pointer-events-none select-none overflow-hidden">
              <span
                className="font-black leading-none"
                style={{
                  fontSize: "4.5rem",
                  background: `linear-gradient(180deg, ${C.violet}18 0%, ${C.violet}02 100%)`,
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                  letterSpacing: "-0.04em",
                }}
              >
                {metrics ? Math.round(metrics.ram_usage) : 0}%
              </span>
            </div>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={ramData} margin={{ top: 0, right: 0, left: -30, bottom: 0 }}>
                <defs>
                  <linearGradient id="ramGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop key="ram-stop-top" offset="5%" stopColor={C.violet} stopOpacity={0.2} />
                    <stop key="ram-stop-bot" offset="95%" stopColor={C.violet} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="t" hide />
                <YAxis domain={[0, 100]} hide />
                <Tooltip
                  contentStyle={{
                    fontSize: 11,
                    borderRadius: 8,
                    border: "none",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
                  }}
                  labelStyle={{ display: "none" }}
                  formatter={(v: number) => [`${v}%`, "RAM"]}
                />
                <Area
                  type="monotone"
                  dataKey="v"
                  stroke={C.violet}
                  strokeWidth={2}
                  fill="url(#ramGrad)"
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </GradientCard>

        {/* Disk Space List */}
        <GradientCard style={{ background: "white" }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-slate-700">{t("Disk Space")}</span>
            <span className="text-[10px] text-slate-400 font-medium">
              {metrics?.disks ? `${metrics.disks.length} ${t("drives")}` : "..."}
            </span>
          </div>
          <div className="space-y-3 max-h-[96px] overflow-y-auto pr-1">
            {metrics?.disks && metrics.disks.length > 0 ? (
              metrics.disks.map((disk: any) => {
                const usedPct = disk.total > 0 ? Math.round((disk.used / disk.total) * 100) : 0;
                const barColor = usedPct > 85 ? C.rose : usedPct > 70 ? C.amber : C.indigo;
                const barBg = usedPct > 85 ? "#ffe4e6" : usedPct > 70 ? "#fef3c7" : "#ede9fe";
                return (
                  <div key={disk.name} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <div className="font-bold text-slate-800 flex items-center gap-1.5 min-w-0">
                        <HardDrive size={13} className="text-slate-400 flex-shrink-0" />
                        <span className="truncate">{disk.name}</span>
                        <span className="text-[9px] font-semibold text-indigo-600 bg-indigo-50 px-1 py-0.25 rounded flex-shrink-0">
                          {disk.disk_type || "SSD"}
                        </span>
                        <span className="text-[10px] text-slate-400 font-medium truncate hidden md:inline">
                          {disk.model}
                        </span>
                      </div>
                      <span className="font-semibold text-slate-600 flex-shrink-0">
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
                    <div className="text-[9px] text-slate-400 flex md:hidden items-center justify-between font-medium">
                      <span className="truncate max-w-[150px]">{disk.model}</span>
                      <span>{usedPct}% used</span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-xs text-slate-400 py-6 text-center">{t("Loading disks...")}</div>
            )}
          </div>
        </GradientCard>
      </div>

      {/* quick actions */}
      <GradientCard style={{ background: "white" }}>
        <h3 className="text-sm font-semibold text-slate-700 mb-4">{t("Quick Actions")}</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            {
              id: "cleaner",
              icon: <Trash2 size={18} />,
              label:
                cleanActionState === "scanning"
                  ? t("Scanning...")
                  : cleanActionState === "cleaning"
                    ? t("Cleaning...")
                    : cleanActionState === "cleaned"
                      ? t("Cleaned!")
                      : t("Clean Junk"),
              sub:
                cleanActionState === "cleaned"
                  ? `${t("Cleaned")} ${cleanedSize}`
                  : cleanActionState === "scanning"
                    ? t("Scanning...")
                    : cleanActionState === "cleaning"
                      ? t("Cleaning...")
                      : junkSizeStr,
              color: C.indigo,
              onClick: handleCleanJunk,
            },
            {
              id: "booster",
              icon: <Zap size={18} />,
              label:
                boostActionState === "running"
                  ? t("Running...")
                  : boostActionState === "boosted"
                    ? t("Boosted!")
                    : t("Boost Now"),
              sub:
                boostActionState === "boosted"
                  ? boostedSize
                  : boostActionState === "running"
                    ? t("Optimizing...")
                    : t("Optimize memory"),
              color: C.violet,
              onClick: handleRamBoost,
            },
            {
              id: "startup",
              icon: <PackageX size={18} />,
              label: t("Fix Startup"),
              sub: startupCountStr,
              color: C.amber,
              onClick: () => setTab("startup"),
            },
            {
              id: "privacy",
              icon: <Lock size={18} />,
              label: t("Privacy Sweep"),
              sub: t("Traces found"),
              color: C.rose,
              onClick: () => setTab("privacy"),
            },
          ].map((a) => (
            <button
              key={a.id}
              onClick={a.onClick}
              className="flex flex-col items-center gap-2.5 p-4 rounded-2xl border border-slate-100 hover:border-slate-200 transition-all duration-300 hover:-translate-y-1 hover:shadow-md active:scale-95 group text-left w-full"
              style={{ background: `linear-gradient(135deg, ${a.color}05, ${a.color}0f)` }}
            >
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-300 group-hover:scale-110"
                style={{ background: `${a.color}15`, color: a.color }}
              >
                {a.id === "cleaner" &&
                (cleanActionState === "scanning" || cleanActionState === "cleaning") ? (
                  <RefreshCw size={20} className="animate-spin" />
                ) : a.id === "booster" && boostActionState === "running" ? (
                  <RefreshCw size={20} className="animate-spin" />
                ) : (
                  a.icon
                )}
              </div>
              <div className="text-center">
                <div className="text-xs font-bold text-slate-800">{a.label}</div>
                <div className="text-[10px] text-slate-400 mt-0.5">{a.sub}</div>
              </div>
            </button>
          ))}
        </div>
      </GradientCard>
    </div>
  );
}

import React, { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  Activity,
  Clock,
  HardDrive,
  FileText,
  ShieldAlert,
  ArrowUp,
  ArrowDown,
  Cpu,
  RefreshCw,
  ServerCrash,
} from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { useTranslation } from "react-i18next";
import { useSystemMetrics } from "../hooks/useSystemMetrics";
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

export function DiagnosticsTab() {
  const { t } = useTranslation();
  const { metrics } = useSystemMetrics();

  // Local state to store telemetry charts history
  const [diskHistory, setDiskHistory] = useState<{ t: number; read: number; write: number }[]>(
    Array.from({ length: 20 }, (_, i) => ({ t: i, read: 0, write: 0 }))
  );
  const [networkHistory, setNetworkHistory] = useState<{ t: number; up: number; down: number }[]>(
    Array.from({ length: 20 }, (_, i) => ({ t: i, up: 0, down: 0 }))
  );

  // States for report generation
  const [generatingReport, setGeneratingReport] = useState(false);
  const [reportResult, setReportResult] = useState<string | null>(null);
  const [reportError, setReportError] = useState<string | null>(null);

  // Collect historical metrics whenever metrics update
  useEffect(() => {
    if (!metrics) return;

    setDiskHistory((prev) => {
      const nextTick = prev.length > 0 ? prev[prev.length - 1].t + 1 : 1;
      return [
        ...prev.slice(1),
        {
          t: nextTick,
          read: parseFloat(metrics.disk_read_speed.toFixed(2)),
          write: parseFloat(metrics.disk_write_speed.toFixed(2)),
        },
      ];
    });

    setNetworkHistory((prev) => {
      const nextTick = prev.length > 0 ? prev[prev.length - 1].t + 1 : 1;
      return [
        ...prev.slice(1),
        {
          t: nextTick,
          up: parseFloat(metrics.network_up.toFixed(2)),
          down: parseFloat(metrics.network_down.toFixed(2)),
        },
      ];
    });
  }, [metrics]);

  const handleGenerateReport = async () => {
    setGeneratingReport(true);
    setReportResult(null);
    setReportError(null);
    const startTime = Date.now();
    try {
      const result = await invoke<string>("generate_diagnostics_report");
      setReportResult(result);
      const duration = ((Date.now() - startTime) / 1000).toFixed(1) + "s";
      addHistoryLog({
        type: "Diagnostics",
        freed: "N/A",
        fixed: 0,
        duration,
        details: t("Generated diagnostic report"),
      });
    } catch (err: any) {
      console.error(err);
      setReportError(err?.toString() || "Failed to generate report");
    } finally {
      setGeneratingReport(false);
    }
  };

  const formatUptime = (totalSeconds: number) => {
    if (!totalSeconds) return "0s";
    const d = Math.floor(totalSeconds / (3600 * 24));
    const h = Math.floor((totalSeconds % (3600 * 24)) / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;

    const parts = [];
    if (d > 0) parts.push(`${d}d`);
    if (h > 0 || d > 0) parts.push(`${h}h`);
    if (m > 0 || h > 0 || d > 0) parts.push(`${m}m`);
    parts.push(`${s}s`);

    return parts.join(" ");
  };

  // Fallback state if metrics is null (e.g. initial load or typeperf missing)
  const isTypeperfActive =
    metrics &&
    (metrics.disk_read_speed > 0 || metrics.disk_write_speed > 0 || metrics.cpu_usage > 0);

  return (
    <div className="space-y-6 animate-fade-in p-6 bg-background min-h-full rounded-3xl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <Activity className="text-indigo-650 dark:text-indigo-400 animate-pulse" size={24} />
            System Diagnostics & Telemetry
          </h2>
          <p className="text-slate-505 dark:text-slate-400 text-sm mt-1">
            Real-time logical core loads, disk throughput speeds, and automated health reports.
          </p>
        </div>
        <div>
          <button
            onClick={handleGenerateReport}
            disabled={generatingReport}
            className={cn(
              "px-5 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all shadow-sm",
              generatingReport
                ? "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 cursor-not-allowed"
                : "bg-indigo-600 dark:bg-indigo-500 hover:bg-indigo-700 dark:hover:bg-indigo-600 text-white hover:shadow-indigo-950/20 hover:scale-[1.02] cursor-pointer"
            )}
          >
            {generatingReport ? (
              <RefreshCw className="animate-spin" size={16} />
            ) : (
              <FileText size={16} />
            )}
            {generatingReport ? "Generating Report..." : "Generate Diagnostic Report"}
          </button>
        </div>
      </div>

      {/* Report Alerts */}
      {reportResult && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 text-emerald-800 dark:text-emerald-300 rounded-2xl flex items-start gap-3 animate-fade-in text-sm">
          <ShieldAlert
            className="text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5"
            size={18}
          />
          <div>
            <span className="font-semibold">Success:</span> {reportResult}
          </div>
        </div>
      )}
      {reportError && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 text-rose-800 dark:text-rose-300 rounded-2xl flex items-start gap-3 animate-fade-in text-sm">
          <ServerCrash
            className="text-rose-600 dark:text-rose-455 flex-shrink-0 mt-0.5"
            size={18}
          />
          <div>
            <span className="font-semibold">Error:</span> {reportError}
          </div>
        </div>
      )}

      {/* Main Status Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* System Uptime */}
        <div className="bg-card p-5 rounded-2xl border border-slate-200/60 dark:border-slate-800/40 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-xl text-amber-600 dark:text-amber-400">
            <Clock size={20} />
          </div>
          <div>
            <div className="text-slate-400 dark:text-slate-500 text-xs font-semibold uppercase tracking-wider">
              System Uptime
            </div>
            <div className="text-lg font-bold text-slate-800 dark:text-slate-100 mt-0.5">
              {metrics ? formatUptime(metrics.uptime) : "Fetching..."}
            </div>
          </div>
        </div>

        {/* Process Count */}
        <div className="bg-card p-5 rounded-2xl border border-slate-200/60 dark:border-slate-800/40 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-indigo-50 dark:bg-indigo-950/30 rounded-xl text-indigo-600 dark:text-indigo-400">
            <Activity size={20} />
          </div>
          <div>
            <div className="text-slate-400 dark:text-slate-500 text-xs font-semibold uppercase tracking-wider">
              Active Processes
            </div>
            <div className="text-lg font-bold text-slate-800 dark:text-slate-100 mt-0.5">
              {metrics ? `${metrics.process_count} tasks` : "Fetching..."}
            </div>
          </div>
        </div>

        {/* Disk Read Speed */}
        <div className="bg-card p-5 rounded-2xl border border-slate-200/60 dark:border-slate-800/40 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl text-emerald-600 dark:text-emerald-400">
            <ArrowDown size={20} />
          </div>
          <div>
            <div className="text-slate-400 dark:text-slate-500 text-xs font-semibold uppercase tracking-wider">
              Disk Read Speed
            </div>
            <div className="text-lg font-bold text-slate-800 dark:text-slate-100 mt-0.5">
              {metrics ? `${metrics.disk_read_speed.toFixed(2)} MB/s` : "0.00 MB/s"}
            </div>
          </div>
        </div>

        {/* Disk Write Speed */}
        <div className="bg-card p-5 rounded-2xl border border-slate-200/60 dark:border-slate-800/40 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-rose-50 dark:bg-rose-950/30 rounded-xl text-rose-600 dark:text-rose-455">
            <ArrowUp size={20} />
          </div>
          <div>
            <div className="text-slate-400 dark:text-slate-500 text-xs font-semibold uppercase tracking-wider">
              Disk Write Speed
            </div>
            <div className="text-lg font-bold text-slate-800 dark:text-slate-100 mt-0.5">
              {metrics ? `${metrics.disk_write_speed.toFixed(2)} MB/s` : "0.00 MB/s"}
            </div>
          </div>
        </div>
      </div>

      {/* Logical Cores Load Grid */}
      <div className="bg-card p-6 rounded-2xl border border-slate-200/60 dark:border-slate-800/40 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-2 mb-4">
          <Cpu size={16} className="text-slate-500" />
          Logical CPU Cores Grid ({metrics ? metrics.cpu_cores.length : 0} Cores)
        </h3>
        {metrics && metrics.cpu_cores.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-3">
            {metrics.cpu_cores.map((usage, idx) => {
              const hue = Math.max(0, 160 - usage * 1.5); // 160 (cyan/teal) down to 10 (orange/red)
              const displayVal = Math.round(usage);
              return (
                <div
                  key={idx}
                  className="p-3 border border-slate-200 dark:border-slate-800 rounded-xl flex flex-col justify-between h-20 transition-all hover:border-slate-350 dark:hover:border-slate-700 hover:shadow-xs relative overflow-hidden"
                  style={{
                    background: `linear-gradient(180deg, var(--card) 60%, hsla(${hue}, 85%, 40%, 0.08) 100%)`,
                  }}
                >
                  <div className="text-slate-400 dark:text-slate-550 text-xs font-semibold">
                    Core {idx + 1}
                  </div>
                  <div className="flex items-baseline justify-between mt-auto">
                    <span className="text-md font-bold text-slate-700 dark:text-slate-200">
                      {displayVal}%
                    </span>
                  </div>
                  {/* Subtle load indicator strip at the bottom */}
                  <div
                    className="absolute bottom-0 left-0 right-0 h-1 transition-all"
                    style={{
                      backgroundColor: `hsl(${hue}, 85%, 45%)`,
                      width: `${displayVal}%`,
                    }}
                  />
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-slate-400 dark:text-slate-500 text-sm py-4 text-center">
            Loading logical cores mapping...
          </div>
        )}
      </div>

      {/* Telemetry Visualizations Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Disk Throughput Chart */}
        <div className="bg-card p-5 rounded-2xl border border-slate-200/60 dark:border-slate-800/40 shadow-sm flex flex-col h-[320px]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-2">
              <HardDrive size={16} className="text-indigo-600 dark:text-indigo-400" />
              Disk I/O Throughput (MB/s)
            </h3>
            {!isTypeperfActive && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-505 dark:text-slate-400">
                Fallback: 0.00 MB/s
              </span>
            )}
          </div>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={diskHistory} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="readGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={C.emerald} stopOpacity={0.2} />
                    <stop offset="95%" stopColor={C.emerald} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="writeGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={C.rose} stopOpacity={0.2} />
                    <stop offset="95%" stopColor={C.rose} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="t" hide />
                <YAxis />
                <Tooltip
                  contentStyle={{
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    color: "var(--card-foreground)",
                    borderRadius: "12px",
                    boxShadow: "0 10px 15px -3px rgba(0,0,0,0.05)",
                  }}
                />
                <Legend iconType="circle" />
                <Area
                  type="monotone"
                  dataKey="read"
                  name="Read Speed"
                  stroke={C.emerald}
                  fillOpacity={1}
                  fill="url(#readGrad)"
                  isAnimationActive={false}
                />
                <Area
                  type="monotone"
                  dataKey="write"
                  name="Write Speed"
                  stroke={C.rose}
                  fillOpacity={1}
                  fill="url(#writeGrad)"
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Network Throughput Chart */}
        <div className="bg-card p-5 rounded-2xl border border-slate-200/60 dark:border-slate-800/40 shadow-sm flex flex-col h-[320px]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-2">
              <Activity size={16} className="text-cyan-500 rate" />
              Network Traffic Rate (MB/s)
            </h3>
          </div>
          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={networkHistory}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="upGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={C.cyan} stopOpacity={0.2} />
                    <stop offset="95%" stopColor={C.cyan} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="downGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={C.indigo} stopOpacity={0.2} />
                    <stop offset="95%" stopColor={C.indigo} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="t" hide />
                <YAxis />
                <Tooltip
                  contentStyle={{
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    color: "var(--card-foreground)",
                    borderRadius: "12px",
                    boxShadow: "0 10px 15px -3px rgba(0,0,0,0.05)",
                  }}
                />
                <Legend iconType="circle" />
                <Area
                  type="monotone"
                  dataKey="up"
                  name="Upload Speed"
                  stroke={C.cyan}
                  fillOpacity={1}
                  fill="url(#upGrad)"
                  isAnimationActive={false}
                />
                <Area
                  type="monotone"
                  dataKey="down"
                  name="Download Speed"
                  stroke={C.indigo}
                  fillOpacity={1}
                  fill="url(#downGrad)"
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

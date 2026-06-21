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
  Monitor,
  MemoryStick,
  Wifi,
  WifiOff,
  AlertTriangle,
  CheckCircle2,
  Server,
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

// Interfaces for system info fetched from backend
interface SystemInfo {
  os_name: string;
  os_version: string;
  kernel: string;
  host_name: string;
}

// Premium glassmorphism tooltip — replaces generic Recharts tooltip
const ChartTooltip = ({ active, payload, label, unit }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        background: "var(--card)",
        backdropFilter: "blur(12px)",
        border: "1px solid var(--border)",
        borderRadius: "14px",
        padding: "10px 14px",
        boxShadow: "0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)",
        fontVariantNumeric: "tabular-nums",
      }}
    >
      {payload.map((entry: any, idx: number) => (
        <div key={idx} className="flex items-center gap-2 text-xs" style={{ color: "var(--card-foreground)" }}>
          <span
            className="w-2 h-2 rounded-full inline-block"
            style={{ backgroundColor: entry.stroke }}
          />
          <span className="text-slate-500 dark:text-slate-400">{entry.name}:</span>
          <span className="font-bold" style={{ color: entry.stroke }}>
            {entry.value?.toFixed(2)} {unit || "MB/s"}
          </span>
        </div>
      ))}
    </div>
  );
};

// Live pulsing dot at the latest data point — signals "this is real-time"
const PulsingDot = ({ cx, cy, stroke }: any) => (
  <g>
    <circle cx={cx} cy={cy} r={6} fill={stroke} opacity={0.15}>
      <animate attributeName="r" values="6;10;6" dur="2s" repeatCount="indefinite" />
      <animate attributeName="opacity" values="0.15;0.05;0.15" dur="2s" repeatCount="indefinite" />
    </circle>
    <circle cx={cx} cy={cy} r={3} fill={stroke} stroke="var(--card)" strokeWidth={1.5} />
  </g>
);

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

  // System info from backend (OS, kernel, hostname)
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);

  // Fetch system info once on mount
  useEffect(() => {
    invoke<SystemInfo>("get_system_info")
      .then(setSystemInfo)
      .catch((err) => console.error("Failed to fetch system info:", err));
  }, []);

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

  // Health status calculation — interprets raw metrics into a meaningful indicator
  const getHealthStatus = () => {
    if (!metrics) return { label: t("Fetching..."), color: "slate", severity: 0 };
    const issues: string[] = [];
    if (metrics.ram_usage > 90) issues.push("RAM > 90%");
    if (metrics.cpu_usage > 90) issues.push("CPU > 90%");
    if (metrics.cpu_temp > 85) issues.push("Temp > 85°C");

    const critDisk = metrics.disks.some(
      (d: any) => d.total > 0 && (d.total - d.used) / d.total < 0.1
    );
    if (critDisk) issues.push("Disk < 10% free");

    if (issues.length === 0) return { label: t("Healthy"), color: "emerald", severity: 0 };
    if (issues.length <= 1) return { label: t("Warning"), color: "amber", severity: 1 };
    return { label: t("Critical"), color: "rose", severity: 2 };
  };

  // Smart alert generation — contextual warnings based on current metrics
  const getAlerts = () => {
    if (!metrics) return [];
    const alerts: { icon: React.ReactNode; message: string; severity: "warning" | "critical" }[] =
      [];

    if (metrics.ram_usage > 90) {
      alerts.push({
        icon: <AlertTriangle size={16} />,
        message: t("RAM usage is critically high ({{pct}}%)", {
          pct: Math.round(metrics.ram_usage),
        }),
        severity: "critical",
      });
    }

    if (metrics.cpu_usage > 90) {
      alerts.push({
        icon: <Cpu size={16} />,
        message: t("CPU usage is critically high ({{pct}}%)", {
          pct: Math.round(metrics.cpu_usage),
        }),
        severity: "critical",
      });
    }

    if (metrics.cpu_temp > 85) {
      alerts.push({
        icon: <AlertTriangle size={16} />,
        message: t("CPU temperature is high ({{temp}}°C)", {
          temp: Math.round(metrics.cpu_temp),
        }),
        severity: "warning",
      });
    }

    for (const d of metrics.disks) {
      if (d.total > 0) {
        const usedPct = Math.round((d.used / d.total) * 100);
        if (usedPct > 90) {
          alerts.push({
            icon: <HardDrive size={16} />,
            message: t("Disk space on {{drive}} is critically low ({{pct}}% used)", {
              drive: d.name,
              pct: usedPct,
            }),
            severity: "critical",
          });
        }
      }
    }

    return alerts;
  };

  const healthStatus = getHealthStatus();
  const alerts = getAlerts();

  // Color mappings for health badge — maps severity string to CSS-friendly theme tokens
  const healthColors: Record<string, { bg: string; text: string; pulse: boolean }> = {
    emerald: {
      bg: "bg-emerald-50 dark:bg-emerald-950/30",
      text: "text-emerald-600 dark:text-emerald-400",
      pulse: true,
    },
    amber: {
      bg: "bg-amber-50 dark:bg-amber-950/30",
      text: "text-amber-600 dark:text-amber-400",
      pulse: false,
    },
    rose: {
      bg: "bg-rose-50 dark:bg-rose-950/30",
      text: "text-rose-600 dark:text-rose-400",
      pulse: false,
    },
    slate: {
      bg: "bg-slate-50 dark:bg-slate-800",
      text: "text-slate-500 dark:text-slate-400",
      pulse: false,
    },
  };
  const hc = healthColors[healthStatus.color] || healthColors.slate;

  // Average CPU load for the cores grid header
  const avgCpuLoad =
    metrics && metrics.cpu_cores.length > 0
      ? Math.round(metrics.cpu_cores.reduce((a: number, b: number) => a + b, 0) / metrics.cpu_cores.length)
      : 0;

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
            {t("System Diagnostics & Telemetry")}
          </h2>
          <p className="text-slate-505 dark:text-slate-400 text-sm mt-1">
            {t(
              "Real-time logical core loads, disk throughput speeds, and automated health reports."
            )}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Health Status Badge */}
          <div
            className={cn(
              "px-3.5 py-2 rounded-xl flex items-center gap-2 text-sm font-semibold border transition-all",
              hc.bg,
              hc.text,
              healthStatus.color === "emerald"
                ? "border-emerald-200 dark:border-emerald-900/40"
                : healthStatus.color === "amber"
                  ? "border-amber-200 dark:border-amber-900/40"
                  : healthStatus.color === "rose"
                    ? "border-rose-200 dark:border-rose-900/40"
                    : "border-slate-200 dark:border-slate-800"
            )}
          >
            {healthStatus.severity === 0 ? (
              <CheckCircle2 size={16} className={hc.pulse ? "animate-pulse" : ""} />
            ) : (
              <AlertTriangle size={16} />
            )}
            {healthStatus.label}
          </div>

          {/* Generate Report Button */}
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
            {generatingReport ? t("Generating Report...") : t("Generate Diagnostic Report")}
          </button>
        </div>
      </div>

      {/* Smart Health Alerts — contextual warning banners */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          {alerts.map((alert, idx) => (
            <div
              key={idx}
              className={cn(
                "p-3.5 rounded-2xl flex items-center gap-3 animate-fade-in text-sm border",
                alert.severity === "critical"
                  ? "bg-rose-50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/40 text-rose-800 dark:text-rose-300"
                  : "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/40 text-amber-800 dark:text-amber-300"
              )}
            >
              <span
                className={cn(
                  "flex-shrink-0",
                  alert.severity === "critical"
                    ? "text-rose-600 dark:text-rose-400"
                    : "text-amber-600 dark:text-amber-400"
                )}
              >
                {alert.icon}
              </span>
              <span>{alert.message}</span>
            </div>
          ))}
        </div>
      )}

      {/* Report Generation Alerts */}
      {reportResult && (
        <div className="p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/40 text-emerald-800 dark:text-emerald-300 rounded-2xl flex items-start gap-3 animate-fade-in text-sm">
          <ShieldAlert
            className="text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5"
            size={18}
          />
          <div>
            <span className="font-semibold">{t("Success")}:</span> {reportResult}
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
            <span className="font-semibold">{t("Error")}:</span> {reportError}
          </div>
        </div>
      )}

      {/* System Information Card — at-a-glance hardware/OS details */}
      <div className="bg-card p-5 rounded-2xl border border-slate-200/60 dark:border-slate-800/40 shadow-sm">
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-2 mb-4">
          <Server size={16} className="text-indigo-600 dark:text-indigo-400" />
          {t("System Information")}
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {/* OS */}
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-violet-50 dark:bg-violet-950/30 rounded-xl text-violet-600 dark:text-violet-400">
              <Monitor size={18} />
            </div>
            <div>
              <div className="text-slate-400 dark:text-slate-500 text-xs font-semibold uppercase tracking-wider">
                {t("Operating System")}
              </div>
              <div className="text-sm font-bold text-slate-800 dark:text-slate-100 mt-0.5">
                {systemInfo
                  ? `${systemInfo.os_name} ${systemInfo.os_version}`
                  : t("Fetching...")}
              </div>
            </div>
          </div>

          {/* CPU */}
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-cyan-50 dark:bg-cyan-950/30 rounded-xl text-cyan-600 dark:text-cyan-400">
              <Cpu size={18} />
            </div>
            <div>
              <div className="text-slate-400 dark:text-slate-500 text-xs font-semibold uppercase tracking-wider">
                {t("CPU Model")}
              </div>
              <div className="text-sm font-bold text-slate-800 dark:text-slate-100 mt-0.5 truncate max-w-[180px]">
                {metrics ? metrics.cpu_name : t("Fetching...")}
              </div>
            </div>
          </div>

          {/* RAM */}
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-pink-50 dark:bg-pink-950/30 rounded-xl text-pink-600 dark:text-pink-400">
              <MemoryStick size={18} />
            </div>
            <div>
              <div className="text-slate-400 dark:text-slate-500 text-xs font-semibold uppercase tracking-wider">
                {t("Total Memory")}
              </div>
              <div className="text-sm font-bold text-slate-800 dark:text-slate-100 mt-0.5">
                {metrics
                  ? `${metrics.used_ram.toFixed(1)} / ${metrics.total_ram.toFixed(1)} GB`
                  : t("Fetching...")}
              </div>
            </div>
          </div>

          {/* Hostname */}
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl text-emerald-600 dark:text-emerald-400">
              <Server size={18} />
            </div>
            <div>
              <div className="text-slate-400 dark:text-slate-500 text-xs font-semibold uppercase tracking-wider">
                {t("Host Name")}
              </div>
              <div className="text-sm font-bold text-slate-800 dark:text-slate-100 mt-0.5">
                {systemInfo ? systemInfo.host_name : t("Fetching...")}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Status Grid — 6 metric cards in 2 rows of 3 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* System Uptime */}
        <div className="bg-card p-5 rounded-2xl border border-slate-200/60 dark:border-slate-800/40 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-amber-50 dark:bg-amber-950/30 rounded-xl text-amber-600 dark:text-amber-400">
            <Clock size={20} />
          </div>
          <div>
            <div className="text-slate-400 dark:text-slate-500 text-xs font-semibold uppercase tracking-wider">
              {t("System Uptime")}
            </div>
            <div className="text-lg font-bold text-slate-800 dark:text-slate-100 mt-0.5">
              {metrics ? formatUptime(metrics.uptime) : t("Fetching...")}
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
              {t("Active Processes")}
            </div>
            <div className="text-lg font-bold text-slate-800 dark:text-slate-100 mt-0.5">
              {metrics ? `${metrics.process_count} ${t("tasks")}` : t("Fetching...")}
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
              {t("Disk Read Speed")}
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
              {t("Disk Write Speed")}
            </div>
            <div className="text-lg font-bold text-slate-800 dark:text-slate-100 mt-0.5">
              {metrics ? `${metrics.disk_write_speed.toFixed(2)} MB/s` : "0.00 MB/s"}
            </div>
          </div>
        </div>

        {/* Network Upload Speed */}
        <div className="bg-card p-5 rounded-2xl border border-slate-200/60 dark:border-slate-800/40 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-cyan-50 dark:bg-cyan-950/30 rounded-xl text-cyan-600 dark:text-cyan-400">
            <Wifi size={20} />
          </div>
          <div>
            <div className="text-slate-400 dark:text-slate-500 text-xs font-semibold uppercase tracking-wider">
              {t("Network Upload")}
            </div>
            <div className="text-lg font-bold text-slate-800 dark:text-slate-100 mt-0.5">
              {metrics ? `${metrics.network_up.toFixed(2)} MB/s` : "0.00 MB/s"}
            </div>
          </div>
        </div>

        {/* Network Download Speed */}
        <div className="bg-card p-5 rounded-2xl border border-slate-200/60 dark:border-slate-800/40 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-violet-50 dark:bg-violet-950/30 rounded-xl text-violet-600 dark:text-violet-400">
            <ArrowDown size={20} />
          </div>
          <div>
            <div className="text-slate-400 dark:text-slate-500 text-xs font-semibold uppercase tracking-wider">
              {t("Network Download")}
            </div>
            <div className="text-lg font-bold text-slate-800 dark:text-slate-100 mt-0.5">
              {metrics ? `${metrics.network_down.toFixed(2)} MB/s` : "0.00 MB/s"}
            </div>
          </div>
        </div>
      </div>

      {/* Logical Cores Load Grid */}
      <div className="bg-card p-6 rounded-2xl border border-slate-200/60 dark:border-slate-800/40 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-2">
            <Cpu size={16} className="text-slate-500" />
            {t("Logical CPU Cores Grid")} ({metrics ? metrics.cpu_cores.length : 0} {t("Cores")})
          </h3>
          {metrics && metrics.cpu_cores.length > 0 && (
            <span className="text-xs px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-semibold">
              {t("Average Load")}: {avgCpuLoad}%
            </span>
          )}
        </div>
        {metrics && metrics.cpu_cores.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-3">
            {metrics.cpu_cores.map((usage: number, idx: number) => {
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
                  {/* Subtle load indicator strip — smooth transition for visual polish */}
                  <div
                    className="absolute bottom-0 left-0 right-0 h-1"
                    style={{
                      backgroundColor: `hsl(${hue}, 85%, 45%)`,
                      width: `${displayVal}%`,
                      transition: "width 0.5s ease, background-color 0.5s ease",
                    }}
                  />
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-slate-400 dark:text-slate-500 text-sm py-4 text-center">
            {t("Loading logical cores mapping...")}
          </div>
        )}
      </div>

      {/* Telemetry Visualizations Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Disk Throughput Chart */}
        <div
          className="relative p-5 rounded-2xl border border-slate-200/60 dark:border-slate-800/40 shadow-sm flex flex-col h-[320px] overflow-hidden"
          style={{
            background: `linear-gradient(135deg, var(--card) 0%, var(--card) 85%, ${C.emerald}06 100%)`,
          }}
        >
          {/* Big ghost current value */}
          <div className="absolute top-3 right-4 pointer-events-none select-none">
            <span
              className="font-black leading-none"
              style={{
                fontSize: "3.5rem",
                fontVariantNumeric: "tabular-nums",
                background: `linear-gradient(180deg, ${C.emerald}15 0%, ${C.emerald}03 100%)`,
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
                letterSpacing: "-0.04em",
              }}
            >
              {metrics ? metrics.disk_read_speed.toFixed(1) : "0.0"}
            </span>
          </div>

          <div className="flex items-center justify-between mb-3 relative z-10">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-2">
              <div className="p-1.5 bg-emerald-50 dark:bg-emerald-950/30 rounded-lg">
                <HardDrive size={14} className="text-emerald-600 dark:text-emerald-400" />
              </div>
              {t("Disk I/O Throughput (MB/s)")}
            </h3>
            {/* Live indicator dot */}
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              {t("Live")}
            </div>
          </div>

          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={diskHistory} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="readGradPremium" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={C.emerald} stopOpacity={0.35} />
                    <stop offset="50%" stopColor={C.emerald} stopOpacity={0.08} />
                    <stop offset="100%" stopColor={C.emerald} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="writeGradPremium" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={C.rose} stopOpacity={0.3} />
                    <stop offset="50%" stopColor={C.rose} stopOpacity={0.06} />
                    <stop offset="100%" stopColor={C.rose} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="t" hide />
                <YAxis hide />
                <Tooltip content={<ChartTooltip unit="MB/s" />} />
                <Area
                  type="monotone"
                  dataKey="read"
                  name={t("Read Speed")}
                  stroke={C.emerald}
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#readGradPremium)"
                  activeDot={<PulsingDot />}
                  isAnimationActive={false}
                />
                <Area
                  type="monotone"
                  dataKey="write"
                  name={t("Write Speed")}
                  stroke={C.rose}
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#writeGradPremium)"
                  activeDot={<PulsingDot />}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Bottom legend bar */}
          <div className="flex items-center gap-4 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/60">
            <div className="flex items-center gap-1.5 text-xs">
              <span className="w-2.5 h-[3px] rounded-full" style={{ backgroundColor: C.emerald }} />
              <span className="text-slate-500 dark:text-slate-400">{t("Read Speed")}</span>
              <span className="font-bold text-slate-700 dark:text-slate-200" style={{ fontVariantNumeric: "tabular-nums" }}>
                {metrics ? `${metrics.disk_read_speed.toFixed(2)}` : "0.00"}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-xs">
              <span className="w-2.5 h-[3px] rounded-full" style={{ backgroundColor: C.rose }} />
              <span className="text-slate-500 dark:text-slate-400">{t("Write Speed")}</span>
              <span className="font-bold text-slate-700 dark:text-slate-200" style={{ fontVariantNumeric: "tabular-nums" }}>
                {metrics ? `${metrics.disk_write_speed.toFixed(2)}` : "0.00"}
              </span>
            </div>
          </div>
        </div>

        {/* Network Throughput Chart */}
        <div
          className="relative p-5 rounded-2xl border border-slate-200/60 dark:border-slate-800/40 shadow-sm flex flex-col h-[320px] overflow-hidden"
          style={{
            background: `linear-gradient(135deg, var(--card) 0%, var(--card) 85%, ${C.cyan}06 100%)`,
          }}
        >
          {/* Big ghost current value */}
          <div className="absolute top-3 right-4 pointer-events-none select-none">
            <span
              className="font-black leading-none"
              style={{
                fontSize: "3.5rem",
                fontVariantNumeric: "tabular-nums",
                background: `linear-gradient(180deg, ${C.cyan}15 0%, ${C.cyan}03 100%)`,
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
                letterSpacing: "-0.04em",
              }}
            >
              {metrics ? metrics.network_down.toFixed(1) : "0.0"}
            </span>
          </div>

          <div className="flex items-center justify-between mb-3 relative z-10">
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 flex items-center gap-2">
              <div className="p-1.5 bg-cyan-50 dark:bg-cyan-950/30 rounded-lg">
                <Activity size={14} className="text-cyan-600 dark:text-cyan-400" />
              </div>
              {t("Network Traffic Rate (MB/s)")}
            </h3>
            {/* Live indicator dot */}
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse" />
              {t("Live")}
            </div>
          </div>

          <div className="flex-1 min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={networkHistory} margin={{ top: 5, right: 5, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="upGradPremium" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={C.cyan} stopOpacity={0.35} />
                    <stop offset="50%" stopColor={C.cyan} stopOpacity={0.08} />
                    <stop offset="100%" stopColor={C.cyan} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="downGradPremium" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={C.indigo} stopOpacity={0.3} />
                    <stop offset="50%" stopColor={C.indigo} stopOpacity={0.06} />
                    <stop offset="100%" stopColor={C.indigo} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="t" hide />
                <YAxis hide />
                <Tooltip content={<ChartTooltip unit="MB/s" />} />
                <Area
                  type="monotone"
                  dataKey="up"
                  name={t("Upload Speed")}
                  stroke={C.cyan}
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#upGradPremium)"
                  activeDot={<PulsingDot />}
                  isAnimationActive={false}
                />
                <Area
                  type="monotone"
                  dataKey="down"
                  name={t("Download Speed")}
                  stroke={C.indigo}
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#downGradPremium)"
                  activeDot={<PulsingDot />}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Bottom legend bar */}
          <div className="flex items-center gap-4 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/60">
            <div className="flex items-center gap-1.5 text-xs">
              <span className="w-2.5 h-[3px] rounded-full" style={{ backgroundColor: C.cyan }} />
              <span className="text-slate-500 dark:text-slate-400">{t("Upload Speed")}</span>
              <span className="font-bold text-slate-700 dark:text-slate-200" style={{ fontVariantNumeric: "tabular-nums" }}>
                {metrics ? `${metrics.network_up.toFixed(2)}` : "0.00"}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-xs">
              <span className="w-2.5 h-[3px] rounded-full" style={{ backgroundColor: C.indigo }} />
              <span className="text-slate-500 dark:text-slate-400">{t("Download Speed")}</span>
              <span className="font-bold text-slate-700 dark:text-slate-200" style={{ fontVariantNumeric: "tabular-nums" }}>
                {metrics ? `${metrics.network_down.toFixed(2)}` : "0.00"}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

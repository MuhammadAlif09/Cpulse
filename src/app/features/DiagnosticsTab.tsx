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
  Download,
  Cpu,
  RefreshCw,
  ServerCrash,
  Monitor,
  MemoryStick,
  Wifi,
  AlertTriangle,
  Check,
  Server,
  Layers,
  History,
  Eye,
} from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { useTranslation } from "react-i18next";
import { useSystemMetrics } from "../hooks/useSystemMetrics";
import { addHistoryLog } from "../utils/history";
import { StatCard } from "../components/ui/StatCard";
import { toast } from "sonner";

// Teal-based palette
const P = {
  teal: "#0d9488",
  amber: "#f59e0b",
  rose: "#f43f5e",
  sky: "#0ea5e9",
  violet: "#8b5cf6",
  slate: "#64748b",
  good: "#10b981",
};

function cn(...classes: (string | undefined | false)[]) {
  return classes.filter(Boolean).join(" ");
}

function Card({
  children,
  className = "",
  style = {},
}: {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl p-5 bg-card/80 backdrop-blur-md border border-border/40 shadow-sm transition-all duration-200",
        className
      )}
      style={style}
    >
      {children}
    </div>
  );
}

interface SystemInfo {
  os_name: string;
  os_version: string;
  kernel: string;
  host_name: string;
}

const ChartTooltip = ({ active, payload, unit }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card/95 backdrop-blur-md border border-border rounded-xl p-3 shadow-lg font-sans tabular-nums text-xs">
      {payload.map((entry: any, idx: number) => (
        <div key={idx} className="flex items-center gap-2 mb-1 last:mb-0">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.stroke }} />
          <span className="text-muted-foreground">{entry.name}:</span>
          <span className="font-bold text-foreground">
            {entry.value?.toFixed(2)} {unit || "MB/s"}
          </span>
        </div>
      ))}
    </div>
  );
};

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

  const [diskHistory, setDiskHistory] = useState<{ t: number; read: number; write: number }[]>(
    Array.from({ length: 20 }, (_, i) => ({ t: i, read: 0, write: 0 }))
  );
  const [networkHistory, setNetworkHistory] = useState<{ t: number; up: number; down: number }[]>(
    Array.from({ length: 20 }, (_, i) => ({ t: i, up: 0, down: 0 }))
  );

  const [generatingReport, setGeneratingReport] = useState(false);
  const [reportResult, setReportResult] = useState<string | null>(null);
  const [reportError, setReportError] = useState<string | null>(null);
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [reports, setReports] = useState<string[]>([]);
  const [selectedReport, setSelectedReport] = useState<string | null>(null);
  const [selectedReportContent, setSelectedReportContent] = useState<string | null>(null);

  useEffect(() => {
    invoke<SystemInfo>("get_system_info")
      .then(setSystemInfo)
      .catch((err) => console.error(err));
    loadReports();
  }, []);

  useEffect(() => {
    if (!metrics) return;
    setDiskHistory((prev) => {
      const nextTick = prev.length > 0 ? prev[prev.length - 1].t + 1 : 1;
      return [
        ...prev.slice(1),
        { t: nextTick, read: parseFloat(metrics.disk_read_speed.toFixed(2)), write: parseFloat(metrics.disk_write_speed.toFixed(2)) },
      ];
    });
    setNetworkHistory((prev) => {
      const nextTick = prev.length > 0 ? prev[prev.length - 1].t + 1 : 1;
      return [
        ...prev.slice(1),
        { t: nextTick, up: parseFloat(metrics.network_up.toFixed(2)), down: parseFloat(metrics.network_down.toFixed(2)) },
      ];
    });
  }, [metrics]);

  const loadReports = async () => {
    try {
      const result = await invoke<string[]>("get_diagnostics_reports");
      setReports(result);
    } catch (err) {
      console.error("Failed to load diagnostics reports:", err);
    }
  };

  const handleGenerateReport = async () => {
    setGeneratingReport(true);
    setReportResult(null);
    setReportError(null);
    const t0 = Date.now();
    try {
      const result = await invoke<string>("generate_diagnostics_report");
      setReportResult(result);
      await loadReports();
      addHistoryLog({ type: "Diagnostics", freed: "N/A", fixed: 0, duration: ((Date.now() - t0) / 1000).toFixed(1) + "s", details: t("Generated diagnostic report") });
    } catch (err: any) {
      setReportError(err?.toString() || "Failed to generate report");
    } finally {
      setGeneratingReport(false);
    }
  };

  const handleReadReport = async (filename: string) => {
    try {
      const content = await invoke<string>("read_diagnostics_report", { filename });
      setSelectedReport(filename);
      setSelectedReportContent(content);
    } catch (err: any) {
      toast.error(t(err?.toString() || "Failed to read report"));
    }
  };

  const handleExportReport = async () => {
    if (!reportResult) return;
    try {
      const msg = await invoke<string>("export_diagnostics_report", { reportContent: reportResult });
      toast.success(t(msg));
    } catch (err: any) {
      if (err !== "Cancelled by user") toast.error(t(err?.toString() || "Failed to export report"));
    }
  };

  const formatUptime = (sec: number) => {
    if (!sec) return "0s";
    const d = Math.floor(sec / (3600 * 24));
    const h = Math.floor((sec % (3600 * 24)) / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    const parts = [];
    if (d > 0) parts.push(`${d}d`);
    if (h > 0 || d > 0) parts.push(`${h}h`);
    if (m > 0 || h > 0 || d > 0) parts.push(`${m}m`);
    parts.push(`${s}s`);
    return parts.join(" ");
  };

  const getHealthStatus = () => {
    if (!metrics) return { label: t("Fetching..."), color: "slate", sev: 0 };
    const issues = [];
    if (metrics.ram_usage > 90) issues.push("RAM > 90%");
    if (metrics.cpu_usage > 90) issues.push("CPU > 90%");
    if (metrics.cpu_temp > 85) issues.push("Temp > 85°C");
    if (metrics.disks.some((d: any) => d.total > 0 && (d.total - d.used) / d.total < 0.1)) issues.push("Disk < 10% free");

    if (issues.length === 0) return { label: t("Healthy"), color: P.good, sev: 0 };
    if (issues.length <= 1) return { label: t("Warning"), color: P.amber, sev: 1 };
    return { label: t("Critical"), color: P.rose, sev: 2 };
  };

  const hs = getHealthStatus();

  return (
    <div className="space-y-4">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-1">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Activity className="animate-pulse" size={20} style={{ color: P.teal }} />
            <h2 className="text-lg font-bold text-foreground">{t("System Diagnostics")}</h2>
          </div>
          <p className="text-xs text-muted-foreground">
            {t("Real-time logical core loads, disk throughput speeds, and health reports.")}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div
            className="px-3 py-1.5 rounded-lg flex items-center gap-1.5 text-xs font-semibold border"
            style={{
              borderColor: `color-mix(in srgb, ${hs.color} 30%, transparent)`,
              background: `color-mix(in srgb, ${hs.color} 10%, transparent)`,
              color: hs.color
            }}
          >
            {hs.sev === 0 ? <Check size={14} strokeWidth={3} className="animate-pulse" /> : <AlertTriangle size={14} />}
            {hs.label}
          </div>

          {reportResult && (
            <button
              onClick={handleExportReport}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm text-white hover:-translate-y-0.5 active:scale-95"
              style={{ background: P.good }}
            >
              <Download size={14} /> {t("Export")}
            </button>
          )}

          <button
            onClick={handleGenerateReport}
            disabled={generatingReport}
            className="px-4 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm text-white disabled:opacity-50 hover:-translate-y-0.5 active:scale-95"
            style={{ background: generatingReport ? "var(--border)" : P.teal }}
          >
            {generatingReport ? <RefreshCw className="animate-spin" size={14} /> : <FileText size={14} />}
            {generatingReport ? t("Generating...") : t("Generate Report")}
          </button>
        </div>
      </div>

      {/* ── Alerts ──────────────────────────────────────────────────────────── */}
      {reportResult && (
        <Card style={{ background: `color-mix(in srgb, ${P.good} 10%, var(--card))`, borderColor: `color-mix(in srgb, ${P.good} 30%, transparent)`, padding: "12px 16px" }}>
          <div className="flex items-start gap-2" style={{ color: P.good }}>
            <ShieldAlert size={16} className="mt-0.5 flex-shrink-0" />
            <div className="text-xs font-medium"><span className="font-bold">{t("Success")}:</span> {reportResult}</div>
          </div>
        </Card>
      )}
      {reportError && (
        <Card style={{ background: `color-mix(in srgb, ${P.rose} 10%, var(--card))`, borderColor: `color-mix(in srgb, ${P.rose} 30%, transparent)`, padding: "12px 16px" }}>
          <div className="flex items-start gap-2" style={{ color: P.rose }}>
            <ServerCrash size={16} className="mt-0.5 flex-shrink-0" />
            <div className="text-xs font-medium"><span className="font-bold">{t("Error")}:</span> {reportError}</div>
          </div>
        </Card>
      )}

      <Card className="p-0 overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-border p-4">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <History size={16} style={{ color: P.teal }} /> {t("Report History")}
          </h3>
          <button
            onClick={loadReports}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-all hover:-translate-y-0.5 hover:text-foreground active:scale-95"
          >
            <RefreshCw size={13} /> {t("Refresh")}
          </button>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(220px,0.8fr)_minmax(0,1.4fr)]">
          <div className="max-h-72 overflow-y-auto border-b border-border lg:border-b-0 lg:border-r">
            {reports.length > 0 ? (
              reports.map((report) => (
                <button
                  key={report}
                  onClick={() => handleReadReport(report)}
                  className={cn(
                    "flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-xs transition-colors hover:bg-secondary/50",
                    selectedReport === report && "bg-secondary/70 text-foreground"
                  )}
                >
                  <span className="min-w-0 truncate font-medium">{report}</span>
                  <Eye size={13} className="shrink-0 text-muted-foreground" />
                </button>
              ))
            ) : (
              <div className="px-4 py-8 text-center text-xs text-muted-foreground">{t("No saved reports yet")}</div>
            )}
          </div>
          <pre className="max-h-72 min-h-40 overflow-auto whitespace-pre-wrap bg-secondary/20 p-4 text-xs leading-relaxed text-muted-foreground">
            {selectedReportContent || t("Select a report to preview its details.")}
          </pre>
        </div>
      </Card>

      {/* ── Top Bento ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Processor Cores */}
        <Card className="lg:col-span-2 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Cpu size={16} style={{ color: P.sky }} /> {t("Processor & Cores Topology")}
              </h3>
              <div className="flex items-center gap-2">
                {metrics && metrics.cpu_temp !== undefined && metrics.cpu_temp > 0 && (
                  <span
                    className="text-[10px] px-2 py-0.5 rounded-full font-semibold flex items-center gap-1 border"
                    style={{
                      borderColor: `color-mix(in srgb, ${
                        metrics.cpu_temp > 75 ? P.rose : metrics.cpu_temp > 55 ? P.amber : P.sky
                      } 30%, transparent)`,
                      background: `color-mix(in srgb, ${
                        metrics.cpu_temp > 75 ? P.rose : metrics.cpu_temp > 55 ? P.amber : P.sky
                      } 10%, transparent)`,
                      color: metrics.cpu_temp > 75 ? P.rose : metrics.cpu_temp > 55 ? P.amber : P.sky,
                    }}
                  >
                    <Thermometer size={10} />
                    {Math.round(metrics.cpu_temp)}°C
                  </span>
                )}
                {metrics && metrics.cpu_cores.length > 0 && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary text-muted-foreground font-semibold">
                    {t("Avg Load")}: {Math.round(metrics.cpu_cores.reduce((a: number, b: number) => a + b, 0) / metrics.cpu_cores.length)}%
                  </span>
                )}
              </div>
            </div>

            <div className="mb-5 p-3 rounded-xl bg-secondary/50 border border-border flex items-center gap-3">
              <div className="p-2 rounded-lg bg-background text-foreground shadow-sm">
                <Cpu size={16} style={{ color: P.sky }} />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{t("CPU Model")}</div>
                <div className="text-sm font-bold text-foreground truncate">{metrics ? metrics.cpu_name : t("Fetching...")}</div>
              </div>
            </div>
          </div>

          {metrics && metrics.cpu_cores.length > 0 ? (
            <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
              {metrics.cpu_cores.map((usage: number, idx: number) => {
                const val = Math.round(usage);
                const color = val > 80 ? P.rose : val > 50 ? P.amber : P.sky;
                return (
                  <div
                    key={idx}
                    className="p-2 border border-border rounded-lg flex flex-col justify-between h-14 relative overflow-hidden bg-background"
                  >
                    <div className="text-[9px] text-muted-foreground font-semibold">C{idx + 1}</div>
                    <div className="text-xs font-bold tabular-nums text-foreground">{val}%</div>
                    <div
                      className="absolute bottom-0 left-0 right-0 h-0.5 transition-all duration-300"
                      style={{ width: `${val}%`, backgroundColor: color }}
                    />
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-muted-foreground text-xs py-6 text-center">{t("Loading logical cores mapping...")}</div>
          )}
        </Card>

        {/* System Info */}
        <Card className="flex flex-col justify-between">
          <h3 className="text-sm font-semibold flex items-center gap-2 mb-4">
            <Server size={16} style={{ color: P.violet }} /> {t("System Environment")}
          </h3>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <Monitor size={16} className="text-muted-foreground mt-0.5" />
              <div className="min-w-0">
                <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{t("OS")}</div>
                <div className="text-xs font-bold text-foreground truncate">
                  {systemInfo ? `${systemInfo.os_name} ${systemInfo.os_version}` : "—"}
                </div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Server size={16} className="text-muted-foreground mt-0.5" />
              <div className="min-w-0">
                <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{t("Host")}</div>
                <div className="text-xs font-bold text-foreground truncate">{systemInfo?.host_name || "—"}</div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Clock size={16} className="text-muted-foreground mt-0.5" />
              <div className="min-w-0">
                <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{t("Uptime")}</div>
                <div className="text-xs font-bold text-foreground">{metrics ? formatUptime(metrics.uptime) : "—"}</div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Layers size={16} className="text-muted-foreground mt-0.5" />
              <div className="min-w-0">
                <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{t("Active Processes")}</div>
                <div className="text-xs font-bold text-foreground">{metrics ? metrics.process_count : "—"}</div>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {/* ── Memory & Storage Bento ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Memory diagnostics */}
        <Card className="flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <MemoryStick size={16} style={{ color: P.violet }} /> {t("Memory Diagnostics")}
              </h3>
              {metrics && (
                <span
                  className="text-[10px] px-2 py-0.5 rounded-full font-semibold border"
                  style={{
                    borderColor: `color-mix(in srgb, ${
                      metrics.ram_usage > 85 ? P.rose : metrics.ram_usage > 60 ? P.amber : P.good
                    } 30%, transparent)`,
                    background: `color-mix(in srgb, ${
                      metrics.ram_usage > 85 ? P.rose : metrics.ram_usage > 60 ? P.amber : P.good
                    } 10%, transparent)`,
                    color: metrics.ram_usage > 85 ? P.rose : metrics.ram_usage > 60 ? P.amber : P.good,
                  }}
                >
                  {metrics.ram_usage > 85 ? t("Heavy Load") : metrics.ram_usage > 60 ? t("Normal") : t("Optimal")}
                </span>
              )}
            </div>

            <div className="space-y-4">
              {/* RAM circular/progress meter */}
              <div>
                <div className="flex justify-between text-xs mb-1.5 font-bold">
                  <span className="text-muted-foreground">{t("RAM Utilization")}</span>
                  <span className="text-foreground tabular-nums">{metrics ? Math.round(metrics.ram_usage) : 0}%</span>
                </div>
                <div className="h-2 w-full bg-secondary border border-border rounded-full overflow-hidden relative">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: metrics ? `${metrics.ram_usage}%` : "0%",
                      background: `linear-gradient(to right, ${P.sky}, ${
                        metrics && metrics.ram_usage > 85 ? P.rose : metrics && metrics.ram_usage > 60 ? P.amber : P.violet
                      })`,
                    }}
                  />
                </div>
              </div>

              {/* RAM breakdown */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className="p-3 bg-secondary/30 border border-border/40 rounded-xl">
                  <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{t("Used RAM")}</div>
                  <div className="text-sm font-extrabold text-foreground tabular-nums">
                    {metrics ? metrics.used_ram.toFixed(2) : "—"} GB
                  </div>
                </div>
                <div className="p-3 bg-secondary/30 border border-border/40 rounded-xl">
                  <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{t("Total RAM")}</div>
                  <div className="text-sm font-extrabold text-foreground tabular-nums">
                    {metrics ? metrics.total_ram.toFixed(1) : "—"} GB
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Storage Drives */}
        <Card className="lg:col-span-2 flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-semibold flex items-center gap-2 mb-4">
              <HardDrive size={16} style={{ color: P.teal }} /> {t("Storage Drives Topology")}
            </h3>

            {metrics && metrics.disks && metrics.disks.length > 0 ? (
              <div className="space-y-4 max-h-[170px] overflow-y-auto pr-1">
                {metrics.disks.map((disk: any, idx: number) => {
                  const free = disk.total - disk.used;
                  const ratio = disk.total > 0 ? disk.used / disk.total : 0;
                  const pct = Math.round(ratio * 100);
                  const isLowSpace = disk.total > 0 && free / disk.total < 0.1;
                  const barColor = isLowSpace ? P.rose : pct > 75 ? P.amber : P.teal;

                  const formatSize = (gb: number) => {
                    if (gb > 1024) return (gb / 1024).toFixed(1) + " TB";
                    return gb.toFixed(0) + " GB";
                  };

                  return (
                    <div key={idx} className="p-3 bg-secondary/30 border border-border/40 rounded-xl space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-bold text-foreground shrink-0">{disk.name}</span>
                          <span className="text-[10px] text-muted-foreground truncate">{disk.model || disk.disk_type}</span>
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-background border text-muted-foreground uppercase shrink-0 font-semibold">
                            {disk.disk_type}
                          </span>
                        </div>
                        <div className="text-muted-foreground font-medium tabular-nums shrink-0">
                          {formatSize(disk.used)} / {formatSize(disk.total)} ({pct}%)
                        </div>
                      </div>
                      <div className="h-1.5 w-full bg-secondary border border-border rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${pct}%`,
                            backgroundColor: barColor,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-muted-foreground text-xs py-6 text-center">{t("Loading storage topology...")}</div>
            )}
          </div>
        </Card>
      </div>

      {/* ── Stats Row ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={<ArrowDown size={15} />} label={t("Disk Read")} value={metrics ? `${metrics.disk_read_speed.toFixed(1)} MB/s` : "—"} color={P.teal} />
        <StatCard icon={<ArrowUp size={15} />} label={t("Disk Write")} value={metrics ? `${metrics.disk_write_speed.toFixed(1)} MB/s` : "—"} color={P.rose} />
        <StatCard icon={<Wifi size={15} />} label={t("Upload")} value={metrics ? `${metrics.network_up.toFixed(1)} MB/s` : "—"} color={P.sky} />
        <StatCard icon={<ArrowDown size={15} />} label={t("Download")} value={metrics ? `${metrics.network_down.toFixed(1)} MB/s` : "—"} color={P.violet} />
      </div>

      {/* ── Live Charts ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="h-[280px] flex flex-col p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <HardDrive size={14} style={{ color: P.teal }} /> {t("Disk I/O")}
            </h3>
            <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase text-muted-foreground">
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: P.teal }} /> Live
            </div>
          </div>
          <div className="flex-1 min-h-0 relative">
            {/* background huge text */}
            <div className="absolute top-2 right-2 pointer-events-none opacity-20">
              <span className="font-bold text-4xl tabular-nums" style={{ color: P.teal }}>
                {metrics ? metrics.disk_read_speed.toFixed(1) : "0.0"}
              </span>
            </div>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={diskHistory} margin={{ top: 10, right: 0, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="rGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={P.teal} stopOpacity={0.2} />
                    <stop offset="100%" stopColor={P.teal} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="wGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={P.rose} stopOpacity={0.2} />
                    <stop offset="100%" stopColor={P.rose} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="t" hide />
                <YAxis hide />
                <Tooltip content={<ChartTooltip unit="MB/s" />} />
                <Area type="monotone" dataKey="read" name={t("Read")} stroke={P.teal} strokeWidth={2} fillOpacity={1} fill="url(#rGrad)" activeDot={<PulsingDot />} isAnimationActive={false} />
                <Area type="monotone" dataKey="write" name={t("Write")} stroke={P.rose} strokeWidth={2} fillOpacity={1} fill="url(#wGrad)" activeDot={<PulsingDot />} isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="h-[280px] flex flex-col p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Activity size={14} style={{ color: P.sky }} /> {t("Network Traffic")}
            </h3>
            <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase text-muted-foreground">
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: P.sky }} /> Live
            </div>
          </div>
          <div className="flex-1 min-h-0 relative">
            <div className="absolute top-2 right-2 pointer-events-none opacity-20">
              <span className="font-bold text-4xl tabular-nums" style={{ color: P.sky }}>
                {metrics ? metrics.network_down.toFixed(1) : "0.0"}
              </span>
            </div>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={networkHistory} margin={{ top: 10, right: 0, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="upGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={P.sky} stopOpacity={0.2} />
                    <stop offset="100%" stopColor={P.sky} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="dnGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={P.violet} stopOpacity={0.2} />
                    <stop offset="100%" stopColor={P.violet} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="t" hide />
                <YAxis hide />
                <Tooltip content={<ChartTooltip unit="MB/s" />} />
                <Area type="monotone" dataKey="up" name={t("Upload")} stroke={P.sky} strokeWidth={2} fillOpacity={1} fill="url(#upGrad)" activeDot={<PulsingDot />} isAnimationActive={false} />
                <Area type="monotone" dataKey="down" name={t("Download")} stroke={P.violet} strokeWidth={2} fillOpacity={1} fill="url(#dnGrad)" activeDot={<PulsingDot />} isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  );
}

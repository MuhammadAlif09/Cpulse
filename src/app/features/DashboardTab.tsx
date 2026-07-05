import React, { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  Check,
  AlertTriangle,
  Cpu,
  MemoryStick,
  HardDrive,
  Wifi,
  Trash2,
  PackageX,
  Lock,
  Zap,
  RefreshCw,
  TrendingUp,
  Shield,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "motion/react";
import { RadialGauge } from "../components/RadialGauge";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { useSystemMetrics } from "../hooks/useSystemMetrics";
import { addHistoryLog } from "../utils/history";
import { DiskRow } from "../components/ui/DiskRow";

// ─── palette ──────────────────────────────────────────────────────────────────
const P = {
  teal: "#0d9488",
  tealLt: "#14b8a6",
  sky: "#0ea5e9",
  amber: "#f59e0b",
  rose: "#f43f5e",
  violet: "#8b5cf6",
  slate: "#64748b",
  good: "#10b981", // score ≥ 80
  warn: "#f59e0b", // score 50–79
  bad: "#f43f5e", // score < 50
};

function scoreColor(score: number) {
  if (score >= 80) return P.good;
  if (score >= 50) return P.warn;
  return P.bad;
}

function scoreLabel(score: number) {
  if (score >= 90) return "Excellent";
  if (score >= 80) return "Good";
  if (score >= 60) return "Fair";
  if (score >= 40) return "Poor";
  return "Critical";
}

function cn(...classes: (string | undefined | false)[]) {
  return classes.filter(Boolean).join(" ");
}

// ─── Card shell ───────────────────────────────────────────────────────────────
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

// ─── Stat card ────────────────────────────────────────────────────────────────
function StatCard({
  icon,
  label,
  value,
  sub,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub?: string;
  color: string;
}) {
  const [isHovered, setIsHovered] = useState(false);

  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!cardRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (let entry of entries) {
        setDimensions({
          width: cardRef.current?.offsetWidth || entry.target.clientWidth,
          height: cardRef.current?.offsetHeight || entry.target.clientHeight,
        });
      }
    });
    observer.observe(cardRef.current);
    return () => observer.disconnect();
  }, []);

  const W = dimensions.width;
  const H = dimensions.height;
  const R = 16;

  // Symmetrical split paths starting from middle of the left edge (2, H/2) with 2px offset to prevent clipping
  const topPath =
    W && H
      ? `M 2 ${H / 2} L 2 16 A 14 14 0 0 1 16 2 L ${W - 16} 2 A 14 14 0 0 1 ${W - 2} 16 L ${W - 2} ${H / 2}`
      : "";
  const bottomPath =
    W && H
      ? `M 2 ${H / 2} L 2 ${H - 16} A 14 14 0 0 0 16 ${H - 2} L ${W - 16} ${H - 2} A 14 14 0 0 0 ${W - 2} ${H - 16} L ${W - 2} ${H / 2}`
      : "";

  return (
    <div
      ref={cardRef}
      className="rounded-2xl p-4 bg-card/80 backdrop-blur-md shadow-sm relative transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 group cursor-default"
      style={{
        border: "1px solid var(--border)",
        background: `linear-gradient(145deg, var(--card) 60%, color-mix(in srgb, ${color} 4%, transparent))`,
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Tracing Border Progress Lines (Symmetrical Split) */}
      {W > 0 && H > 0 && (
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none rounded-2xl"
          style={{ width: W, height: H }}
        >
          {/* Top Half Path */}
          <path
            d={topPath}
            fill="none"
            stroke={color}
            strokeWidth="2"
            pathLength="100"
            style={{
              strokeDasharray: isHovered ? "100 0" : "8 92",
              strokeDashoffset: 0,
              transition: "stroke-dasharray 0.6s cubic-bezier(0.16, 1, 0.3, 1)",
              opacity: isHovered ? 0.9 : 0.7,
            }}
          />
          {/* Bottom Half Path */}
          <path
            d={bottomPath}
            fill="none"
            stroke={color}
            strokeWidth="2"
            pathLength="100"
            style={{
              strokeDasharray: isHovered ? "100 0" : "8 92",
              strokeDashoffset: 0,
              transition: "stroke-dasharray 0.6s cubic-bezier(0.16, 1, 0.3, 1)",
              opacity: isHovered ? 0.9 : 0.7,
            }}
          />
        </svg>
      )}
      <div className="pl-3">
        <div className="flex items-center gap-2 mb-2" style={{ color }}>
          {icon}
          <span className="text-xs font-semibold tracking-wide uppercase opacity-80">{label}</span>
        </div>
        <div
          className="text-2xl font-bold tracking-tight"
          style={{
            fontFamily: "'Satoshi', sans-serif",
            fontVariantNumeric: "tabular-nums",
            color: "var(--foreground)",
          }}
        >
          {value}
        </div>
        {sub && <div className="text-[11px] text-muted-foreground mt-1 truncate">{sub}</div>}
      </div>
    </div>
  );
}

// ─── Quick action button ───────────────────────────────────────────────────────
function ActionBtn({
  icon,
  label,
  sub,
  color,
  onClick,
  isLoading,
  done,
}: {
  icon: React.ReactNode;
  label: string;
  sub: string;
  color: string;
  onClick: () => void;
  isLoading?: boolean;
  done?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 p-3.5 rounded-xl border text-left w-full cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0 active:scale-[0.99]"
      style={{
        borderColor: done
          ? `color-mix(in srgb, ${P.good} 30%, transparent)`
          : `color-mix(in srgb, ${color} 25%, transparent)`,
        background: done
          ? `color-mix(in srgb, ${P.good} 8%, var(--card))`
          : `color-mix(in srgb, ${color} 6%, var(--card))`,
      }}
    >
      <div
        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform duration-200"
        style={{
          background: done
            ? `color-mix(in srgb, ${P.good} 15%, transparent)`
            : `color-mix(in srgb, ${color} 12%, transparent)`,
          color: done ? P.good : color,
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

// ─── Mini chart card ──────────────────────────────────────────────────────────
function MiniChart({
  title,
  subtitle,
  data,
  color,
  dataKey = "v",
}: {
  title: string;
  subtitle: string;
  data: { t: number; v: number }[];
  color: string;
  dataKey?: string;
}) {
  const gradId = `grad-${title.replace(/\s/g, "")}`;
  const glowId = `glow-${title.replace(/\s/g, "")}`;
  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-semibold text-foreground">{title}</span>
        <span className="text-[11px] text-muted-foreground">{subtitle}</span>
      </div>
      <div className="h-24">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 2, right: 0, left: -30, bottom: 0 }}>
            <defs>
              <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.35} />
                <stop offset="95%" stopColor={color} stopOpacity={0} />
              </linearGradient>
              <filter id={glowId} x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>
            <XAxis dataKey="t" hide />
            <YAxis domain={[0, 100]} hide />
            <Tooltip
              contentStyle={{
                fontSize: 11,
                borderRadius: 10,
                border: "1px solid var(--border)",
                boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
                background: "var(--popover)",
                backdropFilter: "blur(12px)",
                color: "var(--foreground)",
              }}
              labelStyle={{ display: "none" }}
              formatter={(v: number) => [`${v}%`, title.split(" ")[0]]}
            />
            <Area
              type="monotone"
              dataKey={dataKey}
              stroke={color}
              strokeWidth={2}
              fill={`url(#${gradId})`}
              filter={`url(#${glowId})`}
              dot={false}
              activeDot={{ r: 4, fill: color, strokeWidth: 2, stroke: "var(--card)" }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────
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

// ─── Main component ───────────────────────────────────────────────────────────
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

  const [cleanState, setCleanState] = useState<"idle" | "scanning" | "cleaning" | "cleaned">(
    "idle"
  );
  const [cleanedSize, setCleanedSize] = useState("");

  const [boostState, setBoostState] = useState<"idle" | "running" | "boosted">("idle");
  const [boostedSize, setBoostedSize] = useState("");

  const activeStartup = startupItems?.filter((i) => i.enabled).length ?? 0;

  const totalDiskUsed = metrics?.disks?.reduce((a: number, d: any) => a + d.used, 0) ?? 0;
  const totalDiskSize = metrics?.disks?.reduce((a: number, d: any) => a + d.total, 0) ?? 1;
  const diskPct = metrics ? Math.round((totalDiskUsed / totalDiskSize) * 100) : 0;

  const totalJunkBytes = junkItems?.reduce((a, c) => a + c.bytes, 0) ?? 0;
  const junkStr =
    totalJunkBytes > 0 ? `${(totalJunkBytes / 1048576).toFixed(1)} MB ready` : t("0 MB ready");

  let cpuTempStr = "";
  if (metrics?.cpu_temp > 0) cpuTempStr = `${Math.round(metrics.cpu_temp)}°C`;

  const handleClean = async () => {
    if (cleanState !== "idle") return;
    setCleanState("scanning");
    const t0 = Date.now();
    try {
      const results: any[] = await invoke("scan_junk");
      const bytes = results.reduce((a, c) => a + c.bytes, 0);
      if (bytes > 0) {
        setCleanState("cleaning");
        const res = await invoke<{ bytes_freed: number; files_cleaned: number }>("clean_junk", {
          categories: results.map((r) => r.name),
        });
        const freed =
          res.bytes_freed > 1073741824
            ? (res.bytes_freed / 1073741824).toFixed(2) + " GB"
            : (res.bytes_freed / 1048576).toFixed(1) + " MB";
        setCleanedSize(freed);
        addHistoryLog({
          type: "Quick Clean",
          freed,
          fixed: res.files_cleaned,
          duration: ((Date.now() - t0) / 1000).toFixed(1) + "s",
        });
      } else {
        setCleanedSize("0 MB");
        addHistoryLog({
          type: "Quick Clean",
          freed: "0 MB",
          fixed: 0,
          duration: ((Date.now() - t0) / 1000).toFixed(1) + "s",
        });
      }
      setCleanState("cleaned");
      setTimeout(() => setCleanState("idle"), 4000);
    } catch (e) {
      console.error(e);
      setCleanState("idle");
    }
  };

  const handleBoost = async () => {
    if (boostState !== "idle") return;
    setBoostState("running");
    const t0 = Date.now();
    try {
      const freed = await invoke<number>("clean_ram");
      const str =
        freed > 1073741824
          ? `+${(freed / 1073741824).toFixed(1)} GB freed`
          : `+${(freed / 1048576).toFixed(0)} MB freed`;
      setBoostedSize(str);
      setBoostState("boosted");
      addHistoryLog({
        type: "RAM Boost",
        freed: str.replace("+", ""),
        fixed: 1,
        duration: ((Date.now() - t0) / 1000).toFixed(1) + "s",
      });
      setTimeout(() => setBoostState("idle"), 4000);
    } catch (e) {
      console.error(e);
      setBoostState("idle");
    }
  };

  const sc = scoreColor(score);

  return (
    <div className="space-y-4">
      {/* ── Hero: health score ──────────────────────────────────────────────── */}
      <Card className="relative overflow-hidden" style={{ padding: "1.5rem" }}>
        {/* subtle teal glow top-right */}
        <div
          className="absolute -top-16 -right-16 w-64 h-64 rounded-full pointer-events-none"
          style={{
            background: `radial-gradient(circle, color-mix(in srgb, ${sc} 12%, transparent) 0%, transparent 70%)`,
          }}
        />

        <div className="relative flex items-center justify-between gap-6 flex-wrap">
          {/* left: score */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Shield size={14} style={{ color: sc }} />
              <span className="text-xs font-semibold text-muted-foreground tracking-wide uppercase">
                {t("System Health")}
              </span>
            </div>

            <div className="flex items-end gap-2 leading-none">
              <span
                className="font-bold"
                style={{
                  fontSize: "4rem",
                  lineHeight: 1,
                  fontFamily: "'Satoshi', sans-serif",
                  fontVariantNumeric: "tabular-nums",
                  color: sc,
                  letterSpacing: "-2px",
                }}
              >
                {score}
              </span>
              <span
                className="text-xl mb-1.5 font-medium"
                style={{ color: "var(--muted-foreground)" }}
              >
                /100
              </span>
            </div>

            <div className="text-sm font-semibold mt-1" style={{ color: sc }}>
              {t(scoreLabel(score))}
            </div>

            <div className="text-xs text-muted-foreground mt-1 max-w-[200px]">
              {issues?.length > 0
                ? `${issues.length} ${t(issues.length === 1 ? "issue found" : "issues found")}`
                : t("System is running optimally")}
            </div>

            {/* status pills */}
            <div className="flex flex-wrap gap-2 mt-3">
              <span
                className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-medium"
                style={{
                  background: `color-mix(in srgb, ${P.good} 12%, transparent)`,
                  color: P.good,
                }}
              >
                <Check size={11} strokeWidth={3} /> {t("Protection active")}
              </span>
              {issues?.map((iss, i) => (
                <span
                  key={i}
                  className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-medium"
                  style={{
                    background: `color-mix(in srgb, ${P.warn} 12%, transparent)`,
                    color: P.warn,
                  }}
                >
                  <AlertTriangle size={11} /> {t(iss)}
                </span>
              ))}
            </div>
          </div>

          {/* right: gauges */}
          <div className="flex gap-4 items-center">
            <RadialGauge
              value={metrics ? Math.round(metrics.cpu_usage) : 0}
              label="CPU"
              color={P.teal}
              trackColor="var(--border)"
              size={80}
            />
            <RadialGauge
              value={metrics ? Math.round(metrics.ram_usage) : 0}
              label="RAM"
              color={P.violet}
              trackColor="var(--border)"
              size={80}
            />
            <RadialGauge
              value={diskPct}
              label="Disk"
              color={P.amber}
              trackColor="var(--border)"
              size={80}
            />
          </div>
        </div>
      </Card>

      {/* ── Stat cards ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          icon={<Cpu size={15} />}
          label={t("CPU")}
          value={metrics ? `${Math.round(metrics.cpu_usage)}%` : "—"}
          sub={cpuTempStr ? `${t("Temp")}: ${cpuTempStr}` : t("Global CPU Load")}
          color={P.teal}
        />
        <StatCard
          icon={<MemoryStick size={15} />}
          label={t("RAM")}
          value={metrics ? `${Math.round(metrics.ram_usage)}%` : "—"}
          sub={
            metrics
              ? `${metrics.used_ram.toFixed(1)} / ${metrics.total_ram.toFixed(1)} GB`
              : t("Waiting for data")
          }
          color={P.violet}
        />
        <StatCard
          icon={<HardDrive size={15} />}
          label={t("Disk")}
          value={`${diskPct}%`}
          sub={
            metrics
              ? `${totalDiskUsed.toFixed(1)} / ${totalDiskSize.toFixed(1)} GB`
              : t("Waiting for data")
          }
          color={P.amber}
        />
        <StatCard
          icon={<Wifi size={15} />}
          label={t("Network")}
          value={metrics ? `${(metrics.network_up + metrics.network_down).toFixed(1)} MB/s` : "—"}
          sub={
            metrics
              ? `↑ ${metrics.network_up.toFixed(1)}  ↓ ${metrics.network_down.toFixed(1)}`
              : t("Waiting for data")
          }
          color={P.sky}
        />
      </div>

      {/* ── Charts + disk ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <MiniChart
          title={t("CPU History")}
          subtitle={t("Last 20s")}
          data={cpuData}
          color={P.teal}
        />
        <MiniChart
          title={t("RAM History")}
          subtitle={t("Last 20s")}
          data={ramData}
          color={P.violet}
        />

        {/* Disk list */}
        <Card>
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-foreground">{t("Disk Space")}</span>
            <span className="text-[11px] text-muted-foreground">
              {metrics?.disks ? `${metrics.disks.length} ${t("drives")}` : "—"}
            </span>
          </div>
          <div className="space-y-3 max-h-24 overflow-y-auto pr-0.5">
            {metrics?.disks?.length > 0 ? (
              metrics.disks.map((disk: any) => <DiskRow key={disk.name} disk={disk} t={t} />)
            ) : (
              <div className="text-xs text-muted-foreground py-5 text-center">
                {t("Loading disks...")}
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* ── Quick actions ──────────────────────────────────────────────────── */}
      <Card>
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp size={14} className="text-muted-foreground" />
          <h3 className="text-sm font-semibold text-foreground">{t("Quick Actions")}</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <ActionBtn
            icon={<Trash2 size={18} />}
            label={
              cleanState === "scanning"
                ? t("Scanning...")
                : cleanState === "cleaning"
                  ? t("Cleaning...")
                  : cleanState === "cleaned"
                    ? t("Cleaned!")
                    : t("Clean Junk")
            }
            sub={
              cleanState === "cleaned"
                ? `${t("Freed")} ${cleanedSize}`
                : cleanState === "scanning" || cleanState === "cleaning"
                  ? t("Please wait...")
                  : junkStr
            }
            color={P.teal}
            onClick={handleClean}
            isLoading={cleanState === "scanning" || cleanState === "cleaning"}
            done={cleanState === "cleaned"}
          />
          <ActionBtn
            icon={<Zap size={18} />}
            label={
              boostState === "running"
                ? t("Optimizing...")
                : boostState === "boosted"
                  ? t("Boosted!")
                  : t("Boost RAM")
            }
            sub={
              boostState === "boosted"
                ? boostedSize
                : boostState === "running"
                  ? t("Freeing memory...")
                  : t("Optimize memory")
            }
            color={P.violet}
            onClick={handleBoost}
            isLoading={boostState === "running"}
            done={boostState === "boosted"}
          />
          <ActionBtn
            icon={<PackageX size={18} />}
            label={t("Fix Startup")}
            sub={`${activeStartup} ${t("items active")}`}
            color={P.amber}
            onClick={() => setTab("startup")}
          />
          <ActionBtn
            icon={<Lock size={18} />}
            label={t("Privacy Sweep")}
            sub={t("Traces found")}
            color={P.rose}
            onClick={() => setTab("privacy")}
          />
        </div>
      </Card>
    </div>
  );
}

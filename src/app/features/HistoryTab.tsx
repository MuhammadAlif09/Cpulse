import React, { useState, useEffect } from "react";
import { load } from "@tauri-apps/plugin-store";
import {
  HardDrive,
  BarChart3,
  Star,
  Sparkles,
  Zap,
  Lock,
  FileText,
  Rocket,
  RotateCcw,
  Activity,
  RefreshCw,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { StatCard } from "../components/ui/StatCard";

// Teal-based palette consistent with the rest of the app
const P = {
  teal: "#0d9488",
  amber: "#f59e0b",
  rose: "#f43f5e",
  sky: "#0ea5e9",
  violet: "#8b5cf6",
  slate: "#64748b",
  good: "#10b981",
};

interface SessionLog {
  date: string;
  freed: string;
  fixed: number;
  duration: string;
  type: string;
  details?: string;
}

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

const isTauri =
  typeof window !== "undefined" &&
  ((window as any).__TAURI_INTERNALS__ !== undefined ||
    (window as any).__TAURI_IPC__ !== undefined ||
    (window as any).process?.env?.NODE_ENV === "test");

const getLogIcon = (type: string) => {
  switch (type) {
    case "Deep Clean":
      return <Sparkles size={15} />;
    case "Quick Clean":
    case "RAM Boost":
      return <Zap size={15} />;
    case "Privacy Sweep":
      return <Lock size={15} />;
    case "Diagnostics":
      return <FileText size={15} />;
    case "Booster Applied":
      return <Rocket size={15} />;
    case "Booster Restored":
      return <RotateCcw size={15} />;
    case "Startup Toggled":
    case "Startup Optimizer":
      return <Activity size={15} />;
    default:
      return <Zap size={15} />;
  }
};

const getLogColor = (type: string) => {
  switch (type) {
    case "Deep Clean":
    case "Quick Clean":
      return P.teal;
    case "RAM Boost":
      return P.violet;
    case "Privacy Sweep":
      return P.rose;
    case "Diagnostics":
      return P.amber;
    case "Booster Applied":
      return P.good;
    case "Booster Restored":
      return P.slate;
    case "Startup Toggled":
    case "Startup Optimizer":
      return P.sky;
    default:
      return P.teal;
  }
};

const parseFreedToGB = (freedStr: string): number => {
  if (!freedStr || freedStr === "N/A") return 0;
  const num = parseFloat(freedStr);
  if (isNaN(num)) return 0;

  const lower = freedStr.toLowerCase();
  if (lower.includes("gb")) return num;
  if (lower.includes("mb")) return num / 1024;
  if (lower.includes("kb")) return num / (1024 * 1024);
  if (lower.includes("b")) return num / (1024 * 1024 * 1024);
  return num / 1024; // Default assume MB
};

const formatMonthYearShort = (date: Date) => {
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  return `${months[date.getMonth()]} '${String(date.getFullYear()).slice(-2)}`;
};

const getMonthYear = (dateStr: string) => {
  if (!dateStr) return "Other";
  const cleanDateStr = dateStr.replace(/(\d{1,2})\.(\d{2})/g, "$1:$2");
  const d = new Date(cleanDateStr);
  if (!isNaN(d.getTime())) return formatMonthYearShort(d);

  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  for (const m of months) {
    if (dateStr.includes(m)) {
      const yrMatch = dateStr.match(/\b(20)?(2\d)\b/);
      return `${m} '${yrMatch ? yrMatch[2] : "26"}`;
    }
  }

  const idMonths: Record<string, string> = {
    Jan: "Jan",
    Peb: "Feb",
    Mar: "Mar",
    Apr: "Apr",
    Mei: "May",
    Jun: "Jun",
    Jul: "Jul",
    Agu: "Aug",
    Sep: "Sep",
    Okt: "Oct",
    Nov: "Nov",
    Des: "Dec",
  };
  for (const [idM, enM] of Object.entries(idMonths)) {
    if (dateStr.toLowerCase().includes(idM.toLowerCase())) {
      const yrMatch = dateStr.match(/\b(20)?(2\d)\b/);
      return `${enM} '${yrMatch ? yrMatch[2] : "26"}`;
    }
  }
  return "Other";
};

const getMonthlyFreedData = (logs: SessionLog[]) => {
  const groups: Record<string, number> = {};
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    groups[formatMonthYearShort(d)] = 0;
  }
  logs.forEach((log) => {
    const val = parseFreedToGB(log.freed);
    if (val > 0) {
      const label = getMonthYear(log.date);
      if (groups[label] !== undefined) groups[label] += val;
    }
  });
  return Object.entries(groups).map(([name, value]) => ({
    name,
    value: parseFloat(value.toFixed(2)),
  }));
};

export function HistoryTab() {
  const { t } = useTranslation();
  const [history, setHistory] = useState<SessionLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadHistory = async () => {
      if (!isTauri) return setIsLoading(false);
      try {
        const historyStore = await load("history.json");
        const logs = (await historyStore.get<SessionLog[]>("logs")) || [];
        setHistory(logs);
      } catch (error) {
        console.error("Failed to load history", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadHistory();
  }, []);

  const totalFreedGB = history.reduce((acc, curr) => acc + parseFreedToGB(curr.freed), 0);
  const monthlyData = getMonthlyFreedData(history);
  const hasFreedData = monthlyData.some((d) => d.value > 0);

  const ChartTooltip = ({ active, payload, label, unit }: any) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-card/95 backdrop-blur-md border border-border rounded-xl p-3 shadow-lg font-sans tabular-nums text-xs">
        <div className="text-[10px] font-bold uppercase text-muted-foreground mb-1.5 tracking-wider">
          {label}
        </div>
        {payload.map((entry: any, idx: number) => (
          <div key={idx} className="flex items-center gap-2">
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: entry.color || P.teal }}
            />
            <span className="text-muted-foreground">{t("Freed")}:</span>
            <span className="font-bold text-foreground">
              {entry.value?.toFixed(2)} {unit || "GB"}
            </span>
          </div>
        ))}
      </div>
    );
  };

  const renderDetails = (details: string) => {
    if (!details) return "";
    if (details.includes(":")) {
      const parts = details.split(":");
      const key = parts[0];
      const val = parts.slice(1).join(":");
      const trans = t(val);
      if (key === "Enabled")
        return t("Enabled {{name}}", { name: trans }).replace("{{name}}", trans);
      if (key === "Disabled")
        return t("Disabled {{name}}", { name: trans }).replace("{{name}}", trans);
      if (key === "Applied")
        return t("Applied {{name}}", { name: trans }).replace("{{name}}", trans);
      if (key === "Restored")
        return t("Restored {{name}}", { name: trans }).replace("{{name}}", trans);
      if (key === "DisabledHighImpact")
        return t("Disabled {{count}} high impact items", { count: val }).replace("{{count}}", val);
    }
    if (details.includes("{{name}}")) {
      const fb = t("program");
      return t(details, { name: fb }).replace("{{name}}", fb);
    }
    if (details.includes("{{count}}")) return t(details, { count: 1 }).replace("{{count}}", "1");
    return t(details);
  };

  return (
    <div className="space-y-4">
      {isLoading ? (
        <div className="py-10 text-center text-muted-foreground text-sm font-medium">
          <RefreshCw size={24} className="animate-spin mx-auto mb-3 opacity-50" />
          {t("Loading history...")}
        </div>
      ) : history.length === 0 ? (
        <Card className="flex flex-col items-center justify-center py-20 text-center border-dashed">
          <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center mb-4 text-muted-foreground/60 shadow-inner">
            <BarChart3 size={32} />
          </div>
          <h3 className="text-lg font-bold text-foreground mb-1">{t("No cleaning history yet")}</h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            {t("Run your first scan on the dashboard or cleaner tab to see your records here.")}
          </p>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard
              icon={<HardDrive size={15} />}
              label={t("Total Freed")}
              value={`${totalFreedGB.toFixed(1)} GB`}
              sub={t("All time")}
              color={P.teal}
            />
            <StatCard
              icon={<BarChart3 size={15} />}
              label={t("Scans Run")}
              value={history.length.toString()}
              sub={t("Recorded sessions")}
              color={P.sky}
            />
            <StatCard
              icon={<Star size={15} />}
              label={t("Issues Fixed")}
              value={history.reduce((acc, curr) => acc + curr.fixed, 0).toString()}
              sub={t("All time")}
              color={P.amber}
            />
          </div>

          <Card>
            <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
              <BarChart3 size={16} className="text-muted-foreground" />
              {t("Space Freed Per Month")}
            </h3>
            {hasFreedData ? (
              <div className="h-[240px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={monthlyData}
                    margin={{ top: 10, right: 10, left: -25, bottom: 0 }}
                  >
                    <XAxis
                      dataKey="name"
                      stroke="var(--muted-foreground)"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      stroke="var(--muted-foreground)"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      unit="GB"
                    />
                    <Tooltip
                      cursor={{ fill: "var(--secondary)" }}
                      content={<ChartTooltip unit="GB" />}
                    />
                    <Bar
                      dataKey="value"
                      fill="url(#historyFreedGrad)"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={48}
                    >
                      {monthlyData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.value > 0 ? "url(#historyFreedGrad)" : "var(--border)"}
                        />
                      ))}
                    </Bar>
                    <defs>
                      <linearGradient id="historyFreedGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={P.teal} stopOpacity={0.9} />
                        <stop offset="100%" stopColor={P.teal} stopOpacity={0.2} />
                      </linearGradient>
                      <filter id="barGlow" x="-20%" y="-10%" width="140%" height="120%">
                        <feGaussianBlur stdDeviation="2" result="blur" />
                        <feComposite in="SourceGraphic" in2="blur" operator="over" />
                      </filter>
                    </defs>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[240px] flex items-center justify-center text-sm text-muted-foreground font-medium border border-dashed rounded-xl">
                {t("Chart data will appear after a few cleanings.")}
              </div>
            )}
          </Card>

          <Card className="p-0 overflow-hidden">
            <div className="p-4 border-b border-border bg-card">
              <h3 className="text-sm font-semibold text-foreground">{t("Session Log")}</h3>
            </div>
            <div className="divide-y divide-border">
              {history.map((h, i) => {
                const color = getLogColor(h.type);
                const showFreed =
                  h.freed &&
                  h.freed !== "N/A" &&
                  h.freed !== "" &&
                  (h.type.includes("Clean") ||
                    h.type.includes("Boost") ||
                    (!h.freed.startsWith("0") && !h.freed.startsWith("N/A")));

                return (
                  <div
                    key={i}
                    className="flex items-center gap-4 p-4 hover:bg-secondary/50 transition duration-200"
                  >
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{
                        background: `color-mix(in srgb, ${color} 15%, transparent)`,
                        color: color,
                      }}
                    >
                      {getLogIcon(h.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-foreground truncate">
                        {t(h.type)}
                        {h.details && (
                          <span className="font-normal text-muted-foreground ml-1.5">
                            ({renderDetails(h.details)})
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5 font-medium">
                        {h.date} {h.duration && `· ${h.duration}`}{" "}
                        {h.fixed > 0 &&
                          `· ${h.fixed} ${t(h.fixed === 1 ? "issue fixed" : "issues fixed")}`}
                      </div>
                    </div>
                    {showFreed && (
                      <div className="text-right flex-shrink-0">
                        <div
                          className="text-sm font-bold"
                          style={{
                            color: P.teal,
                            fontFamily: "'Satoshi', sans-serif",
                            fontVariantNumeric: "tabular-nums",
                          }}
                        >
                          {h.freed}
                        </div>
                        <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
                          {t("Freed")}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}

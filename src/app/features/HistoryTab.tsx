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
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";

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
        "rounded-2xl p-5 border border-white/60 dark:border-slate-800/40 shadow-sm relative overflow-hidden transition-all duration-300 bg-card text-card-foreground",
        className
      )}
      style={{
        background: gradient,
        boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)",
        ...style,
      }}
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
      return <Zap size={15} />;
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
      return { bg: "rgba(79,70,229,0.18)", text: "var(--primary)" };
    case "Quick Clean":
      return { bg: "rgba(14,165,233,0.18)", text: "#0ea5e9" };
    case "RAM Boost":
      return { bg: "rgba(124,58,237,0.18)", text: "#7c3aed" };
    case "Privacy Sweep":
      return { bg: "rgba(244,63,94,0.18)", text: "#f43f5e" };
    case "Diagnostics":
      return { bg: "rgba(245,158,11,0.18)", text: "#f59e0b" };
    case "Booster Applied":
      return { bg: "rgba(16,185,129,0.18)", text: "#10b981" };
    case "Booster Restored":
      return { bg: "rgba(100,116,139,0.18)", text: "#64748b" };
    case "Startup Toggled":
    case "Startup Optimizer":
      return { bg: "rgba(236,72,153,0.18)", text: "#ec4899" };
    default:
      return { bg: "rgba(79,70,229,0.18)", text: "var(--primary)" };
  }
};

const parseFreedToGB = (freedStr: string): number => {
  if (!freedStr || freedStr === "N/A") return 0;
  const num = parseFloat(freedStr);
  if (isNaN(num)) return 0;

  const lower = freedStr.toLowerCase();
  if (lower.includes("gb")) {
    return num;
  } else if (lower.includes("mb")) {
    return num / 1024;
  } else if (lower.includes("kb")) {
    return num / (1024 * 1024);
  } else if (lower.includes("bytes") || lower.includes("b")) {
    return num / (1024 * 1024 * 1024);
  }
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
  const m = months[date.getMonth()];
  const yr = String(date.getFullYear()).slice(-2);
  return `${m} '${yr}`;
};

const getMonthYear = (dateStr: string) => {
  if (!dateStr) return "Other";
  // Replace dot time separator with colon for browser compatibility (e.g. 08.36 -> 08:36)
  const cleanDateStr = dateStr.replace(/(\d{1,2})\.(\d{2})/g, "$1:$2");
  const d = new Date(cleanDateStr);
  if (!isNaN(d.getTime())) {
    return formatMonthYearShort(d);
  }
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
      const yr = yrMatch ? yrMatch[2] : "26";
      return `${m} '${yr}`;
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
      const yr = yrMatch ? yrMatch[2] : "26";
      return `${enM} '${yr}`;
    }
  }
  return "Other";
};

const getMonthlyFreedData = (logs: SessionLog[]) => {
  const groups: Record<string, number> = {};

  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const label = formatMonthYearShort(d);
    groups[label] = 0;
  }

  logs.forEach((log) => {
    const val = parseFreedToGB(log.freed);
    if (val > 0) {
      const label = getMonthYear(log.date);
      if (groups[label] !== undefined) {
        groups[label] += val;
      }
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
      if (!isTauri) {
        setIsLoading(false);
        return;
      }
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
        <div className="text-xs font-semibold text-slate-500 mb-1">{label}</div>
        {payload.map((entry: any, idx: number) => (
          <div
            key={idx}
            className="flex items-center gap-2 text-xs"
            style={{ color: "var(--card-foreground)" }}
          >
            <span
              className="w-2.5 h-2.5 rounded-full inline-block"
              style={{ backgroundColor: entry.color || C.indigo }}
            />
            <span className="text-slate-500 dark:text-slate-400">{t("Freed")}:</span>
            <span className="font-bold text-indigo-650 dark:text-indigo-400">
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
      const translatedVal = t(val);

      if (key === "Enabled") {
        return t("Enabled {{name}}", { name: translatedVal }).replace("{{name}}", translatedVal);
      }
      if (key === "Disabled") {
        return t("Disabled {{name}}", { name: translatedVal }).replace("{{name}}", translatedVal);
      }
      if (key === "Applied") {
        return t("Applied {{name}}", { name: translatedVal }).replace("{{name}}", translatedVal);
      }
      if (key === "Restored") {
        return t("Restored {{name}}", { name: translatedVal }).replace("{{name}}", translatedVal);
      }
      if (key === "DisabledHighImpact") {
        return t("Disabled {{count}} high impact startup items", { count: val }).replace(
          "{{count}}",
          val
        );
      }
    }

    if (details.includes("{{name}}")) {
      const fallbackName = t("program");
      return t(details, { name: fallbackName }).replace("{{name}}", fallbackName);
    }

    if (details.includes("{{count}}")) {
      return t(details, { count: 1 }).replace("{{count}}", "1");
    }

    return t(details);
  };

  return (
    <div className="space-y-5">
      {isLoading ? (
        <div className="py-10 text-center text-slate-400 dark:text-slate-550 text-sm">
          {t("Loading history...")}
        </div>
      ) : history.length === 0 ? (
        <GradientCard className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-slate-50 dark:bg-slate-800/60 flex items-center justify-center mb-4 text-slate-300 dark:text-slate-600 animate-pulse-subtle">
            <BarChart3 size={32} />
          </div>
          <div className="text-slate-500 dark:text-slate-300 font-medium mb-1">
            {t("No cleaning history yet.")}
          </div>
          <div className="text-sm text-slate-400 dark:text-slate-500">
            {t("Run your first scan!")}
          </div>
        </GradientCard>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-4">
            {[
              {
                icon: <HardDrive size={18} />,
                label: "Total Freed",
                value: `${totalFreedGB.toFixed(1)} GB`,
                sub: "All time",
                color: C.indigo,
              },
              {
                icon: <BarChart3 size={18} />,
                label: "Scans Run",
                value: history.length.toString(),
                sub: "Last 30 days",
                color: C.violet,
              },
              {
                icon: <Star size={18} />,
                label: "Issues Fixed",
                value: history.reduce((acc, curr) => acc + curr.fixed, 0).toString(),
                sub: "All time",
                color: C.amber,
              },
            ].map((s) => (
              <GradientCard
                key={s.label}
                style={{
                  background: `linear-gradient(135deg, ${s.color}0c, ${s.color}02)`,
                  borderColor: `${s.color}25`,
                }}
              >
                <div className="flex items-center gap-3 mb-2">
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ background: `${s.color}20`, color: s.color }}
                  >
                    {s.icon}
                  </div>
                  <span className="text-xs font-medium text-slate-505 dark:text-slate-400">
                    {t(s.label)}
                  </span>
                </div>
                <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                  {s.value}
                </div>
                <div className="text-xs text-slate-400 dark:text-slate-550 mt-0.5">{t(s.sub)}</div>
              </GradientCard>
            ))}
          </div>

          <GradientCard>
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">
              {t("Space Freed Per Month")}
            </h3>
            {hasFreedData ? (
              <div className="h-[220px] w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={monthlyData}
                    margin={{ top: 10, right: 10, left: -25, bottom: 0 }}
                  >
                    <XAxis
                      dataKey="name"
                      stroke="var(--slate-500)"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      stroke="var(--slate-500)"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      unit="GB"
                    />
                    <Tooltip
                      cursor={{ fill: "rgba(255,255,255,0.03)" }}
                      content={<ChartTooltip unit="GB" />}
                    />
                    <Bar
                      dataKey="value"
                      fill="url(#historyFreedGrad)"
                      radius={[6, 6, 0, 0]}
                      maxBarSize={32}
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
                        <stop offset="0%" stopColor={C.indigo} stopOpacity={0.8} />
                        <stop offset="100%" stopColor={C.indigo} stopOpacity={0.15} />
                      </linearGradient>
                    </defs>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="py-10 text-center text-slate-400 dark:text-slate-550 text-sm">
                {t("Chart data will appear after a few cleanings.")}
              </div>
            )}
          </GradientCard>

          <GradientCard>
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">
              {t("Session Log")}
            </h3>
            <div className="space-y-2">
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
                    className="flex items-center gap-4 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-850/50 transition duration-200"
                  >
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{
                        background: color.bg,
                        color: color.text,
                      }}
                    >
                      {getLogIcon(h.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-slate-700 dark:text-slate-200 truncate">
                        {t(h.type)}
                        {h.details && (
                          <span className="font-normal text-slate-500 dark:text-slate-400 ml-1.5">
                            ({renderDetails(h.details)})
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-slate-400 dark:text-slate-550 mt-0.5">
                        {h.date} {h.duration && `· ${h.duration}`}{" "}
                        {h.fixed > 0 &&
                          `· ${h.fixed} ${t(h.fixed === 1 ? "issue fixed" : "issues fixed")}`}
                      </div>
                    </div>
                    {showFreed && (
                      <div className="text-right flex-shrink-0">
                        <div className="text-sm font-semibold" style={{ color: "var(--primary)" }}>
                          {h.freed}
                        </div>
                        <div className="text-xs text-slate-400 dark:text-slate-550">
                          {t("freed")}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </GradientCard>
        </>
      )}
    </div>
  );
}

import React, { useState, useEffect } from "react";
import { load } from "@tauri-apps/plugin-store";
import { HardDrive, BarChart3, Star, Sparkles, Zap } from "lucide-react";
import { useTranslation } from "react-i18next";

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
  ((window as any).__TAURI_IPC__ !== undefined ||
    (window as any).process?.env?.NODE_ENV === "test");

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

  return (
    <div className="space-y-5">
      {isLoading ? (
        <div className="py-10 text-center text-slate-400 dark:text-slate-500 text-sm">
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
                value: `${history.reduce((acc, curr) => acc + parseFloat(curr.freed), 0).toFixed(1)} GB`,
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
            <div className="py-10 text-center text-slate-400 dark:text-slate-500 text-sm">
              {t("Chart data will appear after a few cleanings.")}
            </div>
          </GradientCard>

          <GradientCard>
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">
              {t("Session Log")}
            </h3>
            <div className="space-y-2">
              {history.map((h, i) => (
                <div
                  key={i}
                  className="flex items-center gap-4 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50/50 dark:hover:bg-slate-850/50 transition duration-200"
                >
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{
                      background:
                        h.type === "Deep Clean" ? "rgba(79,70,229,0.18)" : "rgba(16,185,129,0.18)",
                      color: h.type === "Deep Clean" ? "var(--primary)" : "#10b981",
                    }}
                  >
                    {h.type === "Deep Clean" ? <Sparkles size={15} /> : <Zap size={15} />}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-slate-700 dark:text-slate-200">
                      {h.date}
                    </div>
                    <div className="text-xs text-slate-400 dark:text-slate-500">
                      {t(h.type)} · {h.duration} · {h.fixed} {t("issues fixed")}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold" style={{ color: "var(--primary)" }}>
                      {h.freed}
                    </div>
                    <div className="text-xs text-slate-400 dark:text-slate-500">{t("freed")}</div>
                  </div>
                </div>
              ))}
            </div>
          </GradientCard>
        </>
      )}
    </div>
  );
}

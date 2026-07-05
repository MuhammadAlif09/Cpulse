import React from "react";
import { Shield, Sparkles } from "lucide-react";

interface SidebarProps {
  nav: { id: string; label: string; icon: React.ReactNode; badge?: number }[];
  tab: string;
  setTab: (tab: string) => void;
  junkItems: any[];
  startupItems: any[];
  privacyItems: any[];
  privacySwept: boolean;
  score: number;
  healthText: string;
  issues: string[];
  lang: string;
  t: (lang: string, text: string) => string;
}

const P = {
  good: "#10b981", // score ≥ 80
  warn: "#f59e0b", // score 50–79
  bad: "#f43f5e", // score < 50
  teal: "#0d9488",
};

function scoreColor(score: number) {
  if (score >= 80) return P.good;
  if (score >= 50) return P.warn;
  return P.bad;
}

export function Sidebar({
  nav,
  tab,
  setTab,
  junkItems,
  startupItems,
  privacyItems,
  privacySwept,
  score,
  healthText,
  issues,
  lang,
  t,
}: SidebarProps) {
  const sc = scoreColor(score);

  return (
    <aside className="w-56 flex-shrink-0 border-r bg-card/80 backdrop-blur-xl flex flex-col py-5 px-3 gap-1 border-border">
      <div className="flex-1 space-y-0.5">
        {nav.map((n) => {
          const active = tab === n.id;

          let badgeCount: number | undefined = n.badge;
          if (n.id === "cleaner") {
            badgeCount = junkItems.length > 0 ? junkItems.length : undefined;
          } else if (n.id === "startup") {
            const activeCount = startupItems.filter((i) => i.enabled).length;
            badgeCount = activeCount > 0 ? activeCount : undefined;
          } else if (n.id === "privacy") {
            const privacyCount = privacyItems.filter((i) => i.found).length;
            badgeCount = privacySwept ? undefined : privacyCount;
          }

          return (
            <button
              key={n.id}
              onClick={() => setTab(n.id)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-200 cursor-pointer group"
              style={{
                background: active
                  ? `color-mix(in srgb, ${P.teal} 12%, transparent)`
                  : "transparent",
                color: active ? P.teal : "var(--muted-foreground)",
                boxShadow: active
                  ? `inset 0 0 0 1px color-mix(in srgb, ${P.teal} 15%, transparent), 0 0 12px -4px color-mix(in srgb, ${P.teal} 20%, transparent)`
                  : "none",
              }}
              onMouseEnter={(e) => {
                if (!active) {
                  e.currentTarget.style.background = "var(--secondary)";
                  e.currentTarget.style.color = "var(--foreground)";
                }
              }}
              onMouseLeave={(e) => {
                if (!active) {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.color = "var(--muted-foreground)";
                }
              }}
            >
              <span
                className="flex-shrink-0 transition-transform duration-200"
                style={{
                  transform: active ? "scale(1.1)" : "scale(1)",
                  color: active ? P.teal : "inherit",
                }}
              >
                {n.icon}
              </span>
              <span className="flex-1 text-left">{t(lang, n.label)}</span>
              {badgeCount !== undefined && (
                <span
                  className="text-[10px] px-1.5 py-0.5 rounded-full font-bold tracking-wide"
                  style={{
                    background: active ? P.teal : "var(--muted)",
                    color: active ? "#ffffff" : "var(--muted-foreground)",
                  }}
                >
                  {badgeCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-auto pt-4 transition-all duration-500 ease-in-out">
        {/* Score Card */}
        <div
          className="rounded-2xl p-4 mb-3 border relative overflow-hidden backdrop-blur-md"
          style={{
            borderColor: `color-mix(in srgb, ${sc} 15%, var(--border))`,
            background: `linear-gradient(145deg, var(--card) 40%, color-mix(in srgb, ${sc} 4%, transparent))`,
            boxShadow: `0 0 20px -6px color-mix(in srgb, ${sc} 12%, transparent)`,
          }}
        >
          <div className="flex items-center gap-1.5 mb-2">
            <Shield size={14} style={{ color: sc }} />
            <span
              className="text-[11px] font-bold uppercase tracking-wide opacity-80"
              style={{ color: sc }}
            >
              {t(lang, "Health Score")}
            </span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <div
              className="text-3xl font-bold tracking-tight"
              style={{
                color: "var(--foreground)",
                fontFamily: "'Satoshi', sans-serif",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {score}
            </div>
            <div className="text-sm font-medium text-muted-foreground">/100</div>
          </div>
          <div className="text-[11px] text-muted-foreground mt-1 font-medium truncate">
            {issues.length > 0
              ? `${issues.length} ${t(lang, "issues found")}`
              : t(lang, "System healthy")}
          </div>

          {/* Progress bar */}
          <div
            className="w-full h-1.5 rounded-full mt-3 overflow-hidden"
            style={{ background: "var(--secondary)" }}
          >
            <div
              className="h-full rounded-full transition-all duration-1000 ease-out"
              style={{ width: `${score}%`, background: sc, boxShadow: `0 0 8px ${sc}` }}
            />
          </div>
        </div>

        {/* Last Scan Info */}
        <div className="rounded-xl p-3 bg-secondary/40 backdrop-blur-sm border border-border/30 text-[11px]">
          <div className="flex items-center gap-1.5 text-muted-foreground font-medium mb-1">
            <Sparkles size={12} />
            <span>{t(lang, "Last cleaned")}</span>
          </div>
          <div className="font-semibold text-foreground truncate">{t(lang, "None yet")}</div>
        </div>
      </div>
    </aside>
  );
}

import React from "react";
import { Sparkles } from "lucide-react";

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
  return (
    <aside className="w-52 flex-shrink-0 border-r bg-card/70 backdrop-blur-sm flex flex-col py-4 px-3 gap-0.5 border-border">
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
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all relative text-left cursor-pointer"
            style={
              active
                ? {
                    background:
                      "linear-gradient(135deg, var(--accent), var(--accent-foreground)/20%)",
                    color: "var(--primary)",
                    fontWeight: 600,
                  }
                : { color: "var(--muted-foreground)" }
            }
          >
            <span style={active ? { color: "var(--primary)" } : { color: "#94a3b8" }}>
              {n.icon}
            </span>
            <span className="flex-1">{t(lang, n.label)}</span>
            {badgeCount !== undefined && (
              <span
                className="text-xs px-1.5 py-0.5 rounded-full font-semibold"
                style={
                  active
                    ? { background: "var(--primary)", color: "var(--primary-foreground)" }
                    : { background: "var(--secondary)", color: "var(--secondary-foreground)" }
                }
              >
                {badgeCount}
              </span>
            )}
          </button>
        );
      })}

      <div className="mt-auto px-1 transition-all duration-500 ease-in-out">
        {/* score card */}
        <div
          className="rounded-xl p-3.5 mb-2"
          style={{
            background: "linear-gradient(135deg,#4f46e5,#7c3aed)",
            boxShadow: "0 4px 14px rgba(79,70,229,0.3)",
          }}
        >
          <div className="flex items-center gap-2 mb-2">
            <Sparkles size={13} color="rgba(255,255,255,0.8)" />
            <span className="text-xs text-indigo-100 font-medium">Health Score</span>
          </div>
          <div className="text-2xl font-bold text-white">{score} / 100</div>
          <div className="text-xs text-indigo-200 mt-0.5">
            {healthText} — {issues.length} issue{issues.length !== 1 ? "s" : ""}
          </div>
          <div className="w-full h-1.5 rounded-full bg-white/20 mt-2">
            <div
              className="h-1.5 rounded-full bg-white/80 transition-all"
              style={{ width: `${score}%` }}
            />
          </div>
        </div>

        {/* last scan */}
        <div className="rounded-xl p-3 border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 text-xs transition-colors duration-300">
          <div className="text-slate-400 dark:text-slate-500 mb-1">{t(lang, "Last cleaned")}</div>
          <div className="font-semibold text-slate-700 dark:text-slate-200">
            {t(lang, "Belum ada")}
          </div>
          <div className="text-slate-400 dark:text-slate-500">0 GB {t(lang, "freed")}</div>
        </div>
      </div>
    </aside>
  );
}

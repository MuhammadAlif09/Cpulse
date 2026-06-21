import React, { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { PackageX, Clock, TrendingUp, Search } from "lucide-react";
import { useTranslation } from "react-i18next";

const C = {
  indigo: "#4f46e5",
  emerald: "#10b981",
  rose: "#f43f5e",
  amber: "#f59e0b",
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

function PillBadge({ label, color }: { label: string; color: string }) {
  const { t } = useTranslation();
  const map: Record<string, string> = {
    High: "bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-900/40",
    Medium:
      "bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-900/40",
    Low: "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/40",
  };
  return (
    <span
      className={cn(
        "text-xs px-2.5 py-0.5 rounded-full font-medium",
        map[label] ?? "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
      )}
    >
      {t(label)}
    </span>
  );
}

function Toggle({ on, onChange }: { on: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      className={cn(
        "relative w-11 h-6 rounded-full transition-all duration-300 flex-shrink-0 cursor-pointer",
        on ? "bg-indigo-600" : "bg-slate-200 dark:bg-slate-800"
      )}
    >
      <span
        className="absolute top-1 w-4 h-4 rounded-full bg-white dark:bg-slate-100 shadow-sm transition-all duration-300"
        style={{ left: on ? "calc(100% - 20px)" : "4px" }}
      />
    </button>
  );
}

interface StartupItem {
  name: string;
  command: string;
  enabled: boolean;
  registry_path: string;
  is_hkcu: boolean;
  impact?: string;
  delay?: number;
  publisher?: string;
  icon?: string;
}

function getIconForApp(name: string, publisher: string): string {
  const nameLower = name.toLowerCase();
  const pubLower = publisher.toLowerCase();
  if (nameLower.includes("discord")) return "💬";
  if (nameLower.includes("spotify")) return "🎵";
  if (nameLower.includes("steam")) return "🎮";
  if (nameLower.includes("onedrive") || nameLower.includes("skydrive")) return "☁️";
  if (nameLower.includes("teams") || nameLower.includes("skype") || nameLower.includes("zoom"))
    return "👥";
  if (pubLower.includes("google") || nameLower.includes("chrome")) return "🌐";
  if (
    pubLower.includes("microsoft") ||
    pubLower.includes("windows") ||
    nameLower.includes("explorer")
  )
    return "🪟";
  if (
    pubLower.includes("adobe") ||
    nameLower.includes("photoshop") ||
    nameLower.includes("creative cloud")
  )
    return "🎨";
  if (nameLower.includes("nvidia") || nameLower.includes("radeon") || nameLower.includes("intel"))
    return "⚙️";
  return "⚡";
}

const isTauri =
  typeof window !== "undefined" &&
  ((window as any).__TAURI_IPC__ !== undefined ||
    (window as any).process?.env?.NODE_ENV === "test");

export function StartupTab() {
  const { t } = useTranslation();
  const [items, setItems] = useState<StartupItem[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (isTauri) {
      invoke<StartupItem[]>("get_startup_items")
        .then((res) => {
          const enriched = res.map((item) => ({
            ...item,
            icon: getIconForApp(item.name, item.publisher || ""),
          }));
          setItems(enriched);
        })
        .catch(console.error);
    }
  }, []);

  const toggle = async (name: string, is_hkcu: boolean, current_enabled: boolean) => {
    try {
      await invoke("toggle_startup_item", { name, isHkcu: is_hkcu, enable: !current_enabled });
      setItems((prev) =>
        prev.map((item) => (item.name === name ? { ...item, enabled: !item.enabled } : item))
      );
    } catch (e) {
      console.error("Failed to toggle:", e);
      alert("Failed to toggle: " + e);
    }
  };

  const filtered = items.filter(
    (i) =>
      i.name.toLowerCase().includes(search.toLowerCase()) ||
      (i.publisher && i.publisher.toLowerCase().includes(search.toLowerCase()))
  );

  const disabledCount = items.filter((i) => !i.enabled).length;
  const timeSaved = items
    .filter((i) => !i.enabled)
    .reduce((s, i) => s + (i.delay || 0), 0)
    .toFixed(1);
  const bootTime = (
    items.filter((i) => i.enabled).reduce((s, i) => s + (i.delay || 0), 0) + 8
  ).toFixed(1);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-4">
        {[
          {
            icon: <Clock size={18} />,
            label: "Est. Boot Time",
            value: `${bootTime}s`,
            sub: "With enabled items",
            color: C.indigo,
          },
          {
            icon: <TrendingUp size={18} />,
            label: "Time Saved",
            value: `${timeSaved}s`,
            sub: `${disabledCount} ${t("items disabled")}`,
            color: C.emerald,
          },
          {
            icon: <PackageX size={18} />,
            label: "High Impact",
            value: `${items.filter((i) => i.impact === "High" && i.enabled).length}`,
            sub: "Items still enabled",
            color: C.rose,
          },
        ].map((s) => (
          <GradientCard
            key={s.label}
            style={{
              background: `linear-gradient(135deg, ${s.color}10, ${s.color}04)`,
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
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                {t(s.label)}
              </span>
            </div>
            <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">{s.value}</div>
            <div className="text-xs text-slate-400 dark:text-slate-550 mt-0.5">{t(s.sub)}</div>
          </GradientCard>
        ))}
      </div>

      <GradientCard>
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40">
            <Search size={14} className="text-slate-400 dark:text-slate-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("Search programs...")}
              className="flex-1 text-sm bg-transparent outline-none text-slate-700 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500"
            />
          </div>
          <button
            onClick={() => setItems((prev) => prev.map((i) => ({ ...i, enabled: false })))}
            className="px-4 py-2 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-850 text-slate-600 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-850 transition whitespace-nowrap cursor-pointer"
          >
            {t("Disable All High Impact")}
          </button>
        </div>

        <div className="space-y-2">
          {filtered.map((item) => (
            <div
              key={item.name}
              className={cn(
                "flex items-center gap-4 p-3.5 rounded-xl border transition-all duration-200",
                item.enabled
                  ? "bg-card border-border hover:bg-slate-50/50 dark:hover:bg-slate-850/50"
                  : "bg-slate-50/40 dark:bg-slate-900/30 border-slate-100 dark:border-slate-800/40 hover:bg-slate-50/70 dark:hover:bg-slate-850/70"
              )}
            >
              <span className="text-2xl">{item.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-slate-850 dark:text-slate-200">
                  {item.name}
                </div>
                <div
                  className="text-xs text-slate-400 dark:text-slate-550 truncate"
                  title={item.command}
                >
                  {item.publisher} · {t("Boot delay:")} +{item.delay?.toFixed(1)}s
                </div>
              </div>
              <PillBadge label={item.impact || "Low"} color="" />
              <Toggle
                on={item.enabled}
                onChange={() => toggle(item.name, item.is_hkcu, item.enabled)}
              />
            </div>
          ))}
        </div>
      </GradientCard>
    </div>
  );
}

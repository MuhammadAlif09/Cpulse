import React, { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { PackageX, Clock, TrendingUp, Search, Plus, Trash2, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { addHistoryLog } from "../utils/history";
import { StatCard } from "../components/ui/StatCard";

// Teal-based palette
const P = {
  teal: "#0d9488",
  amber: "#f59e0b",
  rose: "#f43f5e",
  sky: "#0ea5e9",
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

function PillBadge({ label }: { label: string }) {
  const { t } = useTranslation();
  let color = P.slate;
  let bg = "var(--secondary)";

  if (label === "High") {
    color = P.rose;
    bg = `color-mix(in srgb, ${P.rose} 15%, transparent)`;
  } else if (label === "Medium") {
    color = P.amber;
    bg = `color-mix(in srgb, ${P.amber} 15%, transparent)`;
  } else if (label === "Low") {
    color = P.teal;
    bg = `color-mix(in srgb, ${P.teal} 15%, transparent)`;
  }

  return (
    <span
      className="text-[10px] px-2.5 py-1 rounded-md font-bold uppercase tracking-wider border"
      style={{
        background: bg,
        color: color,
        borderColor: `color-mix(in srgb, ${color} 30%, transparent)`,
      }}
    >
      {t(label)}
    </span>
  );
}

function Toggle({ on, onChange }: { on: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      className="relative w-11 h-6 rounded-full transition-all duration-300 flex-shrink-0 cursor-pointer border"
      style={{
        background: on ? P.teal : "var(--secondary)",
        borderColor: on ? "transparent" : "var(--border)",
      }}
    >
      <span
        className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-all duration-300"
        style={{ left: on ? "calc(100% - 19px)" : "3px" }}
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
  if (nameLower.includes("teams") || nameLower.includes("skype") || nameLower.includes("zoom")) return "👥";
  if (pubLower.includes("google") || nameLower.includes("chrome")) return "🌐";
  if (pubLower.includes("microsoft") || pubLower.includes("windows") || nameLower.includes("explorer")) return "🪟";
  if (pubLower.includes("adobe") || nameLower.includes("photoshop") || nameLower.includes("creative cloud")) return "🎨";
  if (nameLower.includes("nvidia") || nameLower.includes("radeon") || nameLower.includes("intel")) return "⚙️";
  return "⚡";
}

const isTauri =
  typeof window !== "undefined" &&
  ((window as any).__TAURI_INTERNALS__ !== undefined ||
    (window as any).__TAURI_IPC__ !== undefined ||
    (window as any).process?.env?.NODE_ENV === "test");

export function StartupTab() {
  const { t } = useTranslation();
  const [items, setItems] = useState<StartupItem[]>([]);
  const [search, setSearch] = useState("");
  const [newName, setNewName] = useState("");
  const [newPath, setNewPath] = useState("");
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (isTauri) {
      invoke<StartupItem[]>("get_startup_items")
        .then((res) => {
          const enriched = res.map((item) => ({ ...item, icon: getIconForApp(item.name, item.publisher || "") }));
          setItems(enriched);
        })
        .catch(console.error);
    }
  }, []);

  const toggle = async (name: string, is_hkcu: boolean, current_enabled: boolean) => {
    try {
      await invoke("toggle_startup_item", { name, isHkcu: is_hkcu, enable: !current_enabled });
      setItems((prev) => prev.map((item) => (item.name === name ? { ...item, enabled: !item.enabled } : item)));
      addHistoryLog({ type: "Startup Toggled", freed: "N/A", fixed: 1, duration: "0.0s", details: !current_enabled ? `Enabled:${name}` : `Disabled:${name}` });
    } catch (e) {
      console.error("Failed to toggle:", e);
    }
  };

  const handleDisableAllHighImpact = async () => {
    const highImpactEnabled = items.filter((i) => i.impact === "High" && i.enabled);
    if (highImpactEnabled.length === 0) return;
    const startTime = Date.now();
    try {
      for (const item of highImpactEnabled) {
        await invoke("toggle_startup_item", { name: item.name, isHkcu: item.is_hkcu, enable: false });
      }
      setItems((prev) => prev.map((item) => (item.impact === "High" ? { ...item, enabled: false } : item)));
      const duration = ((Date.now() - startTime) / 1000).toFixed(1) + "s";
      addHistoryLog({ type: "Startup Optimizer", freed: "N/A", fixed: highImpactEnabled.length, duration, details: `DisabledHighImpact:${highImpactEnabled.length}` });
    } catch (e) {
      console.error("Failed to disable high impact:", e);
    }
  };

  const refreshItems = async () => {
    const res = await invoke<StartupItem[]>("get_startup_items");
    const enriched = res.map((item) => ({ ...item, icon: getIconForApp(item.name, item.publisher || "") }));
    setItems(enriched);
  };

  const handleDelete = async (name: string, is_hkcu: boolean) => {
    if (!confirm(t("Are you sure you want to delete this startup item?"))) return;
    try {
      await invoke("delete_startup_item", { name, isHkcu: is_hkcu });
      setItems((prev) => prev.filter((item) => item.name !== name));
      addHistoryLog({ type: "Startup Deleted", freed: "N/A", fixed: 1, duration: "0.0s", details: `Deleted:${name}` });
    } catch (e) {
      console.error("Failed to delete startup item:", e);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newPath.trim()) return;
    setAdding(true);
    try {
      await invoke("add_startup_item", { name: newName.trim(), path: newPath.trim(), isHkcu: true });
      addHistoryLog({ type: "Startup Added", freed: "N/A", fixed: 1, duration: "0.0s", details: `Added:${newName.trim()}` });
      setNewName("");
      setNewPath("");
      await refreshItems();
    } catch (e) {
      console.error("Failed to add startup item:", e);
    } finally {
      setAdding(false);
    }
  };

  const filtered = items.filter(
    (i) => i.name.toLowerCase().includes(search.toLowerCase()) || (i.publisher && i.publisher.toLowerCase().includes(search.toLowerCase()))
  );

  const disabledCount = items.filter((i) => !i.enabled).length;
  const timeSaved = items.filter((i) => !i.enabled).reduce((s, i) => s + (i.delay || 0), 0).toFixed(1);
  const bootTime = (items.filter((i) => i.enabled).reduce((s, i) => s + (i.delay || 0), 0) + 8).toFixed(1);

  return (
    <div className="space-y-4">
      {/* ── Stats ────────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          icon={<Clock size={15} />}
          label={t("Est. Boot Time")}
          value={`${bootTime}s`}
          sub={t("With enabled items")}
          color={P.sky}
        />
        <StatCard
          icon={<TrendingUp size={15} />}
          label={t("Time Saved")}
          value={`${timeSaved}s`}
          sub={`${disabledCount} ${t("items disabled")}`}
          color={P.teal}
        />
        <StatCard
          icon={<PackageX size={15} />}
          label={t("High Impact")}
          value={`${items.filter((i) => i.impact === "High" && i.enabled).length}`}
          sub={t("Items still enabled")}
          color={P.rose}
        />
      </div>

      <form onSubmit={handleAdd} className="grid grid-cols-1 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.4fr)_auto] gap-3 rounded-2xl border border-border/60 bg-card p-4 shadow-sm">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder={t("Program name")}
          className="min-w-0 rounded-xl border border-border bg-secondary/40 px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-teal-500"
        />
        <input
          value={newPath}
          onChange={(e) => setNewPath(e.target.value)}
          placeholder={t("Executable path")}
          className="min-w-0 rounded-xl border border-border bg-secondary/40 px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-teal-500"
        />
        <button
          type="submit"
          disabled={adding || !newName.trim() || !newPath.trim()}
          className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold text-white shadow-sm transition-all hover:-translate-y-0.5 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
          style={{ background: P.teal }}
        >
          {adding ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
          {adding ? t("Adding...") : t("Add Startup Item")}
        </button>
      </form>

      {/* ── Manager ────────────────────────────────────────────────────────── */}
      <Card className="p-0 overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 border-b border-border bg-card">
          <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-xl bg-secondary/50 border border-border">
            <Search size={14} className="text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("Search programs...")}
              className="flex-1 text-sm bg-transparent outline-none text-foreground placeholder-muted-foreground"
            />
          </div>
          <button
            onClick={handleDisableAllHighImpact}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-white transition-all hover:-translate-y-0.5 active:scale-95 shadow-sm whitespace-nowrap cursor-pointer"
            style={{ background: P.teal }}
          >
            {t("Disable All High Impact")}
          </button>
        </div>

        <div className="divide-y divide-border">
          {filtered.length > 0 ? (
            filtered.map((item) => (
              <div
                key={item.name}
                className={cn(
                  "flex items-center gap-4 p-4 transition-colors duration-200",
                  item.enabled ? "bg-card hover:bg-secondary/30" : "bg-secondary/20 hover:bg-secondary/50 opacity-80"
                )}
              >
                <span className="text-2xl w-8 text-center" style={{ filter: !item.enabled ? "grayscale(100%)" : "none" }}>{item.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className={cn("text-sm font-semibold truncate", item.enabled ? "text-foreground" : "text-muted-foreground line-through decoration-muted-foreground/30")}>
                    {item.name}
                  </div>
                  <div className="text-[11px] text-muted-foreground truncate mt-0.5" title={item.command}>
                    {item.publisher} <span className="mx-1.5 opacity-50">•</span> {t("Boot delay:")} +{item.delay?.toFixed(1)}s
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <PillBadge label={item.impact || "Low"} />
                  <Toggle on={item.enabled} onChange={() => toggle(item.name, item.is_hkcu, item.enabled)} />
                  <button
                    onClick={() => handleDelete(item.name, item.is_hkcu)}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground transition-all hover:-translate-y-0.5 hover:border-rose-400 hover:text-rose-500 active:scale-95"
                    title={t("Delete startup item")}
                    aria-label={t("Delete startup item")}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="py-10 text-center text-sm text-muted-foreground">
              {t("No startup items found")}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

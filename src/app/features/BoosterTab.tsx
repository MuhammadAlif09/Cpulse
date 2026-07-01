import React, { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  MemoryStick,
  Cpu,
  Globe,
  Monitor,
  Zap,
  HardDrive,
  Activity,
  Thermometer,
  Check,
  RefreshCw,
  Lock,
  Clock,
  RotateCcw,
  Rocket,
  Gamepad2,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { addHistoryLog } from "../utils/history";
import { motion } from "motion/react";

// Teal-based palette
const P = {
  teal: "#0d9488",
  amber: "#f59e0b",
  rose: "#f43f5e",
  sky: "#0ea5e9",
  violet: "#8b5cf6",
  slate: "#64748b",
  good: "#10b981",
  cyan: "#06b6d4",
  pink: "#ec4899",
  emerald: "#10b981",
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

export function BoosterTab({ isAdmin }: { isAdmin: boolean }) {
  const { t } = useTranslation();
  const [boosted, setBoosted] = useState<Record<string, boolean>>({});
  const [boosting, setBoosting] = useState<string | null>(null);
  const [mode, setMode] = useState<"balanced" | "performance" | "gaming">("balanced");

  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      ((window as any).__TAURI_INTERNALS__ !== undefined ||
        (window as any).__TAURI_IPC__ !== undefined)
    ) {
      invoke("set_power_plan", { plan: mode }).catch(console.error);
    }
  }, [mode]);

  const BOOSTS = [
    { id: "ram", icon: <MemoryStick size={16} />, title: "RAM Optimizer", desc: "Flush standby list and free unused memory pages", gain: "+1.4 GB freed", color: P.teal, category: "Memory", adminRequired: false },
    { id: "cpu", icon: <Cpu size={16} />, title: "CPU Priority Manager", desc: "Elevate priority for active foreground processes", gain: "~12% snappier", color: P.teal, category: "Processor", adminRequired: true },
    { id: "net", icon: <Globe size={16} />, title: "Network Tweaker", desc: "Optimize TCP/IP stack, DNS cache & buffer sizes", gain: "−18ms latency", color: P.teal, category: "Network", adminRequired: true },
    { id: "dns", icon: <Globe size={16} />, title: "DNS Cache Flusher", desc: "Flush DNS resolver cache to optimize network connection and reduce latency", gain: "Cleared cache", color: P.teal, category: "Network", adminRequired: false },
    { id: "visual", icon: <Monitor size={16} />, title: "Visual Effects Trim", desc: "Turn off non-essential animations and transparency", gain: "+6% GPU free", color: P.teal, category: "Graphics", adminRequired: false },
    { id: "power", icon: <Zap size={16} />, title: "High Performance Mode", desc: "Switch Windows power plan to maximum performance", gain: "Max clock speed", color: P.teal, category: "Power", adminRequired: false },
    { id: "disk", icon: <HardDrive size={16} />, title: "Disk I/O Optimizer", desc: "TRIM SSD, optimize prefetch and SuperFetch settings", gain: "−22% I/O wait", color: P.teal, category: "Storage", adminRequired: true },
    { id: "game", icon: <Activity size={16} />, title: "Game Mode Enhancer", desc: "Redirect resources to foreground game processes", gain: "Smoother FPS", color: P.teal, category: "Gaming", adminRequired: false },
    { id: "temp", icon: <Thermometer size={16} />, title: "Thermal Manager", desc: "Optimize fan curves and thermal throttle limits", gain: "−4°C average", color: P.teal, category: "Cooling", adminRequired: false },
    { id: "startup_delay", icon: <Clock size={16} />, title: "Startup Delay Speedup", desc: "Disable Windows startup app launch delay for faster booting", gain: "−2s boot wait", color: P.teal, category: "Boot", adminRequired: false },
  ];

  const applyBoost = async (id: string) => {
    setBoosting(id);
    try {
      const msg = await invoke<string>("apply_boost", { id, profile: mode });
      setBoosted((prev) => ({ ...prev, [id]: true }));
      toast.success(t(msg));
      const booster = BOOSTS.find((b) => b.id === id);
      if (booster) {
        addHistoryLog({ type: "Booster Applied", freed: booster.gain, fixed: 1, duration: "0.0s", details: `Applied:${booster.title}` });
      }
    } catch (e: any) {
      toast.error(t(e.message || e));
    }
    setBoosting(null);
  };

  const restoreBoost = async (id: string) => {
    setBoosting(id);
    try {
      const msg = await invoke<string>("restore_boost", { id });
      setBoosted((prev) => ({ ...prev, [id]: false }));
      toast.success(t(msg));
      const booster = BOOSTS.find((b) => b.id === id);
      if (booster) {
        addHistoryLog({ type: "Booster Restored", freed: "N/A", fixed: 1, duration: "0.0s", details: `Restored:${booster.title}` });
      }
    } catch (e: any) {
      toast.error(t(e.message || e));
    }
    setBoosting(null);
  };

  const applyAll = () => {
    BOOSTS.filter((b) => !boosted[b.id] && (!b.adminRequired || isAdmin)).forEach((b, i) => {
      setTimeout(() => applyBoost(b.id), i * 250);
    });
  };

  const doneCount = BOOSTS.filter((b) => boosted[b.id]).length;
  const totalAvailable = BOOSTS.filter((b) => !b.adminRequired || isAdmin).length;
  const scoreBoost = Math.round((doneCount / BOOSTS.length) * 28);

  return (
    <div className="space-y-4">
      <Card
        style={{
          background: `linear-gradient(145deg, var(--card) 40%, color-mix(in srgb, ${P.teal} 5%, transparent))`,
          borderColor: `color-mix(in srgb, ${P.teal} 20%, var(--border))`,
        }}
      >
        <div className="flex items-center justify-between flex-wrap gap-4 mb-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Zap size={16} style={{ color: P.teal }} />
              <h3 className="text-base font-semibold text-foreground tracking-tight">
                {t("Optimization Profile")}
              </h3>
            </div>
            <p className="text-xs text-muted-foreground">
              {t("Choose how aggressively to optimize your system")}
            </p>
          </div>
          <div className="flex gap-1 p-1 rounded-lg bg-secondary border border-border">
            {(["balanced", "performance", "gaming"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className="px-4 py-1.5 rounded-md text-[11px] font-bold transition-all capitalize cursor-pointer tracking-wide flex items-center gap-1.5"
                style={
                  mode === m
                    ? { background: "var(--card)", color: P.teal, boxShadow: "0 1px 3px rgba(0,0,0,0.1)" }
                    : { color: "var(--muted-foreground)" }
                }
              >
                {m === "balanced" ? <Zap size={13} className={mode === m ? "text-teal-600 dark:text-teal-400" : "text-muted-foreground/60"} /> : m === "performance" ? <Rocket size={13} className={mode === m ? "text-teal-600 dark:text-teal-400" : "text-muted-foreground/60"} /> : <Gamepad2 size={13} className={mode === m ? "text-teal-600 dark:text-teal-400" : "text-muted-foreground/60"} />}
                {t(m.charAt(0).toUpperCase() + m.slice(1))}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-4 bg-secondary/30 p-3 rounded-xl border border-border/50">
          <div className="flex-1 h-2 rounded-full bg-secondary overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${(doneCount / BOOSTS.length) * 100}%`, background: P.teal, boxShadow: `0 0 8px ${P.teal}` }}
            />
          </div>
          <div className="text-right flex-shrink-0 min-w-[60px]">
            <span className="text-sm font-bold text-foreground tabular-nums">{doneCount}/{BOOSTS.length}</span>
            <span className="text-[10px] uppercase font-bold text-muted-foreground ml-1 tracking-wider">{t("Applied")}</span>
          </div>
          {doneCount < totalAvailable ? (
            <button
              onClick={applyAll}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-[11px] font-bold text-white uppercase tracking-wider transition-all hover:-translate-y-0.5 active:scale-95 shadow-sm cursor-pointer"
              style={{ background: P.teal }}
            >
              <Zap size={14} /> {t("Apply All")}
            </button>
          ) : (
            <div
              className="flex items-center gap-1.5 text-emerald-500 text-[11px] uppercase tracking-wider font-bold px-3 py-1.5 rounded-lg"
              style={{
                background: "color-mix(in srgb, #10b981 12%, transparent)",
                border: "1px solid color-mix(in srgb, #10b981 25%, transparent)",
                boxShadow: "0 0 25px -5px rgba(16, 185, 129, 0.4)",
              }}
            >
              <motion.svg
                className="w-3.5 h-3.5 stroke-emerald-500"
                viewBox="0 0 24 24"
                fill="none"
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
              >
                <polyline points="20 6 9 17 4 12" />
              </motion.svg>{" "}
              +{scoreBoost} {t("pts")}
            </div>
          )}
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {BOOSTS.map((b) => {
          const done = boosted[b.id];
          const loading = boosting === b.id;
          const locked = b.adminRequired && !isAdmin;

          return (
            <div
              key={b.id}
              className="p-4 rounded-xl border bg-card/80 backdrop-blur-sm transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5"
              style={{
                borderColor: done ? `color-mix(in srgb, ${b.color} 30%, transparent)` : "var(--border)",
                boxShadow: done ? `0 0 16px -4px color-mix(in srgb, ${b.color} 15%, transparent)` : "none",
              }}
            >
              <div className="flex gap-4">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all"
                  style={{
                    background: locked ? `color-mix(in srgb, ${P.rose} 15%, transparent)` : done ? `color-mix(in srgb, ${b.color} 15%, transparent)` : "var(--secondary)",
                    color: locked ? P.rose : done ? b.color : "var(--muted-foreground)",
                  }}
                >
                  {locked ? (
                    <Lock size={18} />
                  ) : done ? (
                    <motion.div
                      initial={{ scale: 0.6, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: "spring", stiffness: 400, damping: 18 }}
                    >
                      <Check size={20} strokeWidth={3} />
                    </motion.div>
                  ) : (
                    b.icon
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="text-[13px] font-semibold text-foreground truncate max-w-[160px]">
                      {t(b.title)}
                    </h4>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-sm bg-secondary text-muted-foreground uppercase tracking-widest flex-shrink-0">
                      {t(b.category)}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mb-3 leading-snug line-clamp-2">
                    {t(b.desc)}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold" style={{ color: locked ? P.rose : b.color }}>
                      {locked ? t("Requires Admin Privileges") : t(b.gain)}
                    </span>
                    {locked ? (
                      <div className="text-[10px] px-2 py-1 rounded-md font-bold uppercase tracking-wider flex items-center gap-1 bg-destructive/10 text-destructive border border-destructive/20">
                        <Lock size={10} /> {t("Locked")}
                      </div>
                    ) : !done ? (
                      <button
                        onClick={() => applyBoost(b.id)}
                        disabled={loading}
                        className="text-[11px] px-3 py-1.5 rounded-md font-bold uppercase tracking-wider transition-all hover:opacity-80 disabled:opacity-50 cursor-pointer"
                        style={{ background: `color-mix(in srgb, ${b.color} 15%, transparent)`, color: b.color }}
                      >
                        {loading ? <RefreshCw size={12} className="animate-spin" /> : t("Apply")}
                      </button>
                    ) : (
                      <button
                        onClick={() => restoreBoost(b.id)}
                        disabled={loading}
                        className="text-[11px] px-3 py-1.5 rounded-md font-bold uppercase tracking-wider transition-all disabled:opacity-50 flex items-center gap-1 bg-secondary text-muted-foreground hover:bg-secondary/80 border border-border cursor-pointer"
                      >
                        {loading ? <RefreshCw size={12} className="animate-spin" /> : <><RotateCcw size={10} /> {t("Restore")}</>}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

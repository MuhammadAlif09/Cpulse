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
  CheckCircle2,
  RefreshCw,
  Lock,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { addHistoryLog } from "../utils/history";

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

export function BoosterTab({ isAdmin }: { isAdmin: boolean }) {
  const { t } = useTranslation();
  const [boosted, setBoosted] = useState<Record<string, boolean>>({});
  const [boosting, setBoosting] = useState<string | null>(null);
  const [mode, setMode] = useState<"balanced" | "performance" | "gaming">("balanced");

  useEffect(() => {
    if (typeof window !== "undefined" && (window as any).__TAURI_IPC__) {
      invoke("set_power_plan", { plan: mode }).catch(console.error);
    }
  }, [mode]);

  const BOOSTS = [
    {
      id: "ram",
      icon: <MemoryStick size={18} />,
      title: "RAM Optimizer",
      desc: "Flush standby list and free unused memory pages",
      gain: "+1.4 GB freed",
      color: C.violet,
      category: "Memory",
      adminRequired: false,
    },
    {
      id: "cpu",
      icon: <Cpu size={18} />,
      title: "CPU Priority Manager",
      desc: "Elevate priority for active foreground processes",
      gain: "~12% snappier",
      color: C.indigo,
      category: "Processor",
      adminRequired: true,
    },
    {
      id: "net",
      icon: <Globe size={18} />,
      title: "Network Tweaker",
      desc: "Optimize TCP/IP stack, DNS cache & buffer sizes",
      gain: "−18ms latency",
      color: C.cyan,
      category: "Network",
      adminRequired: true,
    },
    {
      id: "visual",
      icon: <Monitor size={18} />,
      title: "Visual Effects Trim",
      desc: "Turn off non-essential animations and transparency",
      gain: "+6% GPU free",
      color: C.amber,
      category: "Graphics",
      adminRequired: false,
    },
    {
      id: "power",
      icon: <Zap size={18} />,
      title: "High Performance Mode",
      desc: "Switch Windows power plan to maximum performance",
      gain: "Max clock speed",
      color: C.rose,
      category: "Power",
      adminRequired: false,
    },
    {
      id: "disk",
      icon: <HardDrive size={18} />,
      title: "Disk I/O Optimizer",
      desc: "TRIM SSD, optimize prefetch and SuperFetch settings",
      gain: "−22% I/O wait",
      color: C.emerald,
      category: "Storage",
      adminRequired: true,
    },
    {
      id: "game",
      icon: <Activity size={18} />,
      title: "Game Mode Enhancer",
      desc: "Redirect resources to foreground game processes",
      gain: "Smoother FPS",
      color: C.pink,
      category: "Gaming",
      adminRequired: false,
    },
    {
      id: "temp",
      icon: <Thermometer size={18} />,
      title: "Thermal Manager",
      desc: "Optimize fan curves and thermal throttle limits",
      gain: "−4°C average",
      color: C.amber,
      category: "Cooling",
      adminRequired: false,
    },
  ];

  const applyBoost = async (id: string) => {
    setBoosting(id);
    try {
      const msg = await invoke<string>("apply_boost", { id, profile: mode });
      setBoosted((prev) => ({ ...prev, [id]: true }));
      toast.success(t(msg));
      const booster = BOOSTS.find((b) => b.id === id);
      if (booster) {
        addHistoryLog({
          type: "Booster Applied",
          freed: booster.gain,
          fixed: 1,
          duration: "0.0s",
          details: t("Applied {{name}}", { name: t(booster.title) }),
        });
      }
    } catch (e: any) {
      console.error(e);
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
        addHistoryLog({
          type: "Booster Restored",
          freed: "N/A",
          fixed: 1,
          duration: "0.0s",
          details: t("Restored {{name}}", { name: t(booster.title) }),
        });
      }
    } catch (e: any) {
      console.error(e);
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
    <div className="space-y-5">
      <GradientCard className="bg-gradient-to-br from-indigo-50/50 to-violet-50/50 dark:from-slate-900/40 dark:to-indigo-950/20">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100">
              {t("Optimization Profile")}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {t("Choose how aggressively to optimize your system")}
            </p>
          </div>
          <div className="flex gap-2 p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80">
            {(["balanced", "performance", "gaming"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={cn(
                  "px-4 py-1.5 rounded-lg text-xs font-semibold transition-all capitalize cursor-pointer",
                  mode === m
                    ? "bg-white dark:bg-card text-indigo-600 dark:text-indigo-400 shadow-sm"
                    : "text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
                )}
                style={mode === m ? { boxShadow: "0 1px 4px rgba(0,0,0,0.1)" } : undefined}
              >
                {m === "balanced"
                  ? `⚖️ ${t("Balanced")}`
                  : m === "performance"
                    ? `🚀 ${t("Performance")}`
                    : `🎮 ${t("Gaming")}`}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 flex items-center gap-4">
          <div className="flex-1 h-3 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
            <div
              className="h-3 rounded-full transition-all duration-700"
              style={{
                width: `${(doneCount / BOOSTS.length) * 100}%`,
                background: "linear-gradient(90deg,#4f46e5,#7c3aed)",
              }}
            />
          </div>
          <div className="text-right flex-shrink-0">
            <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
              {doneCount}/{BOOSTS.length}
            </span>
            <span className="text-xs text-slate-400 dark:text-slate-500 ml-1">{t("applied")}</span>
          </div>
          {doneCount < totalAvailable ? (
            <button
              onClick={applyAll}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white flex-shrink-0 transition-all hover:shadow-lg hover:-translate-y-0.5 active:scale-95 cursor-pointer"
              style={{
                background: "linear-gradient(135deg,#4f46e5,#7c3aed)",
                boxShadow: "0 4px 14px rgba(79,70,229,0.35)",
              }}
            >
              <Zap size={14} /> {t("Apply All")}
            </button>
          ) : (
            <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 text-sm font-semibold px-3">
              <CheckCircle2 size={16} /> +{scoreBoost} {t("pts")}
            </div>
          )}
        </div>
      </GradientCard>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {BOOSTS.map((b) => {
          const done = boosted[b.id];
          const loading = boosting === b.id;
          const locked = b.adminRequired && !isAdmin;

          return (
            <GradientCard key={b.id}>
              <div className="flex gap-4">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all"
                  style={{
                    background: locked
                      ? "rgba(244,63,94,0.12)"
                      : done
                        ? `${b.color}20`
                        : "var(--border)",
                    color: locked ? C.rose : done ? b.color : "var(--secondary-foreground)",
                  }}
                >
                  {locked ? <Lock size={18} /> : done ? <CheckCircle2 size={20} /> : b.icon}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                      {t(b.title)}
                    </h4>
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                      {t(b.category)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-3 leading-relaxed">
                    {t(b.desc)}
                  </p>
                  <div className="flex items-center justify-between">
                    <span
                      className="text-xs font-semibold"
                      style={{ color: locked ? C.rose : b.color }}
                    >
                      {locked ? t("Requires Admin Privileges") : t(b.gain)}
                    </span>
                    {locked ? (
                      <div className="text-xs px-3 py-1.5 rounded-lg font-medium flex items-center gap-1 bg-red-50 dark:bg-red-950/20 text-rose-600 dark:text-rose-400 border border-red-100 dark:border-red-900/40">
                        <Lock size={12} /> {t("Locked")}
                      </div>
                    ) : !done ? (
                      <button
                        onClick={() => applyBoost(b.id)}
                        disabled={loading}
                        className="text-xs px-4 py-1.5 rounded-lg font-medium transition-all hover:shadow-sm disabled:opacity-50 cursor-pointer"
                        style={{
                          background: `${b.color}20`,
                          color: b.color,
                          border: `1px solid ${b.color}35`,
                        }}
                      >
                        {loading ? <RefreshCw size={12} className="animate-spin" /> : t("Apply")}
                      </button>
                    ) : (
                      <button
                        onClick={() => restoreBoost(b.id)}
                        disabled={loading}
                        className="text-xs px-4 py-1.5 rounded-lg font-medium transition-all hover:shadow-sm disabled:opacity-50 flex items-center gap-1 bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/40 cursor-pointer"
                      >
                        {loading ? (
                          <RefreshCw size={12} className="animate-spin" />
                        ) : (
                          <>
                            <CheckCircle2 size={12} /> {t("Restore")}
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </GradientCard>
          );
        })}
      </div>
    </div>
  );
}

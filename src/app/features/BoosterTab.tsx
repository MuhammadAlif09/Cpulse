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
} from "lucide-react";
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
        "rounded-2xl p-5 border border-white/60 shadow-sm relative overflow-hidden",
        className
      )}
      style={{
        background: gradient ?? "#ffffff",
        boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)",
        ...style,
      }}
    >
      {children}
    </div>
  );
}

export function BoosterTab() {
  const { t } = useTranslation();
  const [boosted, setBoosted] = useState<Record<string, boolean>>({});
  const [boosting, setBoosting] = useState<string | null>(null);
  const [mode, setMode] = useState<"balanced" | "performance" | "gaming">("balanced");

  useEffect(() => {
    invoke("set_power_plan", { plan: mode }).catch(console.error);
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
    },
    {
      id: "cpu",
      icon: <Cpu size={18} />,
      title: "CPU Priority Manager",
      desc: "Elevate priority for active foreground processes",
      gain: "~12% snappier",
      color: C.indigo,
      category: "Processor",
    },
    {
      id: "net",
      icon: <Globe size={18} />,
      title: "Network Tweaker",
      desc: "Optimize TCP/IP stack, DNS cache & buffer sizes",
      gain: "−18ms latency",
      color: C.cyan,
      category: "Network",
    },
    {
      id: "visual",
      icon: <Monitor size={18} />,
      title: "Visual Effects Trim",
      desc: "Turn off non-essential animations and transparency",
      gain: "+6% GPU free",
      color: C.amber,
      category: "Graphics",
    },
    {
      id: "power",
      icon: <Zap size={18} />,
      title: "High Performance Mode",
      desc: "Switch Windows power plan to maximum performance",
      gain: "Max clock speed",
      color: C.rose,
      category: "Power",
    },
    {
      id: "disk",
      icon: <HardDrive size={18} />,
      title: "Disk I/O Optimizer",
      desc: "TRIM SSD, optimize prefetch and SuperFetch settings",
      gain: "−22% I/O wait",
      color: C.emerald,
      category: "Storage",
    },
    {
      id: "game",
      icon: <Activity size={18} />,
      title: "Game Mode Enhancer",
      desc: "Redirect resources to foreground game processes",
      gain: "Smoother FPS",
      color: C.pink,
      category: "Gaming",
    },
    {
      id: "temp",
      icon: <Thermometer size={18} />,
      title: "Thermal Manager",
      desc: "Optimize fan curves and thermal throttle limits",
      gain: "−4°C average",
      color: C.amber,
      category: "Cooling",
    },
  ];

  const applyBoost = async (id: string) => {
    setBoosting(id);
    try {
      await invoke("apply_boost", { id, profile: mode });
      setBoosted((prev) => ({ ...prev, [id]: true }));
    } catch (e) {
      console.error(e);
    }
    setBoosting(null);
  };

  const applyAll = () => {
    BOOSTS.filter((b) => !boosted[b.id]).forEach((b, i) => {
      setTimeout(() => applyBoost(b.id), i * 250);
    });
  };

  const doneCount = BOOSTS.filter((b) => boosted[b.id]).length;
  const scoreBoost = Math.round((doneCount / BOOSTS.length) * 28);

  return (
    <div className="space-y-5">
      <GradientCard gradient="linear-gradient(135deg,#f8faff,#f0f4ff)">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h3 className="text-base font-semibold text-slate-800">{t("Optimization Profile")}</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {t("Choose how aggressively to optimize your system")}
            </p>
          </div>
          <div className="flex gap-2 p-1 rounded-xl bg-slate-100">
            {(["balanced", "performance", "gaming"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className="px-4 py-1.5 rounded-lg text-xs font-semibold transition-all capitalize"
                style={
                  mode === m
                    ? {
                        background: "white",
                        color: C.indigo,
                        boxShadow: "0 1px 4px rgba(0,0,0,0.1)",
                      }
                    : { color: "#64748b" }
                }
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
          <div className="flex-1 h-3 rounded-full bg-slate-100 overflow-hidden">
            <div
              className="h-3 rounded-full transition-all duration-700"
              style={{
                width: `${(doneCount / BOOSTS.length) * 100}%`,
                background: "linear-gradient(90deg,#4f46e5,#7c3aed)",
              }}
            />
          </div>
          <div className="text-right flex-shrink-0">
            <span className="text-sm font-bold text-slate-700">
              {doneCount}/{BOOSTS.length}
            </span>
            <span className="text-xs text-slate-400 ml-1">{t("applied")}</span>
          </div>
          {doneCount < BOOSTS.length ? (
            <button
              onClick={applyAll}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white flex-shrink-0 transition-all hover:shadow-lg hover:-translate-y-0.5 active:scale-95"
              style={{
                background: "linear-gradient(135deg,#4f46e5,#7c3aed)",
                boxShadow: "0 4px 14px rgba(79,70,229,0.35)",
              }}
            >
              <Zap size={14} /> {t("Apply All")}
            </button>
          ) : (
            <div className="flex items-center gap-1.5 text-emerald-600 text-sm font-semibold px-3">
              <CheckCircle2 size={16} /> +{scoreBoost} {t("pts")}
            </div>
          )}
        </div>
      </GradientCard>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {BOOSTS.map((b) => {
          const done = boosted[b.id];
          const loading = boosting === b.id;
          return (
            <GradientCard key={b.id}>
              <div className="flex gap-4">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all"
                  style={{
                    background: done ? `${b.color}15` : "#f1f5f9",
                    color: done ? b.color : "#64748b",
                  }}
                >
                  {done ? <CheckCircle2 size={20} /> : b.icon}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="text-sm font-semibold text-slate-800">{t(b.title)}</h4>
                    <span className="text-[10px] font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-500 uppercase tracking-wide">
                      {t(b.category)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mb-3 leading-relaxed">{t(b.desc)}</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold" style={{ color: b.color }}>
                      {t(b.gain)}
                    </span>
                    {!done ? (
                      <button
                        onClick={() => applyBoost(b.id)}
                        disabled={loading}
                        className="text-xs px-4 py-1.5 rounded-lg font-medium transition-all hover:shadow-sm disabled:opacity-50"
                        style={{
                          background: `${b.color}15`,
                          color: b.color,
                          border: `1px solid ${b.color}25`,
                        }}
                      >
                        {loading ? <RefreshCw size={12} className="animate-spin" /> : t("Apply")}
                      </button>
                    ) : (
                      <span className="text-xs font-medium text-emerald-600 flex items-center gap-1">
                        <CheckCircle2 size={12} /> {t("applied")}
                      </span>
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

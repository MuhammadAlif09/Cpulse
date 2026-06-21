import React, { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Lock, Eye, EyeOff, RefreshCw, CheckCircle2 } from "lucide-react";
import { useTranslation } from "react-i18next";
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

const isTauri =
  typeof window !== "undefined" &&
  ((window as any).__TAURI_IPC__ !== undefined ||
    (window as any).process?.env?.NODE_ENV === "test");

export function PrivacyTab({
  privacySwept,
  setPrivacySwept,
}: {
  privacySwept: boolean;
  setPrivacySwept: (v: boolean) => void;
}) {
  const { t } = useTranslation();
  const [scanResult, setScanResult] = useState<any>(null);
  const [scanning, setScanning] = useState(true);
  const [sweeping, setSweeping] = useState(false);
  const [selected, setSelected] = useState<Record<string, boolean>>({
    chrome_hist: true,
    edge_hist: true,
    recent_files: true,
    clipboard: true,
    search_hist: true,
    wifi_pass: true,
    cookies: true,
    run_hist: true,
  });

  const runScan = async () => {
    setScanning(true);
    try {
      const result = await invoke("scan_privacy");
      setScanResult(result);
    } catch (e) {
      console.error("Scan failed:", e);
    } finally {
      setScanning(false);
    }
  };

  useEffect(() => {
    if (isTauri) {
      runScan();
    } else {
      setScanning(false);
    }
  }, []);

  const toggle = (id: string) => setSelected((prev) => ({ ...prev, [id]: !prev[id] }));

  const doSweep = async () => {
    setSweeping(true);
    const startTime = Date.now();
    try {
      const selectedItems = Object.keys(selected).filter((k) => selected[k]);
      await invoke("sweep_privacy", { items: selectedItems });
      setPrivacySwept(true);

      // Calculate total trace items swept
      let tracesCount = 0;
      selectedItems.forEach((key) => {
        if (scanResult && scanResult[key]) {
          tracesCount += scanResult[key].count || 0;
        }
      });

      const duration = ((Date.now() - startTime) / 1000).toFixed(1) + "s";

      addHistoryLog({
        type: "Privacy Sweep",
        freed: "0.0 GB",
        fixed: tracesCount,
        duration,
      });

      await runScan();
    } catch (e) {
      console.error("Sweep failed:", e);
    } finally {
      setSweeping(false);
    }
  };

  const selectedCount = Object.keys(selected).filter((k) => selected[k]).length;

  const items = [
    {
      id: "chrome_hist",
      label: "Chrome Browsing History",
      desc: scanResult?.chrome_hist?.desc || "No Chrome history found",
      found: scanResult?.chrome_hist?.found || false,
      color: C.indigo,
    },
    {
      id: "edge_hist",
      label: "Edge Browsing History",
      desc: scanResult?.edge_hist?.desc || "No Edge history found",
      found: scanResult?.edge_hist?.found || false,
      color: C.violet,
    },
    {
      id: "recent_files",
      label: "Recent Files List",
      desc: scanResult?.recent_files?.desc || "No recent entries",
      found: scanResult?.recent_files?.found || false,
      color: C.amber,
    },
    {
      id: "clipboard",
      label: "Clipboard History",
      desc: scanResult?.clipboard?.desc || "Clipboard history",
      found: scanResult?.clipboard?.found || false,
      color: C.rose,
    },
    {
      id: "search_hist",
      label: "Windows Search History",
      desc: scanResult?.search_hist?.desc || "No search terms found",
      found: scanResult?.search_hist?.found || false,
      color: C.pink,
    },
    {
      id: "wifi_pass",
      label: "Saved Wi-Fi Passwords",
      desc: scanResult?.wifi_pass?.desc || "No saved networks",
      found: scanResult?.wifi_pass?.found || false,
      color: C.emerald,
    },
    {
      id: "cookies",
      label: "Tracking Cookies",
      desc: scanResult?.cookies?.desc || "No tracking cookies found",
      found: scanResult?.cookies?.found || false,
      color: C.cyan,
    },
    {
      id: "run_hist",
      label: "Run Dialog History",
      desc: scanResult?.run_hist?.desc || "No run command entries",
      found: scanResult?.run_hist?.found || false,
      color: C.slate,
    },
  ];

  return (
    <div className="space-y-5">
      <GradientCard className="bg-gradient-to-br from-rose-50/50 to-pink-50/50 dark:from-rose-950/20 dark:to-pink-950/10">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Lock size={18} style={{ color: C.rose }} />
              <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100">
                {t("Privacy Scanner")}
              </h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t(
                "Finds browsing history, search traces, saved passwords, and tracking data left on your PC"
              )}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={runScan}
              disabled={scanning || sweeping}
              className="flex items-center justify-center w-10 h-10 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-750 transition active:scale-95 disabled:opacity-50 cursor-pointer"
              title={t("Scan Again")}
            >
              <RefreshCw size={15} className={cn(scanning && "animate-spin")} />
            </button>
            {!privacySwept ? (
              <button
                onClick={doSweep}
                disabled={sweeping || scanning || selectedCount === 0}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:shadow-lg hover:-translate-y-0.5 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                style={{
                  background: sweeping
                    ? "var(--border)"
                    : "linear-gradient(135deg,#f43f5e,#ec4899)",
                  boxShadow: sweeping ? "none" : "0 4px 14px rgba(244,63,94,0.35)",
                }}
              >
                {sweeping ? (
                  <>
                    <RefreshCw size={15} className="animate-spin" /> {t("Sweeping...")}
                  </>
                ) : (
                  <>
                    <RefreshCw size={15} /> {t("Sweep Items")}
                  </>
                )}
              </button>
            ) : (
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-emerald-700 dark:text-emerald-455 bg-emerald-50 dark:bg-emerald-950/30">
                <EyeOff size={16} /> {t("Privacy Cleared!")}
              </div>
            )}
          </div>
        </div>
      </GradientCard>

      <GradientCard>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            {t("Privacy Traces Found")}
          </h3>
          <span className="text-xs text-slate-400 dark:text-slate-500">
            {selectedCount} {t("selected for removal")}
          </span>
        </div>
        <div className="space-y-2">
          {scanning ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400 dark:text-slate-500">
              <RefreshCw size={24} className="animate-spin mb-2 opacity-50" />
              <span className="text-xs">{t("Scanning for privacy traces...")}</span>
            </div>
          ) : (
            items.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-4 p-3.5 rounded-xl border transition-all"
                style={{
                  background: selected[item.id] ? `${item.color}12` : "var(--card)",
                  borderColor: selected[item.id] ? `${item.color}50` : "var(--border)",
                }}
              >
                <div
                  className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ background: item.found ? item.color : "var(--border)" }}
                />
                <div className="flex-1">
                  <div className="text-sm font-medium text-slate-700 dark:text-slate-200">
                    {t(item.label)}
                  </div>
                  <div className="text-xs text-slate-400 dark:text-slate-500">{t(item.desc)}</div>
                </div>
                {item.found && (
                  <span
                    className="text-xs px-2 py-0.5 rounded-full font-medium animate-pulse-subtle"
                    style={{ background: `${item.color}20`, color: item.color }}
                  >
                    {t("Found")}
                  </span>
                )}
                <Toggle on={selected[item.id]} onChange={() => toggle(item.id)} />
              </div>
            ))
          )}
        </div>
      </GradientCard>

      <GradientCard>
        <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">
          {t("Privacy Protection Tips")}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            {
              icon: "🔒",
              tip: "Enable BitLocker encryption on your drive for full data protection.",
            },
            {
              icon: "🌐",
              tip: "Use a private DNS (like Cloudflare 1.1.1.1) to prevent ISP tracking.",
            },
            { icon: "🍪", tip: "Clear cookies weekly to remove cross-site tracking data." },
            {
              icon: "📵",
              tip: "Review app permissions — revoke access to camera and mic you don't need.",
            },
          ].map((x) => (
            <div
              key={x.tip}
              className="flex gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/50"
            >
              <span className="text-lg">{x.icon}</span>
              <p className="text-xs text-slate-600 dark:text-slate-350">{t(x.tip)}</p>
            </div>
          ))}
        </div>
      </GradientCard>
    </div>
  );
}

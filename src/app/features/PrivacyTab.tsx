import React, { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import {
  Lock,
  EyeOff,
  RefreshCw,
  AlertTriangle,
  ShieldCheck,
  Check,
  Globe,
  Chrome,
  FolderOpen,
  Clipboard,
  Search,
  Wifi,
  Cookie,
  Terminal,
  Fingerprint,
  Trash2,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { addHistoryLog } from "../utils/history";
import { motion, AnimatePresence } from "motion/react";

import { P } from "../../design/tokens";
import { cn } from "../components/ui/utils";
import { isTauri } from "../utils/tauri";

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
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
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
    setErrorMsg(null);
    try {
      const result = await invoke("scan_privacy");
      setScanResult(result);
    } catch (e: any) {
      console.error("Scan failed:", e);
      setErrorMsg(typeof e === "string" ? e : e?.message || "Privacy scan failed");
    } finally {
      setScanning(false);
    }
  };

  useEffect(() => {
    if (isTauri) runScan();
    else setScanning(false);
  }, []);

  const toggle = (id: string) => setSelected((prev) => ({ ...prev, [id]: !prev[id] }));

  const doSweep = async () => {
    setSweeping(true);
    setErrorMsg(null);
    const t0 = Date.now();
    try {
      const selectedItems = Object.keys(selected).filter((k) => selected[k]);
      await invoke("sweep_privacy", { items: selectedItems });
      setPrivacySwept(true);

      let tracesCount = 0;
      selectedItems.forEach((key) => {
        if (scanResult && scanResult[key]) tracesCount += scanResult[key].count || 0;
      });

      addHistoryLog({
        type: "Privacy Sweep",
        freed: "0.0 GB",
        fixed: tracesCount,
        duration: ((Date.now() - t0) / 1000).toFixed(1) + "s",
      });
      await runScan();
    } catch (e: any) {
      console.error("Sweep failed:", e);
      setErrorMsg(typeof e === "string" ? e : e?.message || "Privacy sweep failed");
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
      count: scanResult?.chrome_hist?.count || 0,
      color: P.teal,
      icon: <Chrome size={15} />,
    },
    {
      id: "edge_hist",
      label: "Edge Browsing History",
      desc: scanResult?.edge_hist?.desc || "No Edge history found",
      found: scanResult?.edge_hist?.found || false,
      count: scanResult?.edge_hist?.count || 0,
      color: P.teal,
      icon: <Globe size={15} />,
    },
    {
      id: "recent_files",
      label: "Recent Files List",
      desc: scanResult?.recent_files?.desc || "No recent entries",
      found: scanResult?.recent_files?.found || false,
      count: scanResult?.recent_files?.count || 0,
      color: P.teal,
      icon: <FolderOpen size={15} />,
    },
    {
      id: "clipboard",
      label: "Clipboard History",
      desc: scanResult?.clipboard?.desc || "Clipboard history",
      found: scanResult?.clipboard?.found || false,
      count: scanResult?.clipboard?.count || 0,
      color: P.teal,
      icon: <Clipboard size={15} />,
    },
    {
      id: "search_hist",
      label: "Windows Search History",
      desc: scanResult?.search_hist?.desc || "No search terms found",
      found: scanResult?.search_hist?.found || false,
      count: scanResult?.search_hist?.count || 0,
      color: P.teal,
      icon: <Search size={15} />,
    },
    {
      id: "wifi_pass",
      label: "Saved Wi-Fi Passwords",
      desc: scanResult?.wifi_pass?.desc || "No saved networks",
      found: scanResult?.wifi_pass?.found || false,
      count: scanResult?.wifi_pass?.count || 0,
      color: P.teal,
      icon: <Wifi size={15} />,
    },
    {
      id: "cookies",
      label: "Tracking Cookies",
      desc: scanResult?.cookies?.desc || "No tracking cookies found",
      found: scanResult?.cookies?.found || false,
      count: scanResult?.cookies?.count || 0,
      color: P.teal,
      icon: <Cookie size={15} />,
    },
    {
      id: "run_hist",
      label: "Run Dialog History",
      desc: scanResult?.run_hist?.desc || "No run command entries",
      found: scanResult?.run_hist?.found || false,
      count: scanResult?.run_hist?.count || 0,
      color: P.teal,
      icon: <Terminal size={15} />,
    },
  ];

  const tips = [
    {
      icon: <Lock size={14} />,
      tip: "Enable BitLocker encryption on your drive for full data protection.",
    },
    {
      icon: <Globe size={14} />,
      tip: "Use a private DNS (like Cloudflare 1.1.1.1) to prevent ISP tracking.",
    },
    {
      icon: <AlertTriangle size={14} />,
      tip: "Clear cookies weekly to remove cross-site tracking data.",
    },
    {
      icon: <EyeOff size={14} />,
      tip: "Review app permissions — revoke access to camera and mic you don't need.",
    },
  ];

  return (
    <div className="space-y-4">
      {/* ── Scanner Header ──────────────────────────────────────────────────── */}
      <div className="rounded-2xl p-5 bg-card border border-border relative overflow-hidden transition-all duration-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div className="flex items-start gap-3">
            {/* Privacy icon */}
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all"
              style={{
                background: `${P.teal}18`,
                color: P.teal,
                border: `1px solid ${P.teal}35`,
              }}
            >
              {scanning ? (
                <RefreshCw size={18} className="animate-spin" />
              ) : (
                <Fingerprint size={18} />
              )}
            </div>
            <div>
              <h3 className="text-base font-semibold text-foreground tracking-tight">
                {t("Privacy Scanner")}
              </h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {t(
                  "Finds browsing history, search traces, saved passwords, and tracking data left on your PC"
                )}
              </p>
              {/* Scan status line */}
              {scanning && (
                <div className="flex items-center gap-2 mt-2">
                  <div className="w-16 h-1 rounded-full bg-background overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: "60%", backgroundColor: P.teal }}
                    />
                  </div>
                  <span className="text-[10px] text-muted-foreground font-medium">
                    {t("Scanning...")}
                  </span>
                </div>
              )}
              {!scanning && scanResult && !privacySwept && (
                <div className="flex items-center gap-1.5 mt-1.5">
                  <span
                    className="text-[10px] font-bold px-1.5 py-0.5 rounded-md border"
                    style={{
                      color: items.filter((i) => i.found).length > 0 ? P.warn : P.good,
                      backgroundColor:
                        items.filter((i) => i.found).length > 0 ? `${P.warn}15` : `${P.good}15`,
                      borderColor:
                        items.filter((i) => i.found).length > 0 ? `${P.warn}30` : `${P.good}30`,
                    }}
                  >
                    {items.filter((i) => i.found).length} {t("traces found")}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={runScan}
              disabled={scanning || sweeping}
              className="flex items-center justify-center w-10 h-10 rounded-xl bg-background border border-border text-foreground hover:bg-secondary transition active:scale-95 disabled:opacity-50 cursor-pointer"
              title={t("Scan Again")}
            >
              <RefreshCw
                size={15}
                className={cn(scanning && "animate-spin text-muted-foreground")}
              />
            </button>
            {!privacySwept ? (
              <button
                onClick={doSweep}
                disabled={sweeping || scanning || selectedCount === 0}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all hover:-translate-y-0.5 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none cursor-pointer"
                style={{
                  background: sweeping || scanning || selectedCount === 0 ? "var(--border)" : P.teal,
                  color:
                    sweeping || scanning || selectedCount === 0
                      ? "var(--muted-foreground)"
                      : P.bg,
                }}
              >
                {sweeping ? (
                  <>
                    <RefreshCw size={15} className="animate-spin" /> {t("Sweeping...")}
                  </>
                ) : (
                  <>
                    <Trash2 size={15} /> {t("Sweep Items")}
                  </>
                )}
              </button>
            ) : (
              <div
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold"
                style={{
                  color: P.good,
                  background: `color-mix(in srgb, ${P.good} 12%, transparent)`,
                  border: `1px solid color-mix(in srgb, ${P.good} 30%, transparent)`,
                }}
              >
                <motion.svg
                  className="w-4 h-4"
                  style={{ stroke: P.good }}
                  viewBox="0 0 24 24"
                  fill="none"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                >
                  <polyline points="20 6 9 17 4 12" />
                </motion.svg>{" "}
                {t("Privacy Cleared!")}
              </div>
            )}
          </div>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3.5 rounded-xl bg-destructive/10 border border-destructive/20 text-xs text-destructive flex items-center gap-2">
          <AlertTriangle size={15} className="shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* ── Trace Grid (Bento) ────────────────────────────────────────────── */}
      <div className="rounded-2xl bg-card border border-border overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="text-sm font-semibold text-foreground">{t("Privacy Traces Found")}</h3>
          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
            {selectedCount} {t("selected")}
          </span>
        </div>

        {scanning ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <div className="relative w-16 h-16 mb-4 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-2 border-border" />
              <div className="absolute inset-2 rounded-full border border-border" />
              <Fingerprint size={20} style={{ color: P.teal }} />
            </div>
            <span className="text-sm font-medium">{t("Scanning for privacy traces...")}</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4">
            {items.map((item) => {
              const isActive = selected[item.id];
              return (
                <button
                  key={item.id}
                  onClick={() => toggle(item.id)}
                  className="text-left p-3.5 rounded-xl border transition-all duration-200 cursor-pointer select-none group"
                  style={{
                    background: isActive
                      ? `color-mix(in srgb, ${P.teal} 8%, var(--card))`
                      : "var(--background)",
                    borderColor: isActive
                      ? `color-mix(in srgb, ${P.teal} 35%, var(--border))`
                      : "var(--border)",
                  }}
                >
                  <div className="flex items-start gap-3">
                    {/* Neutralized Icon chip container */}
                    <div
                      className="w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0 text-muted-foreground bg-card border border-border transition-all group-hover:text-foreground"
                      title={item.label}
                      style={isActive ? { color: P.teal } : undefined}
                    >
                      {item.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[13px] font-semibold text-foreground truncate">
                          {t(item.label)}
                        </span>
                        {item.found && item.count > 0 && (
                          <span
                            className="text-[9px] font-bold px-1.5 py-0.5 rounded-sm flex-shrink-0 tabular-nums border"
                            style={{
                              color: P.warn,
                              backgroundColor: `${P.warn}15`,
                              borderColor: `${P.warn}30`,
                            }}
                          >
                            {item.count.toLocaleString()}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                        {t(item.desc)}
                      </p>
                    </div>
                    {/* Consistent Solid Accent Checkbox */}
                    <div
                      className="w-4.5 h-4.5 rounded flex items-center justify-center flex-shrink-0 mt-0.5 transition-all duration-200"
                      style={{
                        border: isActive ? "none" : "1px solid var(--border)",
                        background: isActive ? P.teal : "transparent",
                      }}
                    >
                      <AnimatePresence>
                        {isActive && (
                          <motion.div
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0, opacity: 0 }}
                            transition={{ type: "spring", stiffness: 400, damping: 20 }}
                          >
                            <Check
                              size={11}
                              color={P.bg}
                              strokeWidth={4}
                            />
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Tips ────────────────────────────────────────────────────────────── */}
      <div className="rounded-2xl bg-card border border-border p-5">
        <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
          <ShieldCheck size={16} className="text-muted-foreground" />
          {t("Privacy Protection Tips")}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3">
          {tips.map((x, i) => (
            <div key={i} className="flex gap-3 py-2 cursor-default group">
              <span className="w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0 bg-background text-muted-foreground border border-border group-hover:text-foreground transition-all duration-200">
                {x.icon}
              </span>
              <p className="text-[11px] text-muted-foreground leading-relaxed pt-1">{t(x.tip)}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

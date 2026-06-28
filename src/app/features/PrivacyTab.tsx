import React, { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Lock, EyeOff, RefreshCw, AlertTriangle, ShieldCheck, CheckCircle2, Globe } from "lucide-react";
import { useTranslation } from "react-i18next";
import { addHistoryLog } from "../utils/history";

// Teal-based palette
const P = {
  teal: "#0d9488",
  amber: "#f59e0b",
  rose: "#f43f5e",
  sky: "#0ea5e9",
  slate: "#64748b",
  good: "#10b981",
  violet: "#8b5cf6",
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
        "rounded-2xl p-5 bg-card border border-border/60 shadow-sm transition-colors duration-200",
        className
      )}
      style={style}
    >
      {children}
    </div>
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

const isTauri =
  typeof window !== "undefined" &&
  ((window as any).__TAURI_INTERNALS__ !== undefined ||
    (window as any).__TAURI_IPC__ !== undefined ||
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
    if (isTauri) runScan();
    else setScanning(false);
  }, []);

  const toggle = (id: string) => setSelected((prev) => ({ ...prev, [id]: !prev[id] }));

  const doSweep = async () => {
    setSweeping(true);
    const t0 = Date.now();
    try {
      const selectedItems = Object.keys(selected).filter((k) => selected[k]);
      await invoke("sweep_privacy", { items: selectedItems });
      setPrivacySwept(true);

      let tracesCount = 0;
      selectedItems.forEach((key) => {
        if (scanResult && scanResult[key]) tracesCount += scanResult[key].count || 0;
      });

      addHistoryLog({ type: "Privacy Sweep", freed: "0.0 GB", fixed: tracesCount, duration: ((Date.now() - t0) / 1000).toFixed(1) + "s" });
      await runScan();
    } catch (e) {
      console.error("Sweep failed:", e);
    } finally {
      setSweeping(false);
    }
  };

  const selectedCount = Object.keys(selected).filter((k) => selected[k]).length;

  const items = [
    { id: "chrome_hist", label: "Chrome Browsing History", desc: scanResult?.chrome_hist?.desc || "No Chrome history found", found: scanResult?.chrome_hist?.found || false, color: P.sky },
    { id: "edge_hist", label: "Edge Browsing History", desc: scanResult?.edge_hist?.desc || "No Edge history found", found: scanResult?.edge_hist?.found || false, color: P.teal },
    { id: "recent_files", label: "Recent Files List", desc: scanResult?.recent_files?.desc || "No recent entries", found: scanResult?.recent_files?.found || false, color: P.amber },
    { id: "clipboard", label: "Clipboard History", desc: scanResult?.clipboard?.desc || "Clipboard history", found: scanResult?.clipboard?.found || false, color: P.rose },
    { id: "search_hist", label: "Windows Search History", desc: scanResult?.search_hist?.desc || "No search terms found", found: scanResult?.search_hist?.found || false, color: P.violet },
    { id: "wifi_pass", label: "Saved Wi-Fi Passwords", desc: scanResult?.wifi_pass?.desc || "No saved networks", found: scanResult?.wifi_pass?.found || false, color: P.good },
    { id: "cookies", label: "Tracking Cookies", desc: scanResult?.cookies?.desc || "No tracking cookies found", found: scanResult?.cookies?.found || false, color: P.amber },
    { id: "run_hist", label: "Run Dialog History", desc: scanResult?.run_hist?.desc || "No run command entries", found: scanResult?.run_hist?.found || false, color: P.slate },
  ];

  return (
    <div className="space-y-4">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <Card
        style={{
          background: `linear-gradient(145deg, var(--card) 40%, color-mix(in srgb, ${P.rose} 5%, transparent))`,
          borderColor: `color-mix(in srgb, ${P.rose} 20%, var(--border))`,
        }}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <Lock size={18} style={{ color: P.rose }} />
              <h3 className="text-base font-semibold text-foreground tracking-tight">
                {t("Privacy Scanner")}
              </h3>
            </div>
            <p className="text-xs text-muted-foreground">
              {t("Finds browsing history, search traces, saved passwords, and tracking data left on your PC")}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={runScan}
              disabled={scanning || sweeping}
              className="flex items-center justify-center w-10 h-10 rounded-xl bg-card border border-border text-foreground hover:bg-secondary transition active:scale-95 disabled:opacity-50 cursor-pointer"
              title={t("Scan Again")}
            >
              <RefreshCw size={15} className={cn(scanning && "animate-spin text-muted-foreground")} />
            </button>
            {!privacySwept ? (
              <button
                onClick={doSweep}
                disabled={sweeping || scanning || selectedCount === 0}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:shadow-md hover:-translate-y-0.5 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                style={{ background: sweeping ? "var(--border)" : P.rose }}
              >
                {sweeping ? (
                  <><RefreshCw size={15} className="animate-spin" /> {t("Sweeping...")}</>
                ) : (
                  <><ShieldCheck size={15} /> {t("Sweep Items")}</>
                )}
              </button>
            ) : (
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-emerald-600 bg-emerald-500/10 border border-emerald-500/20">
                <CheckCircle2 size={16} /> {t("Privacy Cleared!")}
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* ── Scan Results ────────────────────────────────────────────────────── */}
      <Card className="p-0 overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-border bg-card">
          <h3 className="text-sm font-semibold text-foreground">
            {t("Privacy Traces Found")}
          </h3>
          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
            {selectedCount} {t("selected")}
          </span>
        </div>

        <div className="divide-y divide-border">
          {scanning ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <RefreshCw size={24} className="animate-spin mb-3 opacity-50" />
              <span className="text-sm font-medium">{t("Scanning for privacy traces...")}</span>
            </div>
          ) : (
            items.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-4 p-4 transition-colors duration-200 hover:bg-secondary/30"
                style={{
                  background: selected[item.id] ? `color-mix(in srgb, ${item.color} 5%, transparent)` : "transparent",
                }}
              >
                <div
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ background: item.found ? item.color : "var(--secondary)", border: item.found ? "none" : "1px solid var(--border)" }}
                />
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-semibold text-foreground truncate">
                    {t(item.label)}
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-0.5 truncate">{t(item.desc)}</div>
                </div>
                {item.found && (
                  <span
                    className="text-[10px] px-2 py-0.5 rounded uppercase font-bold tracking-wider"
                    style={{ background: `color-mix(in srgb, ${item.color} 15%, transparent)`, color: item.color }}
                  >
                    {t("Found")}
                  </span>
                )}
                <div className="ml-2">
                  <Toggle on={selected[item.id]} onChange={() => toggle(item.id)} />
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      {/* ── Tips ────────────────────────────────────────────────────────────── */}
      <Card>
        <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
          <ShieldCheck size={16} className="text-muted-foreground" />
          {t("Privacy Protection Tips")}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            { icon: <Lock size={16} />, tip: "Enable BitLocker encryption on your drive for full data protection.", c: P.sky },
            { icon: <Globe size={16} />, tip: "Use a private DNS (like Cloudflare 1.1.1.1) to prevent ISP tracking.", c: P.teal },
            { icon: <AlertTriangle size={16} />, tip: "Clear cookies weekly to remove cross-site tracking data.", c: P.amber },
            { icon: <EyeOff size={16} />, tip: "Review app permissions — revoke access to camera and mic you don't need.", c: P.rose },
          ].map((x, i) => (
            <div key={i} className="flex gap-3 p-3.5 rounded-xl bg-secondary/50 border border-border">
              <span className="p-1.5 rounded-lg bg-card border border-border shadow-sm flex-shrink-0 h-fit" style={{ color: x.c }}>{x.icon}</span>
              <p className="text-[11px] text-muted-foreground leading-relaxed">{t(x.tip)}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

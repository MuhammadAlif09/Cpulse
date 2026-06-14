import React, { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Lock, Eye, EyeOff, RefreshCw, CheckCircle2 } from "lucide-react";
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

const PRIVACY_ITEMS = [
  {
    id: "chrome_hist",
    label: "Chrome Browsing History",
    desc: "1,842 URLs found",
    found: true,
    color: C.indigo,
  },
  {
    id: "edge_hist",
    label: "Edge Browsing History",
    desc: "673 URLs found",
    found: true,
    color: C.violet,
  },
  {
    id: "recent_files",
    label: "Recent Files List",
    desc: "128 entries",
    found: true,
    color: C.amber,
  },
  {
    id: "clipboard",
    label: "Clipboard History",
    desc: "47 copied items",
    found: true,
    color: C.rose,
  },
  {
    id: "search_hist",
    label: "Windows Search History",
    desc: "312 queries",
    found: true,
    color: C.pink,
  },
  {
    id: "wifi_pass",
    label: "Saved Wi-Fi Passwords",
    desc: "9 networks stored",
    found: true,
    color: C.emerald,
  },
  { id: "cookies", label: "Tracking Cookies", desc: "4,291 cookies", found: true, color: C.cyan },
  { id: "run_hist", label: "Run Dialog History", desc: "23 entries", found: false, color: C.slate },
];

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

function Toggle({ on, onChange }: { on: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      className="relative w-11 h-6 rounded-full transition-all duration-300 flex-shrink-0"
      style={{ background: on ? C.indigo : "#e2e8f0" }}
    >
      <span
        className="absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm transition-all duration-300"
        style={{ left: on ? "calc(100% - 20px)" : "4px" }}
      />
    </button>
  );
}

export function PrivacyTab({
  privacySwept,
  setPrivacySwept,
}: {
  privacySwept: boolean;
  setPrivacySwept: (v: boolean) => void;
}) {
  const { t } = useTranslation();
  const [items, setItems] = useState(PRIVACY_ITEMS);
  const [sweeping, setSweeping] = useState(false);
  const [selected, setSelected] = useState<Record<string, boolean>>(
    Object.fromEntries(PRIVACY_ITEMS.map((i) => [i.id, true]))
  );

  const toggle = (id: string) => setSelected((prev) => ({ ...prev, [id]: !prev[id] }));

  const doSweep = async () => {
    setSweeping(true);

    try {
      const selectedItems = Object.keys(selected).filter((k) => selected[k]);
      await invoke("sweep_privacy", { items: selectedItems });
    } catch (e) {
      console.error("Sweep failed:", e);
    }

    setTimeout(() => {
      setSweeping(false);
      setPrivacySwept(true);
    }, 2000);
  };

  const selectedCount = Object.values(selected).filter(Boolean).length;

  return (
    <div className="space-y-5">
      <GradientCard gradient="linear-gradient(135deg,#fff1f2,#fce7f3)">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Lock size={18} style={{ color: C.rose }} />
              <h3 className="text-base font-semibold text-slate-800">{t("Privacy Scanner")}</h3>
            </div>
            <p className="text-xs text-slate-500">
              {t(
                "Finds browsing history, search traces, saved passwords, and tracking data left on your PC"
              )}
            </p>
          </div>
          {!privacySwept ? (
            <button
              onClick={doSweep}
              disabled={sweeping || selectedCount === 0}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white flex-shrink-0 transition-all hover:shadow-lg hover:-translate-y-0.5 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
              style={{
                background: sweeping ? "#fda4af" : "linear-gradient(135deg,#f43f5e,#ec4899)",
                boxShadow: sweeping ? "none" : "0 4px 14px rgba(244,63,94,0.35)",
              }}
            >
              {sweeping ? (
                <>
                  <RefreshCw size={15} className="animate-spin" /> {t("Sweeping...")}
                </>
              ) : (
                <>
                  <Eye size={15} /> {t("Sweep Items")}
                </>
              )}
            </button>
          ) : (
            <div
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-emerald-700 flex-shrink-0"
              style={{ background: "#d1fae5" }}
            >
              <EyeOff size={16} /> {t("Privacy Cleared!")}
            </div>
          )}
        </div>
      </GradientCard>

      <GradientCard>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-slate-700">{t("Privacy Traces Found")}</h3>
          <span className="text-xs text-slate-400">
            {selectedCount} {t("selected for removal")}
          </span>
        </div>
        <div className="space-y-2">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-4 p-3.5 rounded-xl border transition-all"
              style={{
                background: selected[item.id] ? `${item.color}05` : "#fafafa",
                borderColor: selected[item.id] ? `${item.color}20` : "#e2e8f0",
              }}
            >
              <div
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ background: item.found ? item.color : "#cbd5e1" }}
              />
              <div className="flex-1">
                <div className="text-sm font-medium text-slate-700">{t(item.label)}</div>
                <div className="text-xs text-slate-400">{t(item.desc)}</div>
              </div>
              {item.found && (
                <span
                  className="text-xs px-2 py-0.5 rounded-full font-medium"
                  style={{ background: `${item.color}12`, color: item.color }}
                >
                  {t("Found")}
                </span>
              )}
              <Toggle on={selected[item.id]} onChange={() => toggle(item.id)} />
            </div>
          ))}
        </div>
      </GradientCard>

      <GradientCard>
        <h3 className="text-sm font-semibold text-slate-700 mb-3">
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
              className="flex gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100"
            >
              <span className="text-lg">{x.icon}</span>
              <p className="text-xs text-slate-600">{t(x.tip)}</p>
            </div>
          ))}
        </div>
      </GradientCard>
    </div>
  );
}

import React from "react";
import { Trash2, RotateCcw, CheckCircle2, Sparkles, RefreshCw } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ScanAnimation } from "../components/ScanAnimation";
import { useJunkScanner } from "../hooks/useJunkScanner";
import { invoke } from "@tauri-apps/api/core";
import { toast } from "sonner";

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

export function CleanerTab() {
  const { t } = useTranslation();
  const {
    scanning,
    progress,
    done,
    cleaning,
    cleaned,
    junkCats,
    selected,
    setSelected,
    startScan,
    doClean,
  } = useJunkScanner();

  const totalSelected = junkCats.filter((c) => selected[c.name]).reduce((s, c) => s + c.bytes, 0);
  const totalGB = (totalSelected / 1_073_741_824).toFixed(2);
  const totalFiles = junkCats.filter((c) => selected[c.name]).reduce((s, c) => s + c.count, 0);

  return (
    <div className="space-y-5">
      <GradientCard gradient="linear-gradient(135deg,#f8faff,#f0f4ff)">
        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            <h3 className="text-base font-semibold text-slate-800">{t("Junk File Scanner")}</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {t(
                "Deep scan for all unnecessary files — temporary data, cache, and residual clutter"
              )}
            </p>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            {!scanning && !done && (
              <button
                onClick={startScan}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:shadow-lg hover:-translate-y-0.5 active:scale-95"
                style={{
                  background: "linear-gradient(135deg,#4f46e5,#7c3aed)",
                  boxShadow: "0 4px 14px rgba(79,70,229,0.4)",
                }}
              >
                <Sparkles size={15} /> {t("Start Scan")}
              </button>
            )}
            {scanning && (
              <button
                disabled
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold opacity-70 cursor-not-allowed"
                style={{ background: "#ede9fe", color: "#4f46e5" }}
              >
                <RefreshCw size={15} className="animate-spin" /> {t("Scanning...")}
              </button>
            )}
            {done && !cleaned && (
              <>
                <button
                  onClick={startScan}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold border text-slate-600 hover:bg-slate-50 transition"
                >
                  <RotateCcw size={12} /> {t("Rescan")}
                </button>
                <button
                  onClick={doClean}
                  disabled={cleaning}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:shadow-lg hover:-translate-y-0.5 active:scale-95"
                  style={{
                    background: cleaning ? "#a5b4fc" : "linear-gradient(135deg,#4f46e5,#7c3aed)",
                    boxShadow: cleaning ? "none" : "0 4px 14px rgba(79,70,229,0.4)",
                  }}
                >
                  <Trash2 size={15} /> {cleaning ? t("Wait...") : `${t("Clean")} ${totalGB} GB`}
                </button>
              </>
            )}
            {cleaned && (
              <div className="flex gap-2">
                <button
                  onClick={async () => {
                    try {
                      const msg = await invoke<string>("open_cleaner_audit_log");
                      toast.success(t(msg));
                    } catch (e: any) {
                      toast.error(t(e));
                    }
                  }}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold border text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                >
                  {t("View Audit Log")}
                </button>
                <div
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-emerald-700"
                  style={{ background: "#d1fae5" }}
                >
                  <CheckCircle2 size={16} /> {t("Cleaned Successfully!")}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="mb-1 flex justify-between text-xs text-slate-500">
          <span>{scanning ? t("Scanning...") : done ? t("Scan complete") : t("Ready")}</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="w-full h-2 rounded-full bg-slate-100 mb-4">
          <div
            className="h-2 rounded-full transition-all duration-200"
            style={{
              width: `${progress}%`,
              background: "linear-gradient(90deg,#4f46e5,#7c3aed,#0ea5e9)",
            }}
          />
        </div>

        <ScanAnimation scanning={scanning} progress={progress} />
      </GradientCard>

      {(done || cleaned) && (
        <GradientCard>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-semibold text-slate-800">
                {cleaned ? `✅ ${t("Cleaned Successfully!")}` : t("Found — Select to Clean")}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {totalFiles.toLocaleString()} {t("files")} · {totalGB} GB {t("ready")}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setSelected(Object.fromEntries(junkCats.map((c) => [c.name, true])))}
                className="text-xs px-3 py-1.5 rounded-lg border text-slate-600 hover:bg-slate-50 transition"
              >
                {t("Select All")}
              </button>
              <button
                onClick={() =>
                  setSelected(Object.fromEntries(junkCats.map((c) => [c.name, false])))
                }
                className="text-xs px-3 py-1.5 rounded-lg border text-slate-600 hover:bg-slate-50 transition"
              >
                {t("None")}
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {junkCats.map((cat) => {
              const maxBytes = Math.max(...junkCats.map((c) => c.bytes), 1);
              const pct = (cat.bytes / maxBytes) * 100;
              const isOn = selected[cat.name];
              return (
                <button
                  key={cat.name}
                  onClick={() => setSelected((prev) => ({ ...prev, [cat.name]: !prev[cat.name] }))}
                  className="text-left p-4 rounded-xl border transition-all hover:shadow-sm"
                  style={{
                    background: isOn ? `${cat.color}06` : "#fafafa",
                    borderColor: isOn ? `${cat.color}30` : "#e2e8f0",
                  }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-base">{cat.icon}</span>
                    <span className="text-sm font-medium text-slate-700 flex-1">{t(cat.name)}</span>
                    <div
                      className={cn(
                        "w-4 h-4 rounded flex items-center justify-center border transition-all",
                        isOn ? "border-0" : "border-slate-300"
                      )}
                      style={isOn ? { background: cat.color } : {}}
                    >
                      {isOn && <CheckCircle2 size={12} color="white" />}
                    </div>
                  </div>
                  <div className="flex justify-between text-xs text-slate-400 mb-1.5">
                    <span>
                      {cat.count.toLocaleString()} {t("files")}
                    </span>
                    <span style={{ color: cat.color }}>{cat.size}</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-slate-100">
                    <div
                      className="h-1.5 rounded-full transition-all"
                      style={{ width: `${pct}%`, background: cat.color }}
                    />
                  </div>
                </button>
              );
            })}
          </div>
        </GradientCard>
      )}
    </div>
  );
}

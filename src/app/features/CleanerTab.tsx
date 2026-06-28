import React, { useState } from "react";
import {
  Trash2,
  RotateCcw,
  CheckCircle2,
  Sparkles,
  RefreshCw,
  XCircle,
  ShieldAlert,
  Shield,
  AlertTriangle,
  Clock,
  HardDrive,
  Files,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { ScanAnimation } from "../components/ScanAnimation";
import { useCleanerStore } from "../store/useCleanerStore";
import { invoke } from "@tauri-apps/api/core";
import { toast } from "sonner";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogCancel,
  AlertDialogAction,
} from "../components/ui/alert-dialog";
import { StatCard } from "../components/ui/StatCard";

const C = {
  indigo: "#4f46e5",
  emerald: "#10b981",
  purple: "#a855f7",
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
    scanDuration,
    error,
    startScan,
    cancelScan,
    doClean,
    setSelected,
    toggleSelectedCategory,
    selectAllCategories,
    deselectAllCategories,
    cleanedBytes,
    cleanedFiles,
  } = useCleanerStore();

  const [confirmOpen, setConfirmOpen] = useState(false);

  // Calculations
  const totalSelectedBytes = junkCats
    .filter((c) => selected[c.name])
    .reduce((s, c) => s + c.bytes, 0);

  const totalSelectedGB = (totalSelectedBytes / 1_073_741_824).toFixed(2);
  const totalSelectedFiles = junkCats
    .filter((c) => selected[c.name])
    .reduce((s, c) => s + c.count, 0);

  const formatBytes = (b: number) => {
    if (b > 1_073_741_824) return (b / 1_073_741_824).toFixed(2) + " GB";
    if (b > 1_048_576) return (b / 1_048_576).toFixed(1) + " MB";
    if (b > 1024) return (b / 1024).toFixed(1) + " KB";
    return b + " B";
  };

  const displayBytesStr = cleaned ? formatBytes(cleanedBytes) : `${totalSelectedGB} GB`;
  const displayFilesStr = cleaned
    ? cleanedFiles.toLocaleString()
    : totalSelectedFiles.toLocaleString();

  // Checks if any selected category contains a warning or requires administrator access
  const hasSensitiveSelected = junkCats.some(
    (c) => selected[c.name] && (c.warning.length > 0 || c.requires_admin)
  );

  const handleCleanClick = () => {
    if (hasSensitiveSelected) {
      setConfirmOpen(true);
    } else {
      doClean();
    }
  };

  const handleConfirmClean = () => {
    setConfirmOpen(false);
    doClean();
  };

  // Recharts Chart Data Prep
  const chartData = junkCats
    .filter((c) => selected[c.name] && c.bytes > 0)
    .map((c) => ({
      name: t(c.name),
      value: Number((c.bytes / 1_048_576).toFixed(1)), // Value in MB for chart scaling
      color: c.color,
    }));

  const customTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const sizeStr =
        data.value > 1024 ? (data.value / 1024).toFixed(2) + " GB" : data.value + " MB";
      return (
        <div className="bg-card/95 backdrop-blur-sm p-3 border border-border rounded-xl shadow-lg font-sans text-xs text-foreground">
          <p className="font-semibold text-card-foreground">{data.name}</p>
          <p className="text-indigo-600 dark:text-indigo-400 font-medium mt-0.5">{sizeStr}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-5">
      {/* SCAN CONTROLLER CARD */}
      <GradientCard className="bg-gradient-to-br from-indigo-50/50 to-violet-50/50 dark:from-slate-900/40 dark:to-indigo-950/20">
        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100">
              {t("Junk File Scanner")}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {t(
                "Deep scan for all unnecessary files — temporary data, cache, and residual clutter"
              )}
            </p>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            {!scanning && !done && !cleaned && (
              <button
                onClick={startScan}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:shadow-lg hover:-translate-y-0.5 active:scale-95 cursor-pointer"
                style={{
                  background: "linear-gradient(135deg, #4f46e5, #7c3aed)",
                  boxShadow: "0 4px 14px rgba(79, 70, 229, 0.4)",
                }}
              >
                <Sparkles size={15} /> {t("Start Scan")}
              </button>
            )}

            {scanning && (
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold opacity-70 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400">
                  <RefreshCw size={15} className="animate-spin" /> {t("Scanning...")}
                </div>
                <button
                  onClick={cancelScan}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/20 hover:bg-red-100 dark:hover:bg-red-950/30 hover:border-red-300 dark:hover:border-red-800/50 transition active:scale-95 cursor-pointer"
                >
                  <XCircle size={15} /> {t("Cancel Scan")}
                </button>
              </div>
            )}

            {done && !cleaned && (
              <>
                <button
                  onClick={startScan}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-850 transition cursor-pointer"
                >
                  <RotateCcw size={12} /> {t("Rescan")}
                </button>
                <button
                  onClick={handleCleanClick}
                  disabled={cleaning || totalSelectedBytes === 0}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:shadow-lg hover:-translate-y-0.5 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none cursor-pointer"
                  style={{
                    background:
                      cleaning || totalSelectedBytes === 0
                        ? "var(--border)"
                        : "linear-gradient(135deg, #4f46e5, #7c3aed)",
                    boxShadow:
                      cleaning || totalSelectedBytes === 0
                        ? "none"
                        : "0 4px 14px rgba(79, 70, 229, 0.4)",
                  }}
                >
                  <Trash2 size={15} />{" "}
                  {cleaning ? t("Wait...") : `${t("Clean")} ${totalSelectedGB} GB`}
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
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-850 transition cursor-pointer"
                >
                  {t("View Audit Log")}
                </button>
                <button
                  onClick={startScan}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-850 transition cursor-pointer"
                >
                  <RotateCcw size={12} /> {t("Scan Again")}
                </button>
                <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30">
                  <CheckCircle2 size={16} /> {t("Cleaned Successfully!")}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* PROGRESS BAR */}
        {(scanning || done || cleaning) && (
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>
                {scanning ? t("Scanning...") : cleaning ? t("Wait...") : t("Scan complete")}
              </span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-slate-800 mb-4 overflow-hidden">
              <div
                className="h-2 rounded-full transition-all duration-300"
                style={{
                  width: `${progress}%`,
                  background: "linear-gradient(90deg, #4f46e5, #7c3aed, #0ea5e9)",
                }}
              />
            </div>
          </div>
        )}

        <ScanAnimation scanning={scanning} progress={progress} />
      </GradientCard>

      {/* ERROR PANEL */}
      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-100 flex items-start gap-3">
          <ShieldAlert className="text-red-500 flex-shrink-0 mt-0.5" size={18} />
          <div>
            <h4 className="text-sm font-semibold text-red-800">Error occurred during operations</h4>
            <p className="text-xs text-red-600 mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* STATS & CHARTS PANEL */}
      {(done || cleaned) && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* STATS OVERVIEW CARDS */}
          <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard
              icon={<HardDrive size={18} />}
              label={cleaned ? t("Total Freed") : t("Total Junk")}
              value={displayBytesStr}
              color={C.indigo}
            />

            <StatCard
              icon={<Files size={18} />}
              label={cleaned ? t("Files Cleaned") : t("Files Found")}
              value={displayFilesStr}
              color={C.emerald}
            />

            <StatCard
              icon={<Clock size={18} />}
              label={t("Scan Duration")}
              value={scanDuration}
              color={C.purple}
            />

            <div className="col-span-1 sm:col-span-3">
              <GradientCard className="h-full flex flex-col justify-center">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                      {cleaned ? `✅ ${t("Cleaned Successfully!")}` : t("Found — Select to Clean")}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {t("Manage your cleanup targets to protect performance")}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={selectAllCategories}
                      className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-850 transition cursor-pointer"
                    >
                      {t("Select All")}
                    </button>
                    <button
                      onClick={deselectAllCategories}
                      className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-850 transition cursor-pointer"
                    >
                      {t("None")}
                    </button>
                  </div>
                </div>
              </GradientCard>
            </div>
          </div>

          {/* COMPOSITION DONUT CHART */}
          <GradientCard className="flex flex-col items-center justify-center p-4">
            <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2 self-start">
              {t("Junk Composition")}
            </h4>
            {chartData.length > 0 ? (
              <div className="w-full h-44 relative flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={70}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={customTooltip} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute flex flex-col items-center justify-center">
                  <span className="text-slate-400 dark:text-slate-550 text-[10px] uppercase font-semibold">
                    {cleaned ? t("Freed") : t("Selected")}
                  </span>
                  <span className="text-lg font-black text-slate-800 dark:text-slate-200">
                    {displayBytesStr}
                  </span>
                </div>
              </div>
            ) : (
              <div className="h-44 flex items-center justify-center text-xs text-slate-400 dark:text-slate-500">
                {t("No categories selected or scanned")}
              </div>
            )}
          </GradientCard>
        </div>
      )}

      {/* CATEGORIES GRID */}
      {(done || cleaned) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {junkCats.map((cat) => {
            const maxBytes = Math.max(...junkCats.map((c) => c.bytes), 1);
            const pct = (cat.bytes / maxBytes) * 100;
            const isOn = selected[cat.name];

            return (
              <div
                key={cat.name}
                onClick={() => toggleSelectedCategory(cat.name)}
                className="text-left p-4 rounded-xl border transition-all duration-200 hover:shadow-md cursor-pointer select-none relative overflow-hidden flex flex-col justify-between"
                style={{
                  background: isOn ? `${cat.color}12` : "var(--card)",
                  borderColor: isOn ? `${cat.color}50` : "var(--border)",
                }}
              >
                <div>
                  <div className="flex items-start gap-2 mb-2">
                    <span className="text-lg mt-0.5">{cat.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                          {t(cat.name)}
                        </span>
                        {cat.requires_admin && (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900/50">
                            <Shield size={9} />
                            {t("Requires Admin")}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 leading-normal">
                        {t(cat.description)}
                      </p>
                    </div>
                    <div
                      className={cn(
                        "w-4 h-4 rounded flex items-center justify-center border transition-all flex-shrink-0 mt-0.5",
                        isOn ? "border-0" : "border-slate-300 dark:border-slate-700"
                      )}
                      style={isOn ? { background: cat.color } : {}}
                    >
                      {isOn && <CheckCircle2 size={12} color="white" />}
                    </div>
                  </div>

                  {/* WARNING FLAGS */}
                  {isOn && cat.warning && (
                    <div className="mt-2.5 p-2 rounded-lg bg-amber-50/20 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/40 flex items-start gap-1.5">
                      <AlertTriangle className="text-amber-500 mt-0.5 flex-shrink-0" size={12} />
                      <p className="text-[10px] leading-relaxed text-amber-800 dark:text-amber-300 font-medium">
                        {t("Warning")}: {t(cat.warning)}
                      </p>
                    </div>
                  )}
                </div>

                <div className="mt-4">
                  <div className="flex justify-between text-xs text-slate-400 dark:text-slate-500 mb-1.5 font-medium">
                    <span>
                      {cat.count.toLocaleString()} {t("files")}
                    </span>
                    <span style={{ color: cat.color }} className="font-bold">
                      {cat.size}
                    </span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className="h-1.5 rounded-full transition-all duration-500"
                      style={{ width: `${pct}%`, background: cat.color }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CONFIRMATION DIALOG MODAL */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent className="sm:max-w-md bg-card text-card-foreground border border-border">
          <AlertDialogHeader>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-900/50">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <AlertDialogTitle className="text-center text-slate-800 dark:text-slate-100 mt-2">
              {t("Security Warning")}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center text-slate-500 dark:text-slate-400 text-sm mt-1 leading-relaxed">
              {t(
                "Some selected categories contain critical system cache or permanent deletion flags. Are you sure you want to clean them?"
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>

          {/* LIST SENSITIVE TARGETS */}
          <div className="my-2 max-h-36 overflow-y-auto px-1 space-y-1.5 py-1">
            {junkCats
              .filter((c) => selected[c.name] && (c.warning.length > 0 || c.requires_admin))
              .map((c) => (
                <div
                  key={c.name}
                  className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 dark:bg-slate-800/50 text-xs font-semibold text-slate-700 dark:text-slate-300"
                >
                  <span>{c.icon}</span>
                  <span className="flex-1">{t(c.name)}</span>
                  <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase">
                    {c.requires_admin ? t("Admin Required") : t("Warning")}
                  </span>
                </div>
              ))}
          </div>

          <AlertDialogFooter className="mt-4 gap-2 flex-col sm:flex-row">
            <AlertDialogCancel className="w-full sm:w-auto font-semibold border border-border bg-transparent hover:bg-muted dark:text-slate-200 cursor-pointer">
              {t("Cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmClean}
              className="w-full sm:w-auto font-semibold text-white cursor-pointer"
              style={{
                background: "linear-gradient(135deg, #e11d48, #be123c)",
              }}
            >
              {t("Proceed with Cleanup")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

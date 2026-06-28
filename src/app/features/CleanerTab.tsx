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

// Teal-based palette consistent with Dashboard
const P = {
  teal: "#0d9488",
  amber: "#f59e0b",
  rose: "#f43f5e",
  sky: "#0ea5e9",
  slate: "#64748b",
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
        "rounded-2xl p-5 border border-border/60 shadow-sm relative overflow-hidden transition-all duration-300 bg-card",
        className
      )}
      style={style}
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
  const displayFilesStr = cleaned ? cleanedFiles.toLocaleString() : totalSelectedFiles.toLocaleString();

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

  const chartData = junkCats
    .filter((c) => selected[c.name] && c.bytes > 0)
    .map((c) => ({
      name: t(c.name),
      value: Number((c.bytes / 1_048_576).toFixed(1)),
      color: c.color,
    }));

  const customTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const sizeStr = data.value > 1024 ? (data.value / 1024).toFixed(2) + " GB" : data.value + " MB";
      return (
        <div className="bg-card/95 backdrop-blur-sm p-3 border border-border rounded-xl shadow-lg font-sans text-xs text-foreground">
          <p className="font-semibold text-card-foreground">{data.name}</p>
          <p className="font-medium mt-0.5" style={{ color: data.color }}>
            {sizeStr}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-4">
      {/* ── Scan Controller ──────────────────────────────────────────────────────── */}
      <Card
        style={{
          background: `linear-gradient(145deg, var(--card) 40%, color-mix(in srgb, ${P.teal} 5%, transparent))`,
          borderColor: `color-mix(in srgb, ${P.teal} 20%, var(--border))`,
        }}
      >
        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <Sparkles size={16} style={{ color: P.teal }} />
              <h3 className="text-base font-semibold text-foreground tracking-tight">
                {t("Junk File Scanner")}
              </h3>
            </div>
            <p className="text-xs text-muted-foreground">
              {t("Deep scan for all unnecessary files — temporary data, cache, and residual clutter")}
            </p>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            {!scanning && !done && !cleaned && (
              <button
                onClick={startScan}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:shadow-md active:scale-95 cursor-pointer"
                style={{ background: P.teal }}
              >
                <Sparkles size={15} /> {t("Start Scan")}
              </button>
            )}

            {scanning && (
              <div className="flex items-center gap-2">
                <div
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold"
                  style={{
                    background: `color-mix(in srgb, ${P.teal} 12%, transparent)`,
                    color: P.teal,
                  }}
                >
                  <RefreshCw size={15} className="animate-spin" /> {t("Scanning...")}
                </div>
                <button
                  onClick={cancelScan}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold border border-destructive/20 text-destructive hover:bg-destructive/10 transition active:scale-95 cursor-pointer"
                >
                  <XCircle size={15} /> {t("Cancel")}
                </button>
              </div>
            )}

            {done && !cleaned && (
              <>
                <button
                  onClick={startScan}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold border border-border text-foreground hover:bg-secondary transition cursor-pointer"
                >
                  <RotateCcw size={12} /> {t("Rescan")}
                </button>
                <button
                  onClick={handleCleanClick}
                  disabled={cleaning || totalSelectedBytes === 0}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:shadow-md hover:-translate-y-0.5 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none cursor-pointer"
                  style={{
                    background: cleaning || totalSelectedBytes === 0 ? "var(--border)" : P.teal,
                  }}
                >
                  <Trash2 size={15} /> {cleaning ? t("Wait...") : `${t("Clean")} ${totalSelectedGB} GB`}
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
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold border border-border text-foreground hover:bg-secondary transition cursor-pointer"
                >
                  {t("Audit Log")}
                </button>
                <button
                  onClick={startScan}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold border border-border text-foreground hover:bg-secondary transition cursor-pointer"
                >
                  <RotateCcw size={12} /> {t("Scan Again")}
                </button>
                <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-emerald-600 bg-emerald-500/10">
                  <CheckCircle2 size={16} /> {t("Cleaned!")}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* PROGRESS BAR */}
        {(scanning || done || cleaning) && (
          <div className="space-y-1.5 mt-2">
            <div className="flex justify-between text-xs text-muted-foreground font-medium">
              <span>{scanning ? t("Scanning...") : cleaning ? t("Cleaning...") : t("Complete")}</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-secondary overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{ width: `${progress}%`, background: P.teal }}
              />
            </div>
          </div>
        )}

        <ScanAnimation scanning={scanning} progress={progress} />
      </Card>

      {/* ── Error Panel ──────────────────────────────────────────────────────── */}
      {error && (
        <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 flex items-start gap-3">
          <ShieldAlert className="text-destructive flex-shrink-0 mt-0.5" size={18} />
          <div>
            <h4 className="text-sm font-semibold text-destructive">{t("Error occurred")}</h4>
            <p className="text-xs text-destructive/80 mt-0.5">{error}</p>
          </div>
        </div>
      )}

      {/* ── Stats & Chart ────────────────────────────────────────────────────── */}
      {(done || cleaned) && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatCard
            icon={<HardDrive size={15} />}
            label={cleaned ? t("Total Freed") : t("Total Junk")}
            value={displayBytesStr}
            color={P.teal}
          />
          <StatCard
            icon={<Files size={15} />}
            label={cleaned ? t("Files Cleaned") : t("Files Found")}
            value={displayFilesStr}
            color={P.sky}
          />
          <StatCard
            icon={<Clock size={15} />}
            label={t("Scan Duration")}
            value={scanDuration}
            color={P.amber}
          />
        </div>
      )}

      {(done || cleaned) && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Donut chart */}
          <Card className="flex flex-col items-center justify-center p-4">
            <h4 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2 self-start">
              {t("Composition")}
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
                      stroke="var(--card)"
                      strokeWidth={2}
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={customTooltip} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute flex flex-col items-center justify-center">
                  <span className="text-muted-foreground text-[10px] uppercase font-bold tracking-wide">
                    {cleaned ? t("Freed") : t("Selected")}
                  </span>
                  <span className="text-lg font-bold text-foreground mt-0.5" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                    {displayBytesStr.split(' ')[0]}
                  </span>
                </div>
              </div>
            ) : (
              <div className="h-44 flex items-center justify-center text-xs text-muted-foreground">
                {t("No categories selected")}
              </div>
            )}
          </Card>

          {/* Categories Grid */}
          <Card className="lg:col-span-2 flex flex-col p-0 overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-border bg-card">
              <div>
                <h3 className="text-sm font-semibold text-foreground">
                  {cleaned ? `✅ ${t("Cleaned Successfully!")}` : t("Found targets")}
                </h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {t("Select specific areas you want to clean")}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={selectAllCategories}
                  className="text-[11px] font-medium px-2.5 py-1.5 rounded border border-border text-foreground hover:bg-secondary transition"
                >
                  {t("All")}
                </button>
                <button
                  onClick={deselectAllCategories}
                  className="text-[11px] font-medium px-2.5 py-1.5 rounded border border-border text-foreground hover:bg-secondary transition"
                >
                  {t("None")}
                </button>
              </div>
            </div>

            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[350px] overflow-y-auto">
              {junkCats.map((cat) => {
                const maxBytes = Math.max(...junkCats.map((c) => c.bytes), 1);
                const pct = (cat.bytes / maxBytes) * 100;
                const isOn = selected[cat.name];

                return (
                  <div
                    key={cat.name}
                    onClick={() => toggleSelectedCategory(cat.name)}
                    className="p-3.5 rounded-xl border transition-all duration-200 cursor-pointer select-none group"
                    style={{
                      background: isOn ? `color-mix(in srgb, ${cat.color} 8%, var(--card))` : "var(--card)",
                      borderColor: isOn ? `color-mix(in srgb, ${cat.color} 40%, transparent)` : "var(--border)",
                    }}
                  >
                    <div className="flex items-start gap-2.5 mb-2">
                      <span className="text-xl mt-0.5 opacity-90 transition-transform group-hover:scale-110">{cat.icon}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[13px] font-semibold text-foreground truncate">
                            {t(cat.name)}
                          </span>
                          {cat.requires_admin && (
                            <span className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-bold bg-amber-500/10 text-amber-600 border border-amber-500/20">
                              <Shield size={9} /> {t("Admin")}
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-1 leading-snug line-clamp-2">
                          {t(cat.description)}
                        </p>
                      </div>
                      <div
                        className="w-4 h-4 rounded-full border transition-all flex items-center justify-center flex-shrink-0 mt-0.5"
                        style={{
                          borderColor: isOn ? cat.color : "var(--border)",
                          background: isOn ? cat.color : "transparent",
                        }}
                      >
                        {isOn && <CheckCircle2 size={12} color="var(--card)" />}
                      </div>
                    </div>

                    {isOn && cat.warning && (
                      <div className="mb-2.5 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-start gap-1.5">
                        <AlertTriangle className="text-amber-500 mt-0.5 flex-shrink-0" size={12} />
                        <p className="text-[10px] leading-relaxed text-amber-700 dark:text-amber-400 font-medium">
                          {t(cat.warning)}
                        </p>
                      </div>
                    )}

                    <div className="mt-auto">
                      <div className="flex justify-between text-[11px] text-muted-foreground mb-1.5 font-medium">
                        <span>{cat.count.toLocaleString()} {t("files")}</span>
                        <span style={{ color: cat.color }} className="font-bold">{cat.size}</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-secondary overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${pct}%`, background: cat.color }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      )}

      {/* ── Dialog Modal ──────────────────────────────────────────────────────── */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent className="sm:max-w-md bg-card border-border">
          <AlertDialogHeader>
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <AlertDialogTitle className="text-center text-foreground mt-2">
              {t("Security Warning")}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center text-muted-foreground text-sm mt-1 leading-relaxed">
              {t("Some selected categories contain critical system cache or permanent deletion flags. Are you sure you want to clean them?")}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="my-2 max-h-36 overflow-y-auto px-1 space-y-1.5 py-1">
            {junkCats
              .filter((c) => selected[c.name] && (c.warning.length > 0 || c.requires_admin))
              .map((c) => (
                <div
                  key={c.name}
                  className="flex items-center gap-2 p-2 rounded-lg bg-secondary text-xs font-semibold text-foreground"
                >
                  <span>{c.icon}</span>
                  <span className="flex-1 truncate">{t(c.name)}</span>
                  <span className="text-[10px] font-bold text-amber-500 uppercase">
                    {c.requires_admin ? t("Admin") : t("Warning")}
                  </span>
                </div>
              ))}
          </div>

          <AlertDialogFooter className="mt-4 gap-2 flex-col sm:flex-row">
            <AlertDialogCancel className="w-full sm:w-auto font-semibold border-border bg-transparent hover:bg-secondary cursor-pointer">
              {t("Cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmClean}
              className="w-full sm:w-auto font-semibold text-white cursor-pointer"
              style={{ background: P.rose }}
            >
              {t("Proceed with Cleanup")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

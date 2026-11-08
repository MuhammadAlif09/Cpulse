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
  Check,
  Globe,
  FileText,
  Zap,
  Image,
  ClipboardList,
  Type,
  Gamepad2,
  Package,
  AppWindow,
  ArrowUpDown,
  ArrowDownWideNarrow,
  ArrowUpNarrowWide,
  ShieldCheck,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "motion/react";
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
import { P } from "../../design/tokens";
import { cn } from "../components/ui/utils";

function getCategoryColor(_name: string): string {
  return P.teal;
}

function getCategoryIcon(name: string, size = 16) {
  switch (name) {
    case "Windows Temp Files":
      return <Trash2 size={size} />;
    case "Browser Cache":
      return <Globe size={size} />;
    case "Windows Update Cache":
      return <RefreshCw size={size} />;
    case "System Log Files":
      return <ClipboardList size={size} />;
    case "Thumbnail Cache":
      return <Image size={size} />;
    case "Windows Error Reports":
      return <AlertTriangle size={size} />;
    case "Delivery Optimization Files":
      return <Package size={size} />;
    case "Temporary Setup Files":
      return <Files size={size} />;
    case "Prefetch Cache":
      return <Zap size={size} />;
    case "DirectX Shader Cache":
      return <Gamepad2 size={size} />;
    case "Recycle Bin":
      return <Trash2 size={size} />;
    case "Memory Dumps":
      return <FileText size={size} />;
    case "Font Cache":
      return <Type size={size} />;
    default:
      return <Trash2 size={size} />;
  }
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
        "rounded-2xl p-5 border border-border relative overflow-hidden transition-all duration-300 bg-card",
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
  const [sortOrder, setSortOrder] = useState<"desc" | "asc" | "default">("desc");

  const toggleSortOrder = () => {
    if (sortOrder === "desc") setSortOrder("asc");
    else if (sortOrder === "asc") setSortOrder("default");
    else setSortOrder("desc");
  };

  const selectSafeCategories = () => {
    const newSelected: Record<string, boolean> = {};
    junkCats.forEach((c) => {
      newSelected[c.name] = !c.warning && !c.requires_admin;
    });
    setSelected(newSelected);
  };

  const sortedJunkCats = [...junkCats].sort((a, b) => {
    if (sortOrder === "desc") return b.bytes - a.bytes;
    if (sortOrder === "asc") return a.bytes - b.bytes;
    return 0;
  });

  const selectedCount = junkCats.filter((c) => selected[c.name]).length;
  const isAllActive = junkCats.length > 0 && junkCats.every((c) => selected[c.name]);
  const isSafeOnlyActive =
    junkCats.length > 0 &&
    junkCats.every((c) => selected[c.name] === (!c.warning && !c.requires_admin));
  const isNoneActive = junkCats.length > 0 && junkCats.every((c) => !selected[c.name]);

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
    .map((c, idx) => ({
      name: t(c.name),
      value: Number((c.bytes / 1_048_576).toFixed(1)),
      color: idx % 2 === 0 ? P.teal : P.muted,
    }));

  const customTooltip = ({
    active,
    payload,
  }: {
    active?: boolean;
    payload?: Array<{ payload: { name: string; value: number; color: string } }>;
  }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const sizeStr =
        data.value > 1024 ? (data.value / 1024).toFixed(2) + " GB" : data.value + " MB";
      return (
        <div className="bg-popover p-3 border border-border rounded-xl font-sans text-xs text-foreground">
          <p className="font-semibold text-card-foreground">{data.name}</p>
          <p className="font-medium mt-0.5" style={{ color: P.teal }}>
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
      <Card>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-5">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <Sparkles size={16} style={{ color: P.teal }} />
              <h3 className="text-base font-semibold text-foreground tracking-tight">
                {t("Junk File Scanner")}
              </h3>
            </div>
            <p className="text-xs text-muted-foreground">
              {t(
                "Deep scan for all unnecessary files — temporary data, cache, and residual clutter"
              )}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 flex-shrink-0">
            {!scanning && !done && !cleaned && (
              <button
                onClick={startScan}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all hover:-translate-y-0.5 active:scale-95 cursor-pointer"
                style={{ background: P.teal, color: P.bg }}
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
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold border border-border text-foreground hover:bg-background transition cursor-pointer"
                >
                  <RotateCcw size={12} /> {t("Rescan")}
                </button>
                <button
                  onClick={handleCleanClick}
                  disabled={cleaning || totalSelectedBytes === 0}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all hover:-translate-y-0.5 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none cursor-pointer"
                  style={{
                    background: cleaning || totalSelectedBytes === 0 ? "var(--border)" : P.teal,
                    color: cleaning || totalSelectedBytes === 0 ? "var(--muted-foreground)" : P.bg,
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
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold border border-border text-foreground hover:bg-background transition cursor-pointer"
                >
                  {t("Audit Log")}
                </button>
                <button
                  onClick={startScan}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold border border-border text-foreground hover:bg-background transition cursor-pointer"
                >
                  <RotateCcw size={12} /> {t("Scan Again")}
                </button>
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
                  {t("Cleaned!")}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* PROGRESS BAR */}
        {(scanning || done || cleaning) && (
          <div className="space-y-1.5 mt-2">
            <div className="flex justify-between text-xs text-muted-foreground font-medium">
              <span>
                {scanning ? t("Scanning...") : cleaning ? t("Cleaning...") : t("Complete")}
              </span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-background overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${progress}%`,
                  background: P.teal,
                }}
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
            color={P.teal}
          />
          <StatCard
            icon={<Clock size={15} />}
            label={t("Scan Duration")}
            value={scanDuration}
            color={P.teal}
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
                  <span
                    className="text-lg font-bold text-foreground mt-0.5"
                    style={{
                      fontFamily: "'Satoshi', sans-serif",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {displayBytesStr.split(" ")[0]}
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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border-b border-border bg-card gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-foreground">
                    {cleaned ? `✅ ${t("Cleaned Successfully!")}` : t("Found targets")}
                  </h3>
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-background text-muted-foreground border border-border">
                    {selectedCount} / {junkCats.length} {t("selected")}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {t("Select specific areas you want to clean")}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Sort by Size toggle */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  transition={{ type: "tween", duration: 0.1, ease: "easeOut" }}
                  onClick={toggleSortOrder}
                  className={cn(
                    "flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1.5 rounded-lg border transition-colors duration-200 cursor-pointer select-none",
                    sortOrder !== "default"
                      ? "bg-primary/15 text-primary border-primary/40"
                      : "border-border text-muted-foreground hover:bg-background hover:text-foreground"
                  )}
                  title={t("Sort categories by total disk size")}
                >
                  {sortOrder === "desc" && <ArrowDownWideNarrow size={13} className="text-primary" />}
                  {sortOrder === "asc" && <ArrowUpNarrowWide size={13} className="text-primary" />}
                  {sortOrder === "default" && <ArrowUpDown size={13} />}
                  <span>
                    {sortOrder === "desc"
                      ? t("Size: High → Low")
                      : sortOrder === "asc"
                      ? t("Size: Low → High")
                      : t("Sort by Size")}
                  </span>
                </motion.button>

                <div className="h-4 w-[1px] bg-border mx-0.5 hidden sm:block" />

                {/* Granular multi-select controls */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  transition={{ type: "tween", duration: 0.1, ease: "easeOut" }}
                  onClick={selectAllCategories}
                  className={cn(
                    "text-[11px] font-medium px-2.5 py-1.5 rounded-lg border transition-colors duration-200 cursor-pointer",
                    isAllActive
                      ? "bg-primary/15 text-primary border-primary/40 font-semibold"
                      : "border-border text-foreground hover:bg-background"
                  )}
                >
                  {t("All")}
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  transition={{ type: "tween", duration: 0.1, ease: "easeOut" }}
                  onClick={selectSafeCategories}
                  className={cn(
                    "text-[11px] font-medium px-2.5 py-1.5 rounded-lg border transition-colors duration-200 cursor-pointer flex items-center gap-1",
                    isSafeOnlyActive
                      ? "font-semibold"
                      : "border-border text-foreground hover:bg-background"
                  )}
                  style={
                    isSafeOnlyActive
                      ? {
                          color: P.good,
                          backgroundColor: `${P.good}18`,
                          borderColor: `${P.good}40`,
                        }
                      : undefined
                  }
                  title={t("Select only safe items without warnings or admin requirements")}
                >
                  <ShieldCheck size={12} style={{ color: P.good }} />
                  {t("Safe Only")}
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  transition={{ type: "tween", duration: 0.1, ease: "easeOut" }}
                  onClick={deselectAllCategories}
                  className={cn(
                    "text-[11px] font-medium px-2.5 py-1.5 rounded-lg border transition-colors duration-200 cursor-pointer",
                    isNoneActive
                      ? "bg-primary/15 text-primary border-primary/40 font-semibold"
                      : "border-border text-foreground hover:bg-background"
                  )}
                >
                  {t("None")}
                </motion.button>
              </div>
            </div>

            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[350px] overflow-y-auto">
              {sortedJunkCats.map((cat) => {
                const maxBytes = Math.max(...junkCats.map((c) => c.bytes), 1);
                const pct = (cat.bytes / maxBytes) * 100;
                const isOn = selected[cat.name];
                const catColor = getCategoryColor(cat.name);

                return (
                  <motion.div
                    key={cat.name}
                    whileTap={{
                      scale: 0.98,
                    }}
                    transition={{ type: "tween", duration: 0.1, ease: "easeOut" }}
                    onClick={() => toggleSelectedCategory(cat.name)}
                    className="p-3.5 rounded-xl border transition-colors duration-200 cursor-pointer select-none group"
                    style={{
                      background: isOn
                        ? `color-mix(in srgb, ${catColor} 8%, var(--card))`
                        : "var(--card)",
                      borderColor: isOn
                        ? `color-mix(in srgb, ${catColor} 35%, var(--border))`
                        : "var(--border)",
                    }}
                  >
                    <div className="flex items-start gap-2.5 mb-2">
                      <span
                        className="text-xl mt-0.5 transition-transform flex items-center justify-center w-5 h-5"
                        style={{ color: isOn ? catColor : "var(--muted-foreground)" }}
                      >
                        {getCategoryIcon(cat.name)}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[13px] font-semibold text-foreground truncate">
                            {t(cat.name)}
                          </span>
                          {cat.requires_admin && (
                            <span
                              className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-bold border"
                              style={{
                                color: P.warn,
                                backgroundColor: `${P.warn}15`,
                                borderColor: `${P.warn}30`,
                              }}
                            >
                              <Shield size={9} /> {t("Admin")}
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-1 leading-snug line-clamp-2">
                          {t(cat.description)}
                        </p>
                      </div>
                      <div
                        className="w-[18px] h-[18px] rounded-md border transition-all flex items-center justify-center flex-shrink-0 mt-0.5"
                        style={{
                          border: isOn ? "none" : "1px solid var(--border)",
                          background: isOn ? catColor : "transparent",
                        }}
                      >
                        <AnimatePresence>
                          {isOn && (
                            <motion.div
                              initial={{ scale: 0, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              exit={{ scale: 0, opacity: 0 }}
                              transition={{ type: "spring", stiffness: 400, damping: 20 }}
                            >
                              <Check
                                size={11}
                                color={P.bg}
                                strokeWidth={3.5}
                              />
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>

                    {isOn && cat.warning && (
                      <div
                        className="mb-2.5 p-2 rounded-lg border flex items-start gap-1.5"
                        style={{
                          backgroundColor: `${P.warn}12`,
                          borderColor: `${P.warn}30`,
                        }}
                      >
                        <AlertTriangle
                          className="mt-0.5 flex-shrink-0"
                          style={{ color: P.warn }}
                          size={12}
                        />
                        <p
                          className="text-[10px] leading-relaxed font-medium"
                          style={{ color: P.warn }}
                        >
                          {t(cat.warning)}
                        </p>
                      </div>
                    )}

                    <div className="mt-auto">
                      <div className="flex justify-between text-[11px] text-muted-foreground mb-1.5 font-medium">
                        <span>
                          {cat.count.toLocaleString()} {t("files")}
                        </span>
                        <span style={{ color: isOn ? catColor : "var(--foreground)" }} className="font-bold">
                          {cat.size}
                        </span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-background overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${pct}%`, background: isOn ? catColor : "var(--muted-foreground)" }}
                        />
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </Card>
        </div>
      )}

      {/* ── Global Bottom Progress Bar ─────────────────────────────────────────── */}
      <AnimatePresence>
        {(scanning || cleaning) && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 350, damping: 25 }}
            className="sticky bottom-4 z-30 mt-6"
          >
            <div className="bg-card border border-border p-4 rounded-2xl space-y-2.5">
              <div className="flex items-center justify-between gap-3 text-xs font-semibold">
                <div className="flex items-center gap-2 min-w-0">
                  {scanning ? (
                    <RefreshCw size={16} className="animate-spin text-primary flex-shrink-0" />
                  ) : (
                    <Trash2 size={16} className="text-primary flex-shrink-0" />
                  )}
                  <span className="truncate text-foreground font-medium">
                    {scanning
                      ? t("Scanning system for junk files...")
                      : t("Cleaning selected junk categories...")}
                  </span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="font-bold text-sm text-primary tracking-tight">
                    {Math.round(progress)}%
                  </span>
                  {scanning && (
                    <button
                      onClick={cancelScan}
                      className="text-[11px] font-semibold px-2.5 py-1 rounded-md bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive/20 transition cursor-pointer"
                    >
                      {t("Cancel")}
                    </button>
                  )}
                </div>
              </div>

              {/* Progress Track & Fill */}
              <div className="w-full h-2.5 rounded-full bg-background overflow-hidden relative border border-border">
                <motion.div
                  className="h-full rounded-full transition-all duration-300 relative"
                  style={{
                    width: `${Math.max(progress, 2)}%`,
                    background: P.teal,
                  }}
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Dialog Modal ──────────────────────────────────────────────────────── */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent className="sm:max-w-md bg-card border-border">
          <AlertDialogHeader>
            <div
              className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border"
              style={{
                color: P.warn,
                backgroundColor: `${P.warn}15`,
                borderColor: `${P.warn}30`,
              }}
            >
              <ShieldAlert className="h-6 w-6" />
            </div>
            <AlertDialogTitle className="text-center text-foreground mt-2">
              {t("Security Warning")}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center text-muted-foreground text-sm mt-1 leading-relaxed">
              {t(
                "Some selected categories contain critical system cache or permanent deletion flags. Are you sure you want to clean them?"
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="my-2 max-h-36 overflow-y-auto px-1 space-y-1.5 py-1">
            {junkCats
              .filter((c) => selected[c.name] && (c.warning.length > 0 || c.requires_admin))
              .map((c) => (
                <div
                  key={c.name}
                  className="flex items-center gap-2 p-2 rounded-lg bg-background border border-border text-xs font-semibold text-foreground"
                >
                  <span style={{ color: P.teal }}>{getCategoryIcon(c.name)}</span>
                  <span className="flex-1 truncate">{t(c.name)}</span>
                  <span className="text-[10px] font-bold uppercase" style={{ color: P.warn }}>
                    {c.requires_admin ? t("Admin") : t("Warning")}
                  </span>
                </div>
              ))}
          </div>

          <AlertDialogFooter className="mt-4 gap-2 flex-col sm:flex-row">
            <AlertDialogCancel className="w-full sm:w-auto font-semibold border-border bg-transparent hover:bg-background cursor-pointer">
              {t("Cancel")}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmClean}
              className="w-full sm:w-auto font-semibold cursor-pointer"
              style={{ background: P.bad, color: P.bg }}
            >
              {t("Proceed with Cleanup")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

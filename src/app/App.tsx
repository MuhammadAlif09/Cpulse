import React, { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { RadialGauge } from "./components/RadialGauge";
import { ScanAnimation } from "./components/ScanAnimation";
import {
  Shield, Trash2, Zap, Settings, ChevronRight, AlertTriangle,
  CheckCircle2, HardDrive, Cpu, MemoryStick, Wifi, Monitor, Play,
  RotateCcw, BarChart3, PackageX, Star, TrendingUp, Clock, Lock,
  Globe, Bell, Eye, EyeOff, RefreshCw, Activity, Thermometer,
  Database, ArrowUpRight, ArrowDownRight, ChevronDown, X,
  Sparkles, Battery, Search,
} from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

// ─── palette ──────────────────────────────────────────────────────────────────
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

// ─── mock data ────────────────────────────────────────────────────────────────
const INITIAL_HISTORY = Array.from({ length: 20 }, (_, i) => ({ t: i, v: 0 }));

interface JunkItem {
  name: string;
  size: string;
  bytes: number;
  count: number;
  color: string;
  icon: string;
}

interface StartupItem {
  name: string;
  command: string;
  enabled: boolean;
  registry_path: string;
  is_hkcu: boolean;
  impact?: string;
  delay?: number;
  publisher?: string;
  icon?: string;
}

interface SessionLog {
  date: string;
  freed: string;
  fixed: number;
  duration: string;
  type: string;
}

const PRIVACY_ITEMS = [
  { id: "chrome_hist", label: "Chrome Browsing History", desc: "1,842 URLs found", found: true, color: C.indigo },
  { id: "edge_hist", label: "Edge Browsing History", desc: "673 URLs found", found: true, color: C.violet },
  { id: "recent_files", label: "Recent Files List", desc: "128 entries", found: true, color: C.amber },
  { id: "clipboard", label: "Clipboard History", desc: "47 copied items", found: true, color: C.rose },
  { id: "search_hist", label: "Windows Search History", desc: "312 queries", found: true, color: C.pink },
  { id: "wifi_pass", label: "Saved Wi-Fi Passwords", desc: "9 networks stored", found: true, color: C.emerald },
  { id: "cookies", label: "Tracking Cookies", desc: "4,291 cookies", found: true, color: C.cyan },
  { id: "run_hist", label: "Run Dialog History", desc: "23 entries", found: false, color: C.slate },
];

type Tab = "dashboard" | "cleaner" | "booster" | "startup" | "privacy" | "history" | "settings";

// ─── shared helpers ───────────────────────────────────────────────────────────
function cn(...classes: (string | undefined | false)[]) {
  return classes.filter(Boolean).join(" ");
}

function GradientCard({
  children, className = "", style = {}, gradient,
}: {
  children: React.ReactNode; className?: string; style?: React.CSSProperties; gradient?: string;
}) {
  return (
    <div
      className={cn("rounded-2xl p-5 border border-white/60 shadow-sm relative overflow-hidden", className)}
      style={{ background: gradient ?? "#ffffff", boxShadow: "0 1px 3px rgba(0,0,0,0.06), 0 4px 16px rgba(0,0,0,0.04)", ...style }}
    >
      {children}
    </div>
  );
}

function PillBadge({ label, color }: { label: string; color: string }) {
  const map: Record<string, string> = {
    High: "bg-rose-50 text-rose-600 border border-rose-200",
    Medium: "bg-amber-50 text-amber-600 border border-amber-200",
    Low: "bg-emerald-50 text-emerald-600 border border-emerald-200",
  };
  return <span className={cn("text-xs px-2.5 py-0.5 rounded-full font-medium", map[label] ?? "bg-slate-100 text-slate-600")}>{label}</span>;
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

// ─── dashboard ────────────────────────────────────────────────────────────────
import { listen } from "@tauri-apps/api/event";
import { load } from "@tauri-apps/plugin-store";
import { enable, isEnabled, disable } from "@tauri-apps/plugin-autostart";
import { check } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";

let store: any;
const initStore = async () => {
  store = await load("settings.json");
};
initStore();

interface SystemMetrics {
  cpu_usage: number;
  ram_usage: number;
  total_ram: number;
  used_ram: number;
  disk_usage: number;
  total_disk: number;
  used_disk: number;
  network_up: number;
  network_down: number;
}

function DashboardTab() {
  const [cpuData, setCpuData] = useState<{t: number, v: number}[]>(INITIAL_HISTORY);
  const [ramData, setRamData] = useState<{t: number, v: number}[]>(INITIAL_HISTORY);
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);

  useEffect(() => {
    let unlisten: () => void;
    let t = 20;

    const setup = async () => {
      unlisten = await listen<SystemMetrics>("system-metrics", (event) => {
        setMetrics(event.payload);
        t++;
        setCpuData(prev => [...prev.slice(1), { t, v: Math.round(event.payload.cpu_usage) }]);
        setRamData(prev => [...prev.slice(1), { t, v: Math.round(event.payload.ram_usage) }]);
      });
    };
    setup();

    return () => {
      if (unlisten) unlisten();
    };
  }, []);

  const STATS = metrics ? [
    { label: "CPU Usage", value: `${Math.round(metrics.cpu_usage)}%`, sub: "Global CPU Load", icon: <Cpu size={18} />, color: C.indigo, trend: 0, gradient: "linear-gradient(135deg,#ede9fe,#ddd6fe)" },
    { label: "RAM Usage", value: `${Math.round(metrics.ram_usage)}%`, sub: `${metrics.used_ram.toFixed(1)} / ${metrics.total_ram.toFixed(1)} GB in use`, icon: <MemoryStick size={18} />, color: C.violet, trend: 0, gradient: "linear-gradient(135deg,#f3e8ff,#e9d5ff)" },
    { label: "Disk Usage", value: `${Math.round(metrics.disk_usage)}%`, sub: `${metrics.used_disk.toFixed(1)} / ${metrics.total_disk.toFixed(1)} GB in use`, icon: <HardDrive size={18} />, color: C.amber, trend: 0, gradient: "linear-gradient(135deg,#fef3c7,#fde68a)" },
    { label: "Network I/O", value: `${(metrics.network_up + metrics.network_down).toFixed(1)} MB/s`, sub: `Up: ${metrics.network_up.toFixed(1)} | Down: ${metrics.network_down.toFixed(1)}`, icon: <Wifi size={18} />, color: C.emerald, trend: 0, gradient: "linear-gradient(135deg,#d1fae5,#a7f3d0)" },
  ] : [
    { label: "CPU Usage", value: "...", sub: "Waiting for data", icon: <Cpu size={18} />, color: C.indigo, trend: 0, gradient: "linear-gradient(135deg,#ede9fe,#ddd6fe)" },
    { label: "RAM Usage", value: "...", sub: "Waiting for data", icon: <MemoryStick size={18} />, color: C.violet, trend: 0, gradient: "linear-gradient(135deg,#f3e8ff,#e9d5ff)" },
    { label: "Disk Usage", value: "...", sub: "Waiting for data", icon: <HardDrive size={18} />, color: C.amber, trend: 0, gradient: "linear-gradient(135deg,#fef3c7,#fde68a)" },
    { label: "Network", value: "...", sub: "Waiting for data", icon: <Wifi size={18} />, color: C.emerald, trend: 0, gradient: "linear-gradient(135deg,#d1fae5,#a7f3d0)" },
  ];

  return (
    <div className="space-y-5">
      {/* hero health */}
      <GradientCard
        gradient="linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #0ea5e9 100%)"
        className="text-white border-0"
      >
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: "radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }} />
        <div className="relative flex items-center justify-between flex-wrap gap-6">
          <div>
            <p className="text-indigo-100 text-sm mb-1">System Health Score</p>
            <div className="flex items-end gap-3">
              <span className="text-6xl font-bold tracking-tight">72</span>
              <span className="text-2xl text-indigo-200 mb-2">/100</span>
            </div>
            <p className="text-indigo-100 text-sm mt-1">Your PC needs some attention — 3 issues found</p>
          </div>
          <div className="flex flex-wrap md:flex-nowrap gap-6 w-full md:w-auto items-center justify-center">
            <RadialGauge value={metrics ? Math.round(metrics.cpu_usage) : 0} label="CPU" color="rgba(255,255,255,0.9)" trackColor="rgba(255,255,255,0.2)" size={90} />
            <RadialGauge value={metrics ? Math.round(metrics.ram_usage) : 0} label="RAM" color="rgba(255,255,255,0.9)" trackColor="rgba(255,255,255,0.2)" size={90} />
            <RadialGauge value={metrics ? Math.round(metrics.disk_usage) : 0} label="Disk" color="rgba(255,255,255,0.9)" trackColor="rgba(255,255,255,0.2)" size={90} />
          </div>
        </div>
        <div className="relative flex flex-wrap gap-3 mt-5 pt-4 border-t border-white/20">
          {[
            { icon: <CheckCircle2 size={13} />, text: "Real-time protection active" },
            { icon: <CheckCircle2 size={13} />, text: "Auto-backup enabled" },
            { icon: <AlertTriangle size={13} />, text: "3 startup items slowing boot" },
            { icon: <AlertTriangle size={13} />, text: "Disk at 78% — consider cleaning" },
          ].map((item) => (
            <div key={item.text} className="flex items-center gap-1.5 text-xs text-indigo-100">
              {item.icon}{item.text}
            </div>
          ))}
        </div>
      </GradientCard>

      {/* stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {STATS.map((s) => (
          <GradientCard key={s.label} gradient={s.gradient}>
            <div className="flex items-start justify-between mb-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${s.color}20`, color: s.color }}>
                {s.icon}
              </div>
              <div className={cn("flex items-center gap-0.5 text-xs font-medium",
                s.trend < 0 ? "text-emerald-600" : s.trend > 0 ? "text-rose-500" : "text-slate-400")}>
                {s.trend !== 0 && (s.trend < 0 ? <ArrowDownRight size={12} /> : <ArrowUpRight size={12} />)}
                {s.trend !== 0 ? `${Math.abs(s.trend)}%` : "—"}
              </div>
            </div>
            <div className="text-2xl font-bold text-slate-800">{s.value}</div>
            <div className="text-xs text-slate-500 mt-0.5">{s.sub}</div>
            <div className="text-xs font-medium mt-2" style={{ color: s.color }}>{s.label}</div>
          </GradientCard>
        ))}
      </div>

      {/* charts + quick actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* CPU chart */}
        <GradientCard className="md:col-span-1" style={{ background: "white", overflow: "hidden" }}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-slate-700">CPU History</span>
            <span className="text-xs text-slate-400">Last 20s</span>
          </div>
          <div className="relative">
            {/* big bg number */}
            <div className="absolute inset-0 flex items-center justify-end pr-2 pointer-events-none select-none overflow-hidden">
              <span
                className="font-black leading-none"
                style={{
                  fontSize: "4.5rem",
                  background: `linear-gradient(180deg, ${C.indigo}22 0%, ${C.indigo}04 100%)`,
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                  letterSpacing: "-0.04em",
                }}
              >
                {cpuData[cpuData.length - 1]?.v}%
              </span>
            </div>
            <ResponsiveContainer width="100%" height={80}>
              <AreaChart data={cpuData} margin={{ top: 0, right: 0, left: -30, bottom: 0 }}>
                <defs>
                  <linearGradient id="cpuGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop key="cpu-stop-top" offset="5%" stopColor={C.indigo} stopOpacity={0.2} />
                    <stop key="cpu-stop-bot" offset="95%" stopColor={C.indigo} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="t" hide />
                <YAxis domain={[0, 100]} hide />
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.12)" }} labelStyle={{ display: "none" }} formatter={(v: number) => [`${v}%`, "CPU"]} />
                <Area type="monotone" dataKey="v" stroke={C.indigo} strokeWidth={2} fill="url(#cpuGrad)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </GradientCard>

        {/* RAM chart */}
        <GradientCard className="md:col-span-1" style={{ background: "white", overflow: "hidden" }}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-slate-700">RAM History</span>
            <span className="text-xs text-slate-400">Last 20s</span>
          </div>
          <div className="relative">
            {/* big bg number */}
            <div className="absolute inset-0 flex items-center justify-end pr-2 pointer-events-none select-none overflow-hidden">
              <span
                className="font-black leading-none"
                style={{
                  fontSize: "4.5rem",
                  background: `linear-gradient(180deg, ${C.violet}22 0%, ${C.violet}04 100%)`,
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                  letterSpacing: "-0.04em",
                }}
              >
                {ramData[ramData.length - 1]?.v}%
              </span>
            </div>
            <ResponsiveContainer width="100%" height={80}>
              <AreaChart data={ramData} margin={{ top: 0, right: 0, left: -30, bottom: 0 }}>
                <defs>
                  <linearGradient id="ramGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop key="ram-stop-top" offset="5%" stopColor={C.violet} stopOpacity={0.2} />
                    <stop key="ram-stop-bot" offset="95%" stopColor={C.violet} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="t" hide />
                <YAxis domain={[0, 100]} hide />
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.12)" }} labelStyle={{ display: "none" }} formatter={(v: number) => [`${v}%`, "RAM"]} />
                <Area type="monotone" dataKey="v" stroke={C.violet} strokeWidth={2} fill="url(#ramGrad)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </GradientCard>

        {/* Disk pie */}
        <GradientCard className="md:col-span-1">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-slate-700">Disk Space</span>
          </div>
          <div className="flex items-center gap-3">
            <PieChart width={80} height={80}>
              <Pie data={[{ v: metrics ? Math.round(metrics.disk_usage) : 0 }, { v: metrics ? 100 - Math.round(metrics.disk_usage) : 100 }]} dataKey="v" cx={35} cy={35} innerRadius={22} outerRadius={36} startAngle={90} endAngle={-270} strokeWidth={0}>
                <Cell key="used" fill={C.amber} />
                <Cell key="free" fill="#f1f5f9" />
              </Pie>
            </PieChart>
            <div>
              <div className="text-xl font-bold text-slate-800">{metrics ? Math.round(metrics.disk_usage) : 0}%</div>
              <div className="text-xs text-slate-500">{metrics ? metrics.used_disk.toFixed(1) : "..."} GB used</div>
              <div className="text-xs text-slate-400">{metrics ? (metrics.total_disk - metrics.used_disk).toFixed(1) : "..."} GB free</div>
            </div>
          </div>
        </GradientCard>
      </div>

      {/* quick actions */}
      <GradientCard>
        <h3 className="text-sm font-semibold text-slate-700 mb-3">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { icon: <Trash2 size={18} />, label: "Clean Junk", sub: "6.8 GB ready", color: C.indigo },
            { icon: <Zap size={18} />, label: "Boost Now", sub: "4 tweaks ready", color: C.violet },
            { icon: <PackageX size={18} />, label: "Fix Startup", sub: "3 items slow", color: C.amber },
            { icon: <Lock size={18} />, label: "Privacy Sweep", sub: "Traces found", color: C.rose },
          ].map((a) => (
            <button
              key={a.label}
              className="flex flex-col items-center gap-2 p-4 rounded-xl border transition-all hover:-translate-y-0.5 hover:shadow-md active:scale-95"
              style={{ background: `${a.color}08`, borderColor: `${a.color}20` }}
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: `${a.color}15`, color: a.color }}>
                {a.icon}
              </div>
              <div className="text-center">
                <div className="text-xs font-semibold text-slate-700">{a.label}</div>
                <div className="text-xs text-slate-400">{a.sub}</div>
              </div>
            </button>
          ))}
        </div>
      </GradientCard>
    </div>
  );
}

// ─── cleaner ──────────────────────────────────────────────────────────────────
function CleanerTab() {
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  const [cleaned, setCleaned] = useState(false);
  const [junkCats, setJunkCats] = useState<JunkItem[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startScan = async () => {
    setDone(false); setCleaned(false); setProgress(0); setScanning(true);
    
    try {
      const results: JunkItem[] = await invoke("scan_junk");
      setJunkCats(results);
      setSelected(Object.fromEntries(results.map((c) => [c.name, true])));
    } catch (e) {
      console.error("Scan failed:", e);
    }

    let p = 0;
    intervalRef.current = setInterval(() => {
      p += Math.random() * 3.5 + 0.8;
      if (p >= 100) { p = 100; clearInterval(intervalRef.current!); setScanning(false); setDone(true); }
      setProgress(Math.min(p, 100));
    }, 50); // faster fake progress
  };

  const doClean = async () => {
    setCleaning(true);
    
    // Attempt real clean via Rust
    try {
      const selectedCats = Object.keys(selected).filter(k => selected[k]);
      await invoke("clean_junk", { categories: selectedCats });
    } catch (e) {
      console.error("Clean failed:", e);
    }
    
    setTimeout(() => { setCleaning(false); setCleaned(true); }, 2400);
  };

  const totalSelected = junkCats.filter((c) => selected[c.name]).reduce((s, c) => s + c.bytes, 0);
  const totalGB = (totalSelected / 1_073_741_824).toFixed(2);
  const totalFiles = junkCats.filter((c) => selected[c.name]).reduce((s, c) => s + c.count, 0);

  return (
    <div className="space-y-5">
      {/* scan card */}
      <GradientCard gradient="linear-gradient(135deg,#f8faff,#f0f4ff)">
        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            <h3 className="text-base font-semibold text-slate-800">Junk File Scanner</h3>
            <p className="text-xs text-slate-500 mt-0.5">Deep scan for all unnecessary files — temporary data, cache, and residual clutter</p>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            {!scanning && !done && (
              <button onClick={startScan}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:shadow-lg hover:-translate-y-0.5 active:scale-95"
                style={{ background: "linear-gradient(135deg,#4f46e5,#7c3aed)", boxShadow: "0 4px 14px rgba(79,70,229,0.4)" }}>
                <Sparkles size={15} /> Start Scan
              </button>
            )}
            {scanning && (
              <button disabled className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold opacity-70 cursor-not-allowed"
                style={{ background: "#ede9fe", color: C.indigo }}>
                <RefreshCw size={15} className="animate-spin" /> Scanning...
              </button>
            )}
            {done && !cleaned && (
              <>
                <button onClick={startScan}
                  className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-semibold border text-slate-600 hover:bg-slate-50 transition">
                  <RotateCcw size={12} /> Rescan
                </button>
                <button onClick={doClean} disabled={cleaning}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:shadow-lg hover:-translate-y-0.5 active:scale-95"
                  style={{ background: cleaning ? "#a5b4fc" : "linear-gradient(135deg,#4f46e5,#7c3aed)", boxShadow: cleaning ? "none" : "0 4px 14px rgba(79,70,229,0.4)" }}>
                  <Trash2 size={15} /> {cleaning ? "Cleaning..." : `Clean ${totalGB} GB`}
                </button>
              </>
            )}
            {cleaned && (
              <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-emerald-700" style={{ background: "#d1fae5" }}>
                <CheckCircle2 size={16} /> Cleaned Successfully!
              </div>
            )}
          </div>
        </div>

        {/* progress */}
        <div className="mb-1 flex justify-between text-xs text-slate-500">
          <span>{scanning ? "Scanning..." : done ? "Scan complete" : "Ready"}</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="w-full h-2 rounded-full bg-slate-100 mb-4">
          <div className="h-2 rounded-full transition-all duration-200"
            style={{ width: `${progress}%`, background: "linear-gradient(90deg,#4f46e5,#7c3aed,#0ea5e9)" }} />
        </div>

        <ScanAnimation scanning={scanning} progress={progress} />
      </GradientCard>

      {/* categories */}
      {(done || cleaned) && (
        <GradientCard>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-semibold text-slate-800">
                {cleaned ? "✅ Cleaned! Space Freed" : "Found — Select to Clean"}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {totalFiles.toLocaleString()} files · {totalGB} GB selected
              </p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setSelected(Object.fromEntries(junkCats.map((c) => [c.name, true])))}
                className="text-xs px-3 py-1.5 rounded-lg border text-slate-600 hover:bg-slate-50 transition">Select All</button>
              <button onClick={() => setSelected(Object.fromEntries(junkCats.map((c) => [c.name, false])))}
                className="text-xs px-3 py-1.5 rounded-lg border text-slate-600 hover:bg-slate-50 transition">None</button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {junkCats.map((cat) => {
              const maxBytes = Math.max(...junkCats.map(c => c.bytes), 1);
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
                    <span className="text-sm font-medium text-slate-700 flex-1">{cat.name}</span>
                    <div className={cn("w-4 h-4 rounded flex items-center justify-center border transition-all",
                      isOn ? "border-0" : "border-slate-300")}
                      style={isOn ? { background: cat.color } : {}}>
                      {isOn && <CheckCircle2 size={12} color="white" />}
                    </div>
                  </div>
                  <div className="flex justify-between text-xs text-slate-400 mb-1.5">
                    <span>{cat.count.toLocaleString()} files</span>
                    <span style={{ color: cat.color }}>{cat.size}</span>
                  </div>
                  <div className="w-full h-1.5 rounded-full bg-slate-100">
                    <div className="h-1.5 rounded-full transition-all" style={{ width: `${pct}%`, background: cat.color }} />
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

// ─── booster ──────────────────────────────────────────────────────────────────
function BoosterTab() {
  const [boosted, setBoosted] = useState<Record<string, boolean>>({});
  const [boosting, setBoosting] = useState<string | null>(null);
  const [mode, setMode] = useState<"balanced" | "performance" | "gaming">("balanced");

  useEffect(() => {
    invoke("set_power_plan", { plan: mode }).catch(console.error);
  }, [mode]);

  const BOOSTS = [
    { id: "ram", icon: <MemoryStick size={18} />, title: "RAM Optimizer", desc: "Flush standby list and free unused memory pages", gain: "+1.4 GB freed", color: C.violet, category: "Memory" },
    { id: "cpu", icon: <Cpu size={18} />, title: "CPU Priority Manager", desc: "Elevate priority for active foreground processes", gain: "~12% snappier", color: C.indigo, category: "Processor" },
    { id: "net", icon: <Globe size={18} />, title: "Network Tweaker", desc: "Optimize TCP/IP stack, DNS cache & buffer sizes", gain: "−18ms latency", color: C.cyan, category: "Network" },
    { id: "visual", icon: <Monitor size={18} />, title: "Visual Effects Trim", desc: "Turn off non-essential animations and transparency", gain: "+6% GPU free", color: C.amber, category: "Graphics" },
    { id: "power", icon: <Zap size={18} />, title: "High Performance Mode", desc: "Switch Windows power plan to maximum performance", gain: "Max clock speed", color: C.rose, category: "Power" },
    { id: "disk", icon: <HardDrive size={18} />, title: "Disk I/O Optimizer", desc: "TRIM SSD, optimize prefetch and SuperFetch settings", gain: "−22% I/O wait", color: C.emerald, category: "Storage" },
    { id: "game", icon: <Activity size={18} />, title: "Game Mode Enhancer", desc: "Redirect resources to foreground game processes", gain: "Smoother FPS", color: C.pink, category: "Gaming" },
    { id: "temp", icon: <Thermometer size={18} />, title: "Thermal Manager", desc: "Optimize fan curves and thermal throttle limits", gain: "−4°C average", color: C.amber, category: "Cooling" },
  ];

  const applyBoost = async (id: string) => {
    setBoosting(id);
    try {
      await invoke("apply_boost", { profile: mode });
      setBoosted((prev) => ({ ...prev, [id]: true }));
    } catch(e) {
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
      {/* mode selector */}
      <GradientCard gradient="linear-gradient(135deg,#f8faff,#f0f4ff)">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h3 className="text-base font-semibold text-slate-800">Optimization Profile</h3>
            <p className="text-xs text-slate-500 mt-0.5">Choose how aggressively to optimize your system</p>
          </div>
          <div className="flex gap-2 p-1 rounded-xl bg-slate-100">
            {(["balanced", "performance", "gaming"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className="px-4 py-1.5 rounded-lg text-xs font-semibold transition-all capitalize"
                style={mode === m
                  ? { background: "white", color: C.indigo, boxShadow: "0 1px 4px rgba(0,0,0,0.1)" }
                  : { color: "#64748b" }
                }
              >
                {m === "balanced" ? "⚖️ Balanced" : m === "performance" ? "🚀 Performance" : "🎮 Gaming"}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-4 flex items-center gap-4">
          <div className="flex-1 h-3 rounded-full bg-slate-100 overflow-hidden">
            <div className="h-3 rounded-full transition-all duration-700"
              style={{ width: `${(doneCount / BOOSTS.length) * 100}%`, background: "linear-gradient(90deg,#4f46e5,#7c3aed)" }} />
          </div>
          <div className="text-right flex-shrink-0">
            <span className="text-sm font-bold text-slate-700">{doneCount}/{BOOSTS.length}</span>
            <span className="text-xs text-slate-400 ml-1">applied</span>
          </div>
          {doneCount < BOOSTS.length ? (
            <button onClick={applyAll}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white flex-shrink-0 transition-all hover:shadow-lg hover:-translate-y-0.5 active:scale-95"
              style={{ background: "linear-gradient(135deg,#4f46e5,#7c3aed)", boxShadow: "0 4px 14px rgba(79,70,229,0.35)" }}>
              <Zap size={14} /> Apply All
            </button>
          ) : (
            <div className="flex items-center gap-1.5 text-emerald-600 text-sm font-semibold px-3">
              <CheckCircle2 size={16} /> +{scoreBoost} pts
            </div>
          )}
        </div>
      </GradientCard>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {BOOSTS.map((b) => {
          const done = boosted[b.id];
          const loading = boosting === b.id;
          return (
            <GradientCard key={b.id}
              style={{ background: done ? `${b.color}05` : "white", borderColor: done ? `${b.color}25` : "#e2e8f0" }}
            >
              <div className="flex gap-4 items-start">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: `${b.color}15`, color: b.color }}>
                  {b.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div>
                      <span className="text-sm font-semibold text-slate-800">{b.title}</span>
                      <span className="ml-2 text-xs px-1.5 py-0.5 rounded text-slate-400 bg-slate-100">{b.category}</span>
                    </div>
                    {done ? (
                      <CheckCircle2 size={17} className="flex-shrink-0 mt-0.5" style={{ color: C.emerald }} />
                    ) : (
                      <button onClick={() => applyBoost(b.id)} disabled={loading}
                        className="text-xs px-3 py-1.5 rounded-lg font-semibold flex-shrink-0 transition-all hover:shadow-sm active:scale-95"
                        style={{ background: `${b.color}15`, color: b.color, border: `1px solid ${b.color}25` }}>
                        {loading ? <RefreshCw size={12} className="animate-spin" /> : "Apply"}
                      </button>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mb-2">{b.desc}</p>
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                    style={{ background: `${b.color}12`, color: b.color }}>
                    {b.gain}
                  </span>
                </div>
              </div>
            </GradientCard>
          );
        })}
      </div>
    </div>
  );
}

// ─── startup ──────────────────────────────────────────────────────────────────
function StartupTab() {
  const [items, setItems] = useState<StartupItem[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    invoke<StartupItem[]>("get_startup_items").then((res) => {
      // Mock metrics for real items
      const enriched = res.map(item => ({
        ...item,
        impact: Math.random() > 0.6 ? "High" : "Medium",
        delay: Math.random() * 4,
        publisher: item.command.includes("Microsoft") ? "Microsoft Corp" : "Unknown",
        icon: "⚡"
      }));
      setItems(enriched);
    }).catch(console.error);
  }, []);

  const toggle = async (name: string, is_hkcu: boolean, current_enabled: boolean) => {
    try {
      await invoke("toggle_startup_item", { name, isHkcu: is_hkcu, enable: !current_enabled });
      setItems((prev) => prev.map((item) => item.name === name ? { ...item, enabled: !item.enabled } : item));
    } catch(e) {
      console.error("Failed to toggle:", e);
      alert("Failed to toggle: " + e);
    }
  };

  const filtered = items.filter((i) =>
    i.name.toLowerCase().includes(search.toLowerCase()) ||
    (i.publisher && i.publisher.toLowerCase().includes(search.toLowerCase()))
  );

  const disabledCount = items.filter((i) => !i.enabled).length;
  const timeSaved = items.filter((i) => !i.enabled).reduce((s, i) => s + (i.delay || 0), 0).toFixed(1);
  const bootTime = (items.filter((i) => i.enabled).reduce((s, i) => s + (i.delay || 0), 0) + 8).toFixed(1);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-4">
        {[
          { icon: <Clock size={18} />, label: "Est. Boot Time", value: `${bootTime}s`, sub: "With enabled items", color: C.indigo },
          { icon: <TrendingUp size={18} />, label: "Time Saved", value: `${timeSaved}s`, sub: `${disabledCount} items disabled`, color: C.emerald },
          { icon: <PackageX size={18} />, label: "High Impact", value: `${items.filter(i => i.impact === "High" && i.enabled).length}`, sub: "Items still enabled", color: C.rose },
        ].map((s) => (
          <GradientCard key={s.label} style={{ background: `${s.color}06`, borderColor: `${s.color}15` }}>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${s.color}15`, color: s.color }}>
                {s.icon}
              </div>
              <span className="text-xs font-medium text-slate-500">{s.label}</span>
            </div>
            <div className="text-2xl font-bold text-slate-800">{s.value}</div>
            <div className="text-xs text-slate-400 mt-0.5">{s.sub}</div>
          </GradientCard>
        ))}
      </div>

      <GradientCard>
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-xl border bg-slate-50">
            <Search size={14} className="text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search programs..."
              className="flex-1 text-sm bg-transparent outline-none text-slate-700 placeholder-slate-400"
            />
          </div>
          <button
            onClick={() => setItems((prev) => prev.map((i) => ({ ...i, enabled: false })))}
            className="px-4 py-2 rounded-xl text-xs font-semibold border text-slate-600 hover:bg-slate-50 transition whitespace-nowrap"
          >
            Disable All High Impact
          </button>
        </div>

        <div className="space-y-2">
          {filtered.map((item) => (
            <div
              key={item.name}
              className="flex items-center gap-4 p-3.5 rounded-xl border transition-all hover:bg-slate-50"
              style={{ borderColor: item.enabled ? "#e2e8f0" : "#f1f5f9", background: item.enabled ? "white" : "#fafafa" }}
            >
              <span className="text-2xl">{item.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-slate-800">{item.name}</div>
                <div className="text-xs text-slate-400 truncate" title={item.command}>{item.publisher} · Boot delay: +{item.delay?.toFixed(1)}s</div>
              </div>
              <PillBadge label={item.impact || "Low"} color="" />
              <Toggle on={item.enabled} onChange={() => toggle(item.name, item.is_hkcu, item.enabled)} />
            </div>
          ))}
        </div>
      </GradientCard>
    </div>
  );
}

// ─── privacy ──────────────────────────────────────────────────────────────────
function PrivacyTab() {
  const [items, setItems] = useState(PRIVACY_ITEMS);
  const [sweeping, setSweeping] = useState(false);
  const [swept, setSwept] = useState(false);
  const [selected, setSelected] = useState<Record<string, boolean>>(
    Object.fromEntries(PRIVACY_ITEMS.map((i) => [i.id, true]))
  );

  const toggle = (id: string) => setSelected((prev) => ({ ...prev, [id]: !prev[id] }));

  const doSweep = async () => {
    setSweeping(true);
    
    // Attempt real sweep via Rust
    try {
      const selectedItems = Object.keys(selected).filter(k => selected[k]);
      await invoke("sweep_privacy", { items: selectedItems });
    } catch (e) {
      console.error("Sweep failed:", e);
    }
    
    setTimeout(() => { setSweeping(false); setSwept(true); }, 2000);
  };

  const selectedCount = Object.values(selected).filter(Boolean).length;

  return (
    <div className="space-y-5">
      <GradientCard gradient="linear-gradient(135deg,#fff1f2,#fce7f3)">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Lock size={18} style={{ color: C.rose }} />
              <h3 className="text-base font-semibold text-slate-800">Privacy Scanner</h3>
            </div>
            <p className="text-xs text-slate-500">Finds browsing history, search traces, saved passwords, and tracking data left on your PC</p>
          </div>
          {!swept ? (
            <button onClick={doSweep} disabled={sweeping || selectedCount === 0}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-white flex-shrink-0 transition-all hover:shadow-lg hover:-translate-y-0.5 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
              style={{ background: sweeping ? "#fda4af" : "linear-gradient(135deg,#f43f5e,#ec4899)", boxShadow: sweeping ? "none" : "0 4px 14px rgba(244,63,94,0.35)" }}>
              {sweeping ? <><RefreshCw size={15} className="animate-spin" /> Sweeping...</> : <><Eye size={15} /> Sweep {selectedCount} Items</>}
            </button>
          ) : (
            <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-emerald-700 flex-shrink-0" style={{ background: "#d1fae5" }}>
              <EyeOff size={16} /> Privacy Cleared!
            </div>
          )}
        </div>
      </GradientCard>

      <GradientCard>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-slate-700">Privacy Traces Found</h3>
          <span className="text-xs text-slate-400">{selectedCount} selected for removal</span>
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
              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: item.found ? item.color : "#cbd5e1" }} />
              <div className="flex-1">
                <div className="text-sm font-medium text-slate-700">{item.label}</div>
                <div className="text-xs text-slate-400">{item.desc}</div>
              </div>
              {item.found && (
                <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: `${item.color}12`, color: item.color }}>
                  Found
                </span>
              )}
              <Toggle on={selected[item.id]} onChange={() => toggle(item.id)} />
            </div>
          ))}
        </div>
      </GradientCard>

      <GradientCard>
        <h3 className="text-sm font-semibold text-slate-700 mb-3">Privacy Protection Tips</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            { icon: "🔒", tip: "Enable BitLocker encryption on your drive for full data protection." },
            { icon: "🌐", tip: "Use a private DNS (like Cloudflare 1.1.1.1) to prevent ISP tracking." },
            { icon: "🍪", tip: "Clear cookies weekly to remove cross-site tracking data." },
            { icon: "📵", tip: "Review app permissions — revoke access to camera and mic you don't need." },
          ].map((t) => (
            <div key={t.tip} className="flex gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
              <span className="text-lg">{t.icon}</span>
              <p className="text-xs text-slate-600">{t.tip}</p>
            </div>
          ))}
        </div>
      </GradientCard>
    </div>
  );
}

// ─── settings ────────────────────────────────────────────────────────────────
function SettingsTab() {
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [updateMsg, setUpdateMsg] = useState("");
  
  const [settings, setSettings] = useState({
    startWithWindows: false,
    minimizeToTray: true,
    autoUpdate: true,
    autoClean: false,
    realTimeMonitoring: true,
    contextMenu: true,
    notifications: true,
    soundEffects: false,
  });

  useEffect(() => {
    const loadSettings = async () => {
      const saved = await store.get("user-settings") as {
        startWithWindows: boolean,
        minimizeToTray: boolean,
        autoUpdate: boolean,
        autoClean: boolean,
        realTimeMonitoring: boolean,
        contextMenu: boolean,
        notifications: boolean,
        soundEffects: boolean
      } | null;
      
      const autostart = await isEnabled();

      if (saved) {
        setSettings({ ...saved, startWithWindows: autostart });
      } else {
        setSettings(prev => ({ ...prev, startWithWindows: autostart }));
      }
    };
    loadSettings();
  }, []);

  const toggle = async (key: keyof typeof settings) => {
    const newVal = !settings[key];
    setSettings((prev) => ({ ...prev, [key]: newVal }));

    if (key === "startWithWindows") {
      if (newVal) await enable();
      else await disable();
    }

    await store.set("user-settings", { ...settings, [key]: newVal });
    await store.save();
  };

  const checkUpdates = async () => {
    setCheckingUpdate(true);
    setUpdateMsg("");
    try {
      const update = await check();
      if (update) {
        setUpdateMsg(`Found ${update.version}! Downloading...`);
        let downloaded = 0;
        let contentLength = 0;
        await update.downloadAndInstall((event) => {
          switch (event.event) {
            case 'Started':
              contentLength = event.data.contentLength || 0;
              break;
            case 'Progress':
              downloaded += event.data.chunkLength;
              setUpdateMsg(`Downloading... ${Math.round((downloaded / contentLength) * 100)}%`);
              break;
            case 'Finished':
              setUpdateMsg("Installing update...");
              break;
          }
        });
        setUpdateMsg("Update installed. Restarting...");
        setTimeout(() => relaunch(), 1500);
      } else {
        setUpdateMsg("You're on the latest version.");
      }
    } catch (e) {
      console.error(e);
      setUpdateMsg("Failed to check for updates.");
    }
    setCheckingUpdate(false);
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* General Settings */}
        <GradientCard>
          <div className="flex items-center gap-2 mb-4">
            <Settings size={18} style={{ color: C.indigo }} />
            <h3 className="text-sm font-semibold text-slate-800">General Preferences</h3>
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 transition cursor-pointer" onClick={() => toggle("startWithWindows")}>
              <div>
                <div className="text-sm font-medium text-slate-700">Start with Windows</div>
                <div className="text-xs text-slate-400">Launch automatically when PC boots</div>
              </div>
              <Toggle on={settings.startWithWindows} onChange={() => {}} />
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 transition cursor-pointer" onClick={() => toggle("minimizeToTray")}>
              <div>
                <div className="text-sm font-medium text-slate-700">Minimize to Tray</div>
                <div className="text-xs text-slate-400">Keep running in background when closed</div>
              </div>
              <Toggle on={settings.minimizeToTray} onChange={() => {}} />
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 transition cursor-pointer" onClick={() => toggle("contextMenu")}>
              <div>
                <div className="text-sm font-medium text-slate-700">Context Menu Integration</div>
                <div className="text-xs text-slate-400">Add "Clean with WinCleaner" to right-click menu</div>
              </div>
              <Toggle on={settings.contextMenu} onChange={() => {}} />
            </div>
          </div>
        </GradientCard>

        {/* Automation & Updates */}
        <GradientCard>
          <div className="flex items-center gap-2 mb-4">
            <RefreshCw size={18} style={{ color: C.emerald }} />
            <h3 className="text-sm font-semibold text-slate-800">Automation</h3>
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 transition cursor-pointer" onClick={() => toggle("autoClean")}>
              <div>
                <div className="text-sm font-medium text-slate-700">Auto-Clean Schedule</div>
                <div className="text-xs text-slate-400">Clean junk files automatically every week</div>
              </div>
              <Toggle on={settings.autoClean} onChange={() => {}} />
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 transition cursor-pointer" onClick={() => toggle("realTimeMonitoring")}>
              <div>
                <div className="text-sm font-medium text-slate-700">Real-time Monitoring</div>
                <div className="text-xs text-slate-400">Alert when disk space is critically low</div>
              </div>
              <Toggle on={settings.realTimeMonitoring} onChange={() => {}} />
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 transition cursor-pointer" onClick={() => toggle("autoUpdate")}>
              <div>
                <div className="text-sm font-medium text-slate-700">Automatic Updates</div>
                <div className="text-xs text-slate-400">Install new versions silently in background</div>
              </div>
              <Toggle on={settings.autoUpdate} onChange={() => {}} />
            </div>
          </div>
        </GradientCard>

        {/* Appearance & Notifications */}
        <GradientCard>
          <div className="flex items-center gap-2 mb-4">
            <Bell size={18} style={{ color: C.amber }} />
            <h3 className="text-sm font-semibold text-slate-800">Alerts & Sounds</h3>
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 transition cursor-pointer" onClick={() => toggle("notifications")}>
              <div>
                <div className="text-sm font-medium text-slate-700">Push Notifications</div>
                <div className="text-xs text-slate-400">Show system tray alerts for important events</div>
              </div>
              <Toggle on={settings.notifications} onChange={() => {}} />
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 transition cursor-pointer" onClick={() => toggle("soundEffects")}>
              <div>
                <div className="text-sm font-medium text-slate-700">Sound Effects</div>
                <div className="text-xs text-slate-400">Play sounds when scans or cleans finish</div>
              </div>
              <Toggle on={settings.soundEffects} onChange={() => {}} />
            </div>
          </div>
        </GradientCard>

        {/* About & License */}
        <GradientCard gradient="linear-gradient(135deg,#f8faff,#f0f4ff)">
          <div className="flex items-center gap-2 mb-4">
            <Shield size={18} style={{ color: C.indigo }} />
            <h3 className="text-sm font-semibold text-slate-800">About WinCleaner</h3>
          </div>
          <div className="flex flex-col items-center justify-center py-2">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3" style={{ background: "linear-gradient(135deg,#4f46e5,#7c3aed)", boxShadow: "0 4px 12px rgba(79,70,229,0.35)" }}>
              <Shield size={24} color="white" />
            </div>
            <div className="text-base font-bold text-slate-800">WinCleaner Pro</div>
            <div className="text-xs text-slate-500 mb-2">Version 0.1.0</div>
            {updateMsg && <div className="text-xs text-indigo-600 mb-2 font-medium">{updateMsg}</div>}
            <button onClick={checkUpdates} disabled={checkingUpdate} className="px-5 py-2 rounded-xl text-xs font-semibold text-indigo-600 bg-indigo-50 border border-indigo-100 hover:bg-indigo-100 transition active:scale-95 disabled:opacity-50">
              {checkingUpdate ? "Checking..." : "Check for Updates"}
            </button>
          </div>
        </GradientCard>
      </div>
    </div>
  );
}

// ─── history ─────────────────────────────────────────────────────────────────
function HistoryTab() {
  const [history, setHistory] = useState<SessionLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadHistory = async () => {
      try {
        const historyStore = await load("history.json");
        const logs = await historyStore.get<SessionLog[]>("logs") || [];
        setHistory(logs);
      } catch (error) {
        console.error("Failed to load history", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadHistory();
  }, []);

  return (
    <div className="space-y-5">
      {isLoading ? (
        <div className="py-10 text-center text-slate-400 text-sm">Loading history...</div>
      ) : history.length === 0 ? (
        <GradientCard className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-slate-50 flex items-center justify-center mb-4 text-slate-300">
            <BarChart3 size={32} />
          </div>
          <div className="text-slate-500 font-medium mb-1">Belum ada riwayat pembersihan.</div>
          <div className="text-sm text-slate-400">Jalankan pemindaian pertama Anda!</div>
        </GradientCard>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-4">
            {[
              { icon: <HardDrive size={18} />, label: "Total Freed", value: `${history.reduce((acc, curr) => acc + parseFloat(curr.freed), 0).toFixed(1)} GB`, sub: "All time", color: C.indigo },
              { icon: <BarChart3 size={18} />, label: "Scans Run", value: history.length.toString(), sub: "Last 30 days", color: C.violet },
              { icon: <Star size={18} />, label: "Issues Fixed", value: history.reduce((acc, curr) => acc + curr.fixed, 0).toString(), sub: "All time", color: C.amber },
            ].map((s) => (
              <GradientCard key={s.label} style={{ background: `${s.color}05`, borderColor: `${s.color}15` }}>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${s.color}15`, color: s.color }}>
                    {s.icon}
                  </div>
                  <span className="text-xs font-medium text-slate-500">{s.label}</span>
                </div>
                <div className="text-2xl font-bold text-slate-800">{s.value}</div>
                <div className="text-xs text-slate-400 mt-0.5">{s.sub}</div>
              </GradientCard>
            ))}
          </div>

          <GradientCard>
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Space Freed Per Month</h3>
            <div className="py-10 text-center text-slate-400 text-sm">Data grafik akan muncul setelah beberapa pembersihan.</div>
          </GradientCard>

          <GradientCard>
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Session Log</h3>
            <div className="space-y-2">
              {history.map((h, i) => (
                <div key={i} className="flex items-center gap-4 p-3.5 rounded-xl border border-slate-100 hover:bg-slate-50 transition">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: h.type === "Deep Clean" ? `${C.indigo}10` : `${C.emerald}10`, color: h.type === "Deep Clean" ? C.indigo : C.emerald }}>
                    {h.type === "Deep Clean" ? <Sparkles size={15} /> : <Zap size={15} />}
                  </div>
                  <div className="flex-1">
                    <div className="text-sm font-medium text-slate-700">{h.date}</div>
                    <div className="text-xs text-slate-400">{h.type} · {h.duration} · {h.fixed} issues fixed</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold" style={{ color: C.indigo }}>{h.freed}</div>
                    <div className="text-xs text-slate-400">freed</div>
                  </div>
                </div>
              ))}
            </div>
          </GradientCard>
        </>
      )}
    </div>
  );
}

// ─── nav config ───────────────────────────────────────────────────────────────
const NAV: { id: Tab; label: string; icon: React.ReactNode; badge?: number }[] = [
  { id: "dashboard", label: "Dashboard", icon: <Monitor size={16} /> },
  { id: "cleaner", label: "Cleaner", icon: <Trash2 size={16} />, badge: 3 },
  { id: "booster", label: "Booster", icon: <Zap size={16} /> },
  { id: "startup", label: "Startup", icon: <PackageX size={16} />, badge: 3 },
  { id: "privacy", label: "Privacy", icon: <Lock size={16} />, badge: 7 },
  { id: "history", label: "History", icon: <BarChart3 size={16} /> },
  { id: "settings", label: "Settings", icon: <Settings size={16} /> },
];

const TAB_DESC: Record<Tab, string> = {
  dashboard: "System overview and real-time health metrics",
  cleaner: "Scan and remove junk files to free up disk space",
  booster: "Tune Windows settings for maximum performance",
  startup: "Manage programs that launch automatically at boot",
  privacy: "Find and erase privacy traces and tracking data",
  history: "View past cleaning and optimization sessions",
  settings: "Configure application preferences and automation",
};

// ─── app ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [isAdmin, setIsAdmin] = useState(false);
  
  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const adminStatus = await invoke<boolean>("is_admin");
        setIsAdmin(adminStatus);
      } catch (error) {
        console.error("Failed to check admin status", error);
      }
    };
    checkAdmin();
  }, []);

  const [tab, setTab] = useState<Tab>("dashboard");
  const [time, setTime] = useState(new Date());
  const [showNotif, setShowNotif] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);

  const unreadCount = notifications.filter(n => n.unread).length;

  useEffect(() => {
    let unlisten: () => void;
    let hasNotifiedDisk = false;

    const setup = async () => {
      unlisten = await listen<any>("system-metrics", (event) => {
        const metrics = event.payload;
        if (metrics.disk_usage > 80 && !hasNotifiedDisk) {
          hasNotifiedDisk = true;
          setNotifications(prev => [{
            id: Date.now(),
            title: "Disk Space Low",
            desc: `C: Drive is at ${Math.round(metrics.disk_usage)}% capacity.`,
            time: "Just now",
            unread: true
          }, ...prev]);
        }
      });
    };
    setup();

    return () => {
      if (unlisten) unlisten();
    };
  }, []);

  useEffect(() => {
    const handleGlobalClick = () => setShowNotif(false);
    if (showNotif) {
      window.addEventListener("click", handleGlobalClick);
    }
    return () => window.removeEventListener("click", handleGlobalClick);
  }, [showNotif]);

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "#f0f4ff", fontFamily: "'Plus Jakarta Sans', 'Inter', system-ui, sans-serif" }}
    >
      {/* topbar */}
      <div className="flex items-center justify-between px-6 py-3 border-b bg-white/80 backdrop-blur-md flex-shrink-0"
        style={{ borderColor: "#e2e8f0" }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: "linear-gradient(135deg,#4f46e5,#7c3aed)", boxShadow: "0 4px 12px rgba(79,70,229,0.35)" }}>
            <Shield size={17} color="white" />
          </div>
          <div>
            <span className="text-sm font-bold text-slate-800">WinCleaner</span>
            <span className="text-sm font-bold ml-0.5" style={{ color: C.indigo }}>Pro</span>
            <span className="ml-2 text-xs px-1.5 py-0.5 rounded font-medium"
              style={{ background: "#ede9fe", color: C.indigo }}>v4.2.1</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {isAdmin ? (
            <div className="flex items-center gap-1.5 text-xs font-medium text-amber-700 px-3 py-1.5 rounded-full"
              style={{ background: "#fef3c7", border: "1px solid #fde68a" }}>
              <div className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              Administrator Mode
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-xs font-medium text-emerald-600 px-3 py-1.5 rounded-full"
              style={{ background: "#d1fae5", border: "1px solid #a7f3d0" }}>
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Standard Mode
            </div>
          )}
          <span className="text-xs text-slate-400 font-mono">{time.toLocaleTimeString()}</span>
          
          <div className="relative" onClick={(e) => e.stopPropagation()}>
            <button 
              className={cn("relative w-8 h-8 rounded-lg flex items-center justify-center transition", showNotif ? "bg-slate-100 text-slate-700" : "text-slate-500 hover:bg-slate-100")}
              onClick={() => setShowNotif(!showNotif)}
            >
              <Bell size={16} />
              {unreadCount > 0 && <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 border-2 border-white" />}
            </button>
            
            {showNotif && (
              <div className="absolute right-0 top-full mt-2 w-80 rounded-2xl bg-white/95 backdrop-blur-md shadow-xl border border-slate-200 overflow-hidden z-50">
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50/50">
                  <span className="text-sm font-semibold text-slate-800">Notifications</span>
                  {notifications.length > 0 && (
                    <button onClick={() => setNotifications([])} className="text-xs font-medium text-slate-500 hover:text-slate-700 transition">
                      Clear all
                    </button>
                  )}
                </div>
                <div className="max-h-[300px] overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-slate-400">
                      <Bell size={24} className="mb-2 opacity-50" />
                      <span className="text-xs text-center">Belum ada notifikasi baru.</span>
                    </div>
                  ) : (
                    <div className="flex flex-col">
                      {notifications.map(n => (
                        <div 
                          key={n.id} 
                          className={cn("px-4 py-3 border-b border-slate-50 last:border-0 hover:bg-slate-50 transition cursor-default", n.unread ? "bg-indigo-50/30" : "")} 
                          onClick={() => setNotifications(prev => prev.map(x => x.id === n.id ? {...x, unread: false} : x))}
                        >
                          <div className="flex gap-3">
                            <div className={cn("w-2 h-2 rounded-full mt-1.5 flex-shrink-0 transition-all", n.unread ? "bg-indigo-500" : "bg-transparent")} />
                            <div>
                              <div className={cn("text-sm mb-0.5 transition-colors", n.unread ? "font-semibold text-indigo-900" : "font-medium text-slate-800")}>{n.title}</div>
                              <div className="text-xs text-slate-500 leading-snug">{n.desc}</div>
                              <div className="text-[10px] text-slate-400 mt-1 font-medium">{n.time}</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <button 
            className={cn("w-8 h-8 rounded-lg flex items-center justify-center transition", tab === "settings" ? "bg-slate-100 text-slate-700" : "text-slate-500 hover:bg-slate-100")}
            onClick={() => setTab("settings")}
          >
            <Settings size={16} />
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* sidebar */}
        <aside className="w-52 flex-shrink-0 border-r bg-white/70 backdrop-blur-sm flex flex-col py-4 px-3 gap-0.5"
          style={{ borderColor: "#e2e8f0" }}>
          {NAV.map((n) => {
            const active = tab === n.id;
            return (
              <button
                key={n.id}
                onClick={() => setTab(n.id)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all relative text-left"
                style={active
                  ? { background: "linear-gradient(135deg,#ede9fe,#ddd6fe)", color: C.indigo, fontWeight: 600 }
                  : { color: "#64748b" }
                }
              >
                <span style={active ? { color: C.indigo } : { color: "#94a3b8" }}>{n.icon}</span>
                <span className="flex-1">{n.label}</span>
                {n.badge && (
                  <span className="text-xs px-1.5 py-0.5 rounded-full font-semibold"
                    style={active
                      ? { background: C.indigo, color: "white" }
                      : { background: "#f1f5f9", color: "#64748b" }}>
                    {n.badge}
                  </span>
                )}
              </button>
            );
          })}

          <div className="mt-auto px-1">
            {/* score card */}
            <div className="rounded-xl p-3.5 mb-2"
              style={{ background: "linear-gradient(135deg,#4f46e5,#7c3aed)", boxShadow: "0 4px 14px rgba(79,70,229,0.3)" }}>
              <div className="flex items-center gap-2 mb-2">
                <Sparkles size={13} color="rgba(255,255,255,0.8)" />
                <span className="text-xs text-indigo-100 font-medium">Health Score</span>
              </div>
              <div className="text-2xl font-bold text-white">72 / 100</div>
              <div className="text-xs text-indigo-200 mt-0.5">Good — 3 issues</div>
              <div className="w-full h-1.5 rounded-full bg-white/20 mt-2">
                <div className="h-1.5 rounded-full bg-white/80" style={{ width: "72%" }} />
              </div>
            </div>

            {/* last scan */}
            <div className="rounded-xl p-3 border border-slate-100 bg-slate-50 text-xs">
              <div className="text-slate-400 mb-1">Last cleaned</div>
              <div className="font-semibold text-slate-700">Belum ada</div>
              <div className="text-slate-400">0 GB freed</div>
            </div>
          </div>
        </aside>

        {/* main */}
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-4xl mx-auto">
            <div className="mb-6">
              <h1 className="text-xl font-bold text-slate-800">
                {NAV.find((n) => n.id === tab)?.label}
              </h1>
              <p className="text-sm text-slate-500 mt-0.5">{TAB_DESC[tab]}</p>
            </div>

            {tab === "dashboard" && <DashboardTab />}
            {tab === "cleaner" && <CleanerTab />}
            {tab === "booster" && <BoosterTab />}
            {tab === "startup" && <StartupTab />}
            {tab === "privacy" && <PrivacyTab />}
            {tab === "history" && <HistoryTab />}
            {tab === "settings" && <SettingsTab />}
          </div>
        </main>
      </div>
    </div>
  );
}

import React, { useState, useEffect, Suspense, lazy } from "react";
import { invoke } from "@tauri-apps/api/core";
import { getVersion, getName } from "@tauri-apps/api/app";
import { listen } from "@tauri-apps/api/event";
import { load } from "@tauri-apps/plugin-store";
import { useTranslation } from "react-i18next";
import {
  Monitor,
  Trash2,
  Zap,
  PackageX,
  Lock,
  Activity,
  BarChart3,
  Settings,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { MainLayout } from "./layouts/MainLayout";
import { isTauri } from "./utils/tauri";
import { useCleanerStore } from "./store/useCleanerStore";
import {
  SystemMetrics,
  StartupItem,
  UserSettings,
  DEFAULT_USER_SETTINGS,
} from "../types";

const DashboardTab = lazy(() =>
  import("./features/DashboardTab").then((m) => ({ default: m.DashboardTab }))
);
const CleanerTab = lazy(() =>
  import("./features/CleanerTab").then((m) => ({ default: m.CleanerTab }))
);
const BoosterTab = lazy(() =>
  import("./features/BoosterTab").then((m) => ({ default: m.BoosterTab }))
);
const StartupTab = lazy(() =>
  import("./features/StartupTab").then((m) => ({ default: m.StartupTab }))
);
const PrivacyTab = lazy(() =>
  import("./features/PrivacyTab").then((m) => ({ default: m.PrivacyTab }))
);
const HistoryTab = lazy(() =>
  import("./features/HistoryTab").then((m) => ({ default: m.HistoryTab }))
);
const SettingsTab = lazy(() =>
  import("./features/SettingsTab").then((m) => ({ default: m.SettingsTab }))
);
const DiagnosticsTab = lazy(() =>
  import("./features/DiagnosticsTab").then((m) => ({ default: m.DiagnosticsTab }))
);

type Tab =
  | "dashboard"
  | "cleaner"
  | "booster"
  | "startup"
  | "privacy"
  | "history"
  | "settings"
  | "diagnostics";

const NAV: { id: Tab; label: string; icon: React.ReactNode; badge?: number }[] = [
  { id: "dashboard", label: "Dashboard", icon: <Monitor size={16} /> },
  { id: "cleaner", label: "Cleaner", icon: <Trash2 size={16} />, badge: 3 },
  { id: "booster", label: "Booster", icon: <Zap size={16} /> },
  { id: "startup", label: "Startup", icon: <PackageX size={16} />, badge: 3 },
  { id: "privacy", label: "Privacy", icon: <Lock size={16} />, badge: 0 },
  { id: "diagnostics", label: "Diagnostics", icon: <Activity size={16} /> },
  { id: "history", label: "History", icon: <BarChart3 size={16} /> },
  { id: "settings", label: "Settings", icon: <Settings size={16} /> },
];

const TAB_DESC: Record<Tab, string> = {
  dashboard: "System overview and real-time health metrics",
  cleaner: "Scan and remove junk files to free up disk space",
  booster: "Tune Windows settings for maximum performance",
  startup: "Manage programs that launch automatically at boot",
  privacy: "Find and erase privacy traces and tracking data",
  diagnostics: "In-depth resource telemetry & health analysis",
  history: "View past cleaning and optimization sessions",
  settings: "Configure application preferences and automation",
};

let settingsStore: any = null;

function playAlertSound() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(587.33, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.25);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.25);
  } catch {}
}

export default function App() {
  const { t: translate, i18n } = useTranslation();
  const [isAdmin, setIsAdmin] = useState(false);
  const [tab, setTab] = useState<Tab>("dashboard");
  const [time, setTime] = useState(new Date());
  const [showNotif, setShowNotif] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const junkItems = useCleanerStore((state) => state.junkCats);
  const [startupItems, setStartupItems] = useState<StartupItem[]>([]);
  const [privacySwept, setPrivacySwept] = useState(false);
  const [appVersion, setAppVersion] = useState("0.16.14");
  const [appName, setAppName] = useState("Cpulse");
  const [globalSettings, setGlobalSettings] = useState<UserSettings>(DEFAULT_USER_SETTINGS);
  const [lang, setLang] = useState<string>("en");

  // Translation helper compatible with existing Header/Sidebar components
  const t = (_language: string, text: string) => translate(text);

  useEffect(() => {
    if (isTauri) {
      invoke<boolean>("is_admin")
        .then(setIsAdmin)
        .catch(console.error);

      getVersion()
        .then(setAppVersion)
        .catch(console.error);

      getName()
        .then(setAppName)
        .catch(console.error);

      useCleanerStore.getState().startScan().catch(console.error);

      invoke<StartupItem[]>("get_startup_items")
        .then(setStartupItems)
        .catch(console.error);
    }
  }, []);

  // Load persistent user settings once on mount
  useEffect(() => {
    const loadSettings = async () => {
      if (!isTauri) return;
      try {
        if (!settingsStore) {
          settingsStore = await load("settings.json");
        }
        const saved = (await settingsStore.get("user-settings")) as UserSettings | null;
        if (saved) {
          setGlobalSettings((prev) => ({ ...prev, ...saved }));
          if (saved.language) {
            setLang(saved.language);
            i18n.changeLanguage(saved.language).catch(console.error);
          }
        } else {
          await settingsStore.set("user-settings", DEFAULT_USER_SETTINGS);
          await settingsStore.save();
          setGlobalSettings(DEFAULT_USER_SETTINGS);
        }
      } catch (e) {
        console.error("Failed to load settings:", e);
      }
    };
    loadSettings();
  }, [i18n]);

  // System Health Score Calculation
  let score = 100;
  const issues: string[] = [];

  const totalDiskUsed = metrics ? metrics.disks.reduce((acc, d) => acc + d.used, 0) : 0;
  const totalDiskSize = metrics ? metrics.disks.reduce((acc, d) => acc + d.total, 0) : 1;
  const diskUsagePct = metrics ? Math.round((totalDiskUsed / totalDiskSize) * 100) : 0;

  if (diskUsagePct > 85) {
    score -= 15;
    issues.push(`Disk at ${diskUsagePct}% — consider cleaning`);
  } else if (diskUsagePct > 75) {
    issues.push(`Disk at ${diskUsagePct}% — consider cleaning`);
  }

  const junkBytes = junkItems.reduce((acc, c) => acc + c.bytes, 0);
  if (junkBytes > 1073741824) {
    score -= 10;
    issues.push(`${(junkBytes / 1073741824).toFixed(1)} GB ${t(lang, "of junk found")}`);
  } else if (junkBytes > 524288000) {
    issues.push(`${(junkBytes / 1048576).toFixed(1)} MB ${t(lang, "of junk found")}`);
  }

  const activeStartup = startupItems.filter((i) => i.enabled).length;
  if (activeStartup > 5) {
    score -= 10;
    issues.push(`${activeStartup} ${t(lang, "startup items slowing boot")}`);
  } else if (activeStartup > 2) {
    issues.push(`${activeStartup} ${t(lang, "startup items slowing boot")}`);
  }

  if (metrics && metrics.ram_usage > 85) {
    score -= 10;
    issues.push(`${t(lang, "High RAM usage")} (${Math.round(metrics.ram_usage)}%)`);
  }

  const healthText =
    score >= 90 ? t(lang, "Excellent") : score >= 70 ? t(lang, "Good") : t(lang, "Needs Attention");

  // Real-time telemetry listener
  useEffect(() => {
    let unlisten: (() => void) | undefined;
    let hasNotifiedDisk = false;

    const setup = async () => {
      if (!isTauri) return;
      unlisten = await listen<SystemMetrics>("system-metrics", (event) => {
        const m = event.payload;
        setMetrics(m);

        if (!globalSettings.realTimeMonitoring) return;

        const totalUsed = m.disks.reduce((acc, d) => acc + d.used, 0);
        const totalSize = m.disks.reduce((acc, d) => acc + d.total, 0);
        const pct = totalSize > 0 ? Math.round((totalUsed / totalSize) * 100) : 0;

        if (pct > 80 && !hasNotifiedDisk) {
          hasNotifiedDisk = true;
          if (globalSettings.notifications) {
            setNotifications((prev) => [
              {
                id: Date.now(),
                title: "Disk Space Low",
                desc: `C: Drive is at ${pct}% capacity.`,
                time: "Just now",
                unread: true,
              },
              ...prev,
            ]);

            if (globalSettings.soundEffects) {
              playAlertSound();
            }
          }
        }
      });
    };

    setup();

    return () => {
      if (unlisten) unlisten();
    };
  }, [
    globalSettings.realTimeMonitoring,
    globalSettings.notifications,
    globalSettings.soundEffects,
  ]);

  useEffect(() => {
    const handleGlobalClick = () => setShowNotif(false);
    if (showNotif) {
      window.addEventListener("click", handleGlobalClick);
    }
    return () => window.removeEventListener("click", handleGlobalClick);
  }, [showNotif]);

  useEffect(() => {
    const tInterval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(tInterval);
  }, []);

  const unreadCount = notifications.filter((n) => n.unread).length;

  return (
    <MainLayout
      headerProps={{
        appName,
        appVersion,
        isAdmin,
        time,
        lang,
        t,
        tab,
        setTab: (newTab: string) => setTab(newTab as Tab),
        unreadCount,
        showNotif,
        setShowNotif,
        notifications,
        setNotifications,
      }}
      sidebarProps={{
        nav: NAV,
        tab,
        setTab: (newTab: string) => setTab(newTab as Tab),
        junkItems,
        startupItems,
        privacyItems: [],
        privacySwept,
        score,
        healthText,
        issues,
        lang,
        t,
      }}
    >
      <div className="mb-6 animate-fade-in">
        <h1 className="text-xl font-bold text-foreground transition-colors duration-300">
          {t(lang, NAV.find((n) => n.id === tab)?.label || "")}
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5 transition-colors duration-300">
          {t(lang, TAB_DESC[tab])}
        </p>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.18, ease: "easeInOut" }}
        >
          <Suspense
            fallback={
              <div className="flex-1 flex items-center justify-center p-12 text-[11px] font-medium text-muted-foreground uppercase tracking-widest animate-pulse">
                Loading...
              </div>
            }
          >
            {tab === "dashboard" && (
              <DashboardTab
                lang={lang}
                setTab={(newTab: string) => setTab(newTab as Tab)}
                metrics={metrics}
                junkItems={junkItems}
                startupItems={startupItems}
                score={score}
                issues={issues}
                healthText={healthText}
              />
            )}
            {tab === "cleaner" && <CleanerTab />}
            {tab === "booster" && <BoosterTab isAdmin={isAdmin} />}
            {tab === "startup" && <StartupTab />}
            {tab === "privacy" && (
              <PrivacyTab privacySwept={privacySwept} setPrivacySwept={setPrivacySwept} />
            )}
            {tab === "history" && <HistoryTab />}
            {tab === "diagnostics" && <DiagnosticsTab />}
            {tab === "settings" && (
              <SettingsTab
                appName={appName}
                appVersion={appVersion}
                onLanguageChange={(l) => {
                  setLang(l);
                  i18n.changeLanguage(l).catch(console.error);
                  setGlobalSettings((prev) => ({ ...prev, language: l }));
                }}
              />
            )}
          </Suspense>
        </motion.div>
      </AnimatePresence>
    </MainLayout>
  );
}

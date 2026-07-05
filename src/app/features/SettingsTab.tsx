import React, { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { enable, isEnabled, disable } from "@tauri-apps/plugin-autostart";
import { check } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";
import { load } from "@tauri-apps/plugin-store";
import { Settings, RefreshCw, Bell, Shield, Monitor, LayoutGrid, Zap } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useTheme } from "next-themes";
// @ts-ignore
import AppLogo from "../../assets/app-icon.png";

// Teal-based palette
const P = {
  teal: "#0d9488",
  amber: "#f59e0b",
  rose: "#f43f5e",
  sky: "#0ea5e9",
  violet: "#8b5cf6",
  slate: "#64748b",
  good: "#10b981",
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
        "rounded-2xl p-5 bg-card/80 backdrop-blur-md border border-border/40 shadow-sm transition-all duration-200",
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
        boxShadow: on ? `0 0 10px -2px ${P.teal}` : "none",
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

export function SettingsTab({
  appName,
  appVersion,
  onLanguageChange,
}: {
  appName: string;
  appVersion: string;
  onLanguageChange: (lang: string) => void;
}) {
  const { t } = useTranslation();
  const { theme, setTheme } = useTheme();
  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [updateMsg, setUpdateMsg] = useState("");
  const [store, setStore] = useState<any>(null);

  const [settings, setSettings] = useState({
    startWithWindows: false,
    minimizeToTray: true,
    autoUpdate: false,
    autoClean: false,
    realTimeMonitoring: true,
    contextMenu: false,
    notifications: false,
    soundEffects: false,
    language: "en",
  });

  useEffect(() => {
    const initStore = async () => {
      if (!isTauri) return;
      try {
        const s = await load("settings.json");
        setStore(s);
      } catch (e) {
        console.error("Failed to load settings store:", e);
      }
    };
    initStore();
  }, []);

  useEffect(() => {
    if (!store) return;
    const loadSettings = async () => {
      try {
        const saved = (await store.get("user-settings")) as {
          startWithWindows: boolean;
          minimizeToTray: boolean;
          autoUpdate: boolean;
          autoClean: boolean;
          realTimeMonitoring: boolean;
          contextMenu: boolean;
          notifications: boolean;
          soundEffects: boolean;
          language?: string;
        } | null;

        let autostart = false;
        if (isTauri) {
          autostart = await isEnabled();
        }

        if (saved) {
          setSettings({ ...saved, startWithWindows: autostart, language: saved.language || "en" });
        } else {
          setSettings((prev) => ({ ...prev, startWithWindows: autostart }));
        }
      } catch (e) {
        console.error("Failed to load settings:", e);
      }
    };
    loadSettings();
  }, [store]);

  const toggle = async (key: keyof typeof settings) => {
    const newVal = !settings[key];
    setSettings((prev) => ({ ...prev, [key]: newVal as never }));

    if (key === "startWithWindows") {
      if (newVal) enable().catch(console.error);
      else disable().catch(console.error);
    } else if (key === "contextMenu") {
      invoke("toggle_context_menu", { enable: newVal as boolean }).catch(console.error);
    } else if (key === "autoClean") {
      invoke("update_auto_clean", { enable: newVal as boolean }).catch(console.error);
    } else if (key === "autoUpdate") {
      invoke("update_auto_update", { enable: newVal as boolean }).catch(console.error);
    } else if (key === "notifications") {
      invoke("update_notifications", { enable: newVal as boolean }).catch(console.error);
    }

    try {
      if (store) {
        await store.set("user-settings", { ...settings, [key]: newVal });
        await store.save();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const changeLanguage = async (l: string) => {
    setSettings((prev) => ({ ...prev, language: l }));
    onLanguageChange(l);

    invoke("update_language", { lang: l }).catch(console.error);

    try {
      if (store) {
        await store.set("user-settings", { ...settings, language: l });
        await store.save();
      }
    } catch (e) {
      console.error("Failed to save language:", e);
    }
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
            case "Started":
              contentLength = event.data.contentLength || 0;
              break;
            case "Progress":
              downloaded += event.data.chunkLength;
              setUpdateMsg(`Downloading... ${Math.round((downloaded / contentLength) * 100)}%`);
              break;
            case "Finished":
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
    <div className="space-y-4">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-1 mb-2">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Settings size={20} style={{ color: P.slate }} />
            <h2 className="text-lg font-bold text-foreground">{t("Preferences")}</h2>
          </div>
          <p className="text-xs text-muted-foreground">
            {t("Customize application behavior, appearance, and automation.")}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* ── General Settings ────────────────────────────────────────────────── */}
        <Card>
          <div className="flex items-center gap-2 mb-5">
            <LayoutGrid size={16} style={{ color: P.teal }} />
            <h3 className="text-sm font-semibold text-foreground">{t("General Settings")}</h3>
          </div>
          <div className="space-y-1">
            {/* Theme Switcher */}
            <div className="flex items-center justify-between p-3 rounded-xl hover:bg-secondary/50 transition">
              <div>
                <div className="text-xs font-semibold text-foreground mb-0.5">
                  {t("Theme Mode")}
                </div>
                <div className="text-[11px] text-muted-foreground leading-snug max-w-[160px]">
                  {t("Select visual theme")}
                </div>
              </div>
              <div className="flex gap-1 p-1 rounded-lg bg-secondary border border-border">
                {(["light", "dark", "system"] as const).map((tMode) => (
                  <button
                    key={tMode}
                    onClick={() => setTheme(tMode)}
                    className="px-3 py-1.5 rounded-md text-[11px] font-bold transition-all capitalize cursor-pointer tracking-wide"
                    style={
                      theme === tMode
                        ? {
                            background: "var(--card)",
                            color: P.teal,
                            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                          }
                        : { color: "var(--muted-foreground)" }
                    }
                  >
                    {t(tMode)}
                  </button>
                ))}
              </div>
            </div>

            {/* Language */}
            <div className="flex items-center justify-between p-3 rounded-xl hover:bg-secondary/50 transition">
              <div>
                <div className="text-xs font-semibold text-foreground mb-0.5">{t("Language")}</div>
                <div className="text-[11px] text-muted-foreground leading-snug max-w-[160px]">
                  {t("Select application language")}
                </div>
              </div>
              <div className="flex gap-1 p-1 rounded-lg bg-secondary border border-border">
                {(["en", "id"] as const).map((l) => (
                  <button
                    key={l}
                    onClick={() => changeLanguage(l)}
                    className="px-3 py-1.5 rounded-md text-[11px] font-bold transition-all capitalize cursor-pointer tracking-wide"
                    style={
                      settings.language === l
                        ? {
                            background: "var(--card)",
                            color: P.teal,
                            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
                          }
                        : { color: "var(--muted-foreground)" }
                    }
                  >
                    {l === "en" ? "EN" : "ID"}
                  </button>
                ))}
              </div>
            </div>

            <div
              className="flex items-center justify-between p-3 rounded-xl hover:bg-secondary/50 transition cursor-pointer"
              onClick={() => toggle("startWithWindows")}
            >
              <div>
                <div className="text-xs font-semibold text-foreground mb-0.5">
                  {t("Start with Windows")}
                </div>
                <div className="text-[11px] text-muted-foreground leading-snug max-w-[180px]">
                  {t("Launch automatically when PC boots")}
                </div>
              </div>
              <Toggle on={settings.startWithWindows} onChange={() => {}} />
            </div>

            <div
              className="flex items-center justify-between p-3 rounded-xl hover:bg-secondary/50 transition cursor-pointer"
              onClick={() => toggle("minimizeToTray")}
            >
              <div>
                <div className="text-xs font-semibold text-foreground mb-0.5">
                  {t("Minimize to Tray")}
                </div>
                <div className="text-[11px] text-muted-foreground leading-snug max-w-[180px]">
                  {t("Keep running in background when closed")}
                </div>
              </div>
              <Toggle on={settings.minimizeToTray} onChange={() => {}} />
            </div>

            <div
              className="flex items-center justify-between p-3 rounded-xl hover:bg-secondary/50 transition cursor-pointer"
              onClick={() => toggle("contextMenu")}
            >
              <div>
                <div className="text-xs font-semibold text-foreground mb-0.5">
                  {t("Context Menu Integration")}
                </div>
                <div className="text-[11px] text-muted-foreground leading-snug max-w-[180px]">
                  {t('Add "Clean with CPulse" to right-click menu')}
                </div>
              </div>
              <Toggle on={settings.contextMenu} onChange={() => {}} />
            </div>
          </div>
        </Card>

        {/* ── Automation & Background ────────────────────────────────────────── */}
        <Card>
          <div className="flex items-center gap-2 mb-5">
            <Zap size={16} style={{ color: P.amber }} />
            <h3 className="text-sm font-semibold text-foreground">
              {t("Automation & Background")}
            </h3>
          </div>
          <div className="space-y-1">
            <div
              className="flex items-center justify-between p-3 rounded-xl hover:bg-secondary/50 transition cursor-pointer"
              onClick={() => toggle("autoClean")}
            >
              <div>
                <div className="text-xs font-semibold text-foreground mb-0.5">
                  {t("Auto-Clean Schedule")}
                </div>
                <div className="text-[11px] text-muted-foreground leading-snug max-w-[180px]">
                  {t("Clean junk files automatically every week")}
                </div>
              </div>
              <Toggle on={settings.autoClean} onChange={() => {}} />
            </div>

            <div
              className="flex items-center justify-between p-3 rounded-xl hover:bg-secondary/50 transition cursor-pointer"
              onClick={() => toggle("realTimeMonitoring")}
            >
              <div>
                <div className="text-xs font-semibold text-foreground mb-0.5">
                  {t("Real-time Monitoring")}
                </div>
                <div className="text-[11px] text-muted-foreground leading-snug max-w-[180px]">
                  {t("Alert when disk space is critically low")}
                </div>
              </div>
              <Toggle on={settings.realTimeMonitoring} onChange={() => {}} />
            </div>

            <div
              className="flex items-center justify-between p-3 rounded-xl hover:bg-secondary/50 transition cursor-pointer"
              onClick={() => toggle("autoUpdate")}
            >
              <div>
                <div className="text-xs font-semibold text-foreground mb-0.5">
                  {t("Automatic Updates")}
                </div>
                <div className="text-[11px] text-muted-foreground leading-snug max-w-[180px]">
                  {t("Install new versions silently in background")}
                </div>
              </div>
              <Toggle on={settings.autoUpdate} onChange={() => {}} />
            </div>
          </div>
        </Card>

        {/* ── Alerts & Sounds ────────────────────────────────────────────────── */}
        <Card>
          <div className="flex items-center gap-2 mb-5">
            <Bell size={16} style={{ color: P.sky }} />
            <h3 className="text-sm font-semibold text-foreground">{t("Alerts & Sounds")}</h3>
          </div>
          <div className="space-y-1">
            <div
              className="flex items-center justify-between p-3 rounded-xl hover:bg-secondary/50 transition cursor-pointer"
              onClick={() => toggle("notifications")}
            >
              <div>
                <div className="text-xs font-semibold text-foreground mb-0.5">
                  {t("Push Notifications")}
                </div>
                <div className="text-[11px] text-muted-foreground leading-snug max-w-[180px]">
                  {t("Show system tray alerts for important events")}
                </div>
              </div>
              <Toggle on={settings.notifications} onChange={() => {}} />
            </div>

            <div
              className="flex items-center justify-between p-3 rounded-xl hover:bg-secondary/50 transition cursor-pointer"
              onClick={() => toggle("soundEffects")}
            >
              <div>
                <div className="text-xs font-semibold text-foreground mb-0.5">
                  {t("Sound Effects")}
                </div>
                <div className="text-[11px] text-muted-foreground leading-snug max-w-[180px]">
                  {t("Play sounds when scans or cleans finish")}
                </div>
              </div>
              <Toggle on={settings.soundEffects} onChange={() => {}} />
            </div>
          </div>
        </Card>

        {/* ── About & Version ────────────────────────────────────────────────── */}
        <Card
          style={{
            background: `linear-gradient(145deg, var(--card) 40%, color-mix(in srgb, ${P.teal} 5%, transparent))`,
          }}
        >
          <div className="flex items-center gap-2 mb-2">
            <Shield size={16} style={{ color: P.teal }} />
            <h3 className="text-sm font-semibold text-foreground">{t("About CPulse")}</h3>
          </div>
          <div className="flex flex-col items-center justify-center py-4">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-3 bg-card border border-border shadow-sm overflow-hidden">
              <img src={AppLogo} alt="Logo" className="w-10 h-10 object-contain" />
            </div>
            <div className="text-lg font-bold text-foreground tracking-tight">{appName}</div>
            <div className="text-[11px] font-medium text-muted-foreground mb-4 uppercase tracking-widest">
              v{appVersion}
            </div>
            {updateMsg && (
              <div className="text-xs text-foreground bg-secondary px-3 py-1.5 rounded-lg mb-3 font-medium">
                {updateMsg}
              </div>
            )}
            <button
              onClick={checkUpdates}
              disabled={checkingUpdate}
              className="px-5 py-2 rounded-xl text-xs font-semibold text-white shadow-sm transition-all hover:-translate-y-0.5 active:scale-95 disabled:opacity-50 cursor-pointer"
              style={{ background: P.teal }}
            >
              {checkingUpdate ? t("Checking...") : t("Check for Updates")}
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
}

import React, { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { enable, isEnabled, disable } from "@tauri-apps/plugin-autostart";
import { check } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";
import { load } from "@tauri-apps/plugin-store";
import { Settings, RefreshCw, Bell, Shield } from "lucide-react";
import { useTranslation } from "react-i18next";
// @ts-ignore
import AppLogo from "../../assets/app-icon.png";

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
      const s = await load("settings.json");
      setStore(s);
    };
    initStore();
  }, []);

  useEffect(() => {
    if (!store) return;
    const loadSettings = async () => {
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

      const autostart = await isEnabled();

      if (saved) {
        setSettings({ ...saved, startWithWindows: autostart, language: saved.language || "en" });
      } else {
        setSettings((prev) => ({ ...prev, startWithWindows: autostart }));
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
    <div className="space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* General Settings */}
        <GradientCard>
          <div className="flex items-center gap-2 mb-4">
            <Settings size={18} style={{ color: C.indigo }} />
            <h3 className="text-sm font-semibold text-slate-800">{t("General Preferences")}</h3>
          </div>
          <div className="space-y-1">
            <div className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 transition">
              <div>
                <div className="text-sm font-medium text-slate-700">{t("Language")}</div>
                <div className="text-xs text-slate-400">{t("Select application language")}</div>
              </div>
              <div className="flex gap-2 p-1 rounded-xl bg-slate-100">
                {(["en", "id"] as const).map((l) => (
                  <button
                    key={l}
                    onClick={() => changeLanguage(l)}
                    className="px-3 py-1 rounded-lg text-xs font-semibold transition-all capitalize"
                    style={
                      settings.language === l
                        ? {
                            background: "white",
                            color: C.indigo,
                            boxShadow: "0 1px 4px rgba(0,0,0,0.1)",
                          }
                        : { color: "#64748b" }
                    }
                  >
                    {t(l === "en" ? "English" : "Indonesia")}
                  </button>
                ))}
              </div>
            </div>
            <div
              className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 transition cursor-pointer"
              onClick={() => toggle("startWithWindows")}
            >
              <div>
                <div className="text-sm font-medium text-slate-700">{t("Start with Windows")}</div>
                <div className="text-xs text-slate-400">
                  {t("Launch automatically when PC boots")}
                </div>
              </div>
              <Toggle on={settings.startWithWindows} onChange={() => {}} />
            </div>
            <div
              className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 transition cursor-pointer"
              onClick={() => toggle("minimizeToTray")}
            >
              <div>
                <div className="text-sm font-medium text-slate-700">{t("Minimize to Tray")}</div>
                <div className="text-xs text-slate-400">
                  {t("Keep running in background when closed")}
                </div>
              </div>
              <Toggle on={settings.minimizeToTray} onChange={() => {}} />
            </div>
            <div
              className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 transition cursor-pointer"
              onClick={() => toggle("contextMenu")}
            >
              <div>
                <div className="text-sm font-medium text-slate-700">
                  {t("Context Menu Integration")}
                </div>
                <div className="text-xs text-slate-400">
                  {t('Add "Clean with CPulse" to right-click menu')}
                </div>
              </div>
              <Toggle on={settings.contextMenu} onChange={() => {}} />
            </div>
          </div>
        </GradientCard>

        {/* Automation & Updates */}
        <GradientCard>
          <div className="flex items-center gap-2 mb-4">
            <RefreshCw size={18} style={{ color: C.emerald }} />
            <h3 className="text-sm font-semibold text-slate-800">{t("Automation")}</h3>
          </div>
          <div className="space-y-1">
            <div
              className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 transition cursor-pointer"
              onClick={() => toggle("autoClean")}
            >
              <div>
                <div className="text-sm font-medium text-slate-700">{t("Auto-Clean Schedule")}</div>
                <div className="text-xs text-slate-400">
                  {t("Clean junk files automatically every week")}
                </div>
              </div>
              <Toggle on={settings.autoClean} onChange={() => {}} />
            </div>
            <div
              className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 transition cursor-pointer"
              onClick={() => toggle("realTimeMonitoring")}
            >
              <div>
                <div className="text-sm font-medium text-slate-700">
                  {t("Real-time Monitoring")}
                </div>
                <div className="text-xs text-slate-400">
                  {t("Alert when disk space is critically low")}
                </div>
              </div>
              <Toggle on={settings.realTimeMonitoring} onChange={() => {}} />
            </div>
            <div
              className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 transition cursor-pointer"
              onClick={() => toggle("autoUpdate")}
            >
              <div>
                <div className="text-sm font-medium text-slate-700">{t("Automatic Updates")}</div>
                <div className="text-xs text-slate-400">
                  {t("Install new versions silently in background")}
                </div>
              </div>
              <Toggle on={settings.autoUpdate} onChange={() => {}} />
            </div>
          </div>
        </GradientCard>

        {/* Appearance & Notifications */}
        <GradientCard>
          <div className="flex items-center gap-2 mb-4">
            <Bell size={18} style={{ color: C.amber }} />
            <h3 className="text-sm font-semibold text-slate-800">{t("Alerts & Sounds")}</h3>
          </div>
          <div className="space-y-1">
            <div
              className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 transition cursor-pointer"
              onClick={() => toggle("notifications")}
            >
              <div>
                <div className="text-sm font-medium text-slate-700">{t("Push Notifications")}</div>
                <div className="text-xs text-slate-400">
                  {t("Show system tray alerts for important events")}
                </div>
              </div>
              <Toggle on={settings.notifications} onChange={() => {}} />
            </div>
            <div
              className="flex items-center justify-between p-2.5 rounded-xl hover:bg-slate-50 transition cursor-pointer"
              onClick={() => toggle("soundEffects")}
            >
              <div>
                <div className="text-sm font-medium text-slate-700">{t("Sound Effects")}</div>
                <div className="text-xs text-slate-400">
                  {t("Play sounds when scans or cleans finish")}
                </div>
              </div>
              <Toggle on={settings.soundEffects} onChange={() => {}} />
            </div>
          </div>
        </GradientCard>

        {/* About & License */}
        <GradientCard gradient="linear-gradient(135deg,#f8faff,#f0f4ff)">
          <div className="flex items-center gap-2 mb-4">
            <Shield size={18} style={{ color: C.indigo }} />
            <h3 className="text-sm font-semibold text-slate-800">{t("About CPulse")}</h3>
          </div>
          <div className="flex flex-col items-center justify-center py-2">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3 bg-white border border-slate-100 shadow-sm overflow-hidden">
              <img src={AppLogo} alt="Logo" className="w-10 h-10 object-contain" />
            </div>
            <div className="text-base font-bold text-slate-800">{appName}</div>
            <div className="text-xs text-slate-500 mb-2">
              {t("Version")} {appVersion}
            </div>
            {updateMsg && (
              <div className="text-xs text-indigo-600 mb-2 font-medium">{updateMsg}</div>
            )}
            <button
              onClick={checkUpdates}
              disabled={checkingUpdate}
              className="px-5 py-2 rounded-xl text-xs font-semibold text-indigo-600 bg-indigo-50 border border-indigo-100 hover:bg-indigo-100 transition active:scale-95 disabled:opacity-50"
            >
              {checkingUpdate ? t("Checking...") : t("Check for Updates")}
            </button>
          </div>
        </GradientCard>
      </div>
    </div>
  );
}

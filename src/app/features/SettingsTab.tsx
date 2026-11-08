import React, { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { enable, isEnabled, disable } from "@tauri-apps/plugin-autostart";
import { check } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";
import { load } from "@tauri-apps/plugin-store";
import {
  Settings,
  RefreshCw,
  Bell,
  Shield,
  Monitor,
  LayoutGrid,
  Zap,
  Key,
  Eye,
  EyeOff,
  Copy,
  Check,
  Download,
  ShieldCheck,
  Info,
  AlertCircle,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useTheme } from "next-themes";
import AppLogo from "../../assets/app-icon.png";
import { P } from "../../design/tokens";
import { cn } from "../components/ui/utils";
import { isTauri } from "../utils/tauri";
import { UserSettings, DEFAULT_USER_SETTINGS, WindowsKeyData } from "../../types";

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
        "rounded-2xl p-5 bg-card border border-border transition-all duration-200",
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
        background: on ? P.teal : "var(--background)",
        borderColor: on ? "transparent" : "var(--border)",
      }}
    >
      <span
        className="absolute top-0.5 w-4 h-4 rounded-full transition-all duration-300"
        style={{
          left: on ? "calc(100% - 19px)" : "3px",
          backgroundColor: on ? P.bg : P.muted,
        }}
      />
    </button>
  );
}

function WindowsKeyCard() {
  const { t } = useTranslation();
  const [keyInfo, setKeyInfo] = useState<WindowsKeyData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isPreview, setIsPreview] = useState(false);

  const fetchKey = async () => {
    setLoading(true);
    setError(null);
    setCopied(false);
    try {
      if (isTauri) {
        let editionName = "Windows 11 Pro";
        try {
          const sys = await invoke<any>("get_system_info");
          if (sys?.os_name) {
            editionName = sys.os_name;
          }
        } catch {}

        const res = await invoke<WindowsKeyData>("get_windows_key");
        const finalEdition =
          res.edition && res.edition !== "Windows 10/11" && res.edition !== "Windows 11 / 10"
            ? res.edition
            : editionName;

        if (res.is_valid && res.key) {
          setKeyInfo({
            key: res.key,
            key_type: res.key_type || "Digital License",
            edition: finalEdition,
            is_valid: true,
          });
        } else {
          setKeyInfo(null);
          setError(
            res.key_type === "Not Detected"
              ? t("No product key detected in BIOS/Registry for this installation.")
              : t("Digital entitlement active, but no raw OEM product key found.")
          );
        }
        setIsPreview(false);
      } else {
        await new Promise((r) => setTimeout(r, 200));
        setKeyInfo(null);
        setError(t("Product key detection is only available in the native desktop application."));
        setIsPreview(true);
      }
    } catch (e: any) {
      console.error("Failed to fetch Windows Key:", e);
      const msg =
        typeof e === "string"
          ? e
          : e?.message || t("No original hardware product key found in BIOS/Registry.");
      setError(msg);
      setKeyInfo(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKey();
  }, []);

  const maskKeyStr = (rawKey: string) => {
    if (!rawKey) return "•••••-•••••-•••••-•••••-•••••";
    const parts = rawKey.split("-");
    if (parts.length === 5) {
      return `•••••-•••••-•••••-•••••-${parts[4]}`;
    }
    if (rawKey.toLowerCase().includes("partial")) {
      return rawKey;
    }
    return "•••••-•••••-•••••-•••••-•••••";
  };

  const handleCopy = () => {
    if (!keyInfo?.key) return;
    navigator.clipboard.writeText(keyInfo.key);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleSaveFile = () => {
    if (!keyInfo?.key) return;
    const content = `======================================================
CPulse - Windows Product Key Backup
======================================================
Date           : ${new Date().toLocaleString()}
Windows Edition: ${keyInfo.edition}
License Type   : ${keyInfo.key_type}
Product Key    : ${keyInfo.key}

Note: Keep this file in a safe and private location for future system reinstallation or device activation.
======================================================`;

    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Windows-Product-Key-${(keyInfo.edition || "Windows").replace(/\s+/g, "-")}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Card className="col-span-1 lg:col-span-2 relative overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2.5">
          <div
            className="p-2 rounded-xl border shrink-0"
            style={{
              backgroundColor: `${P.teal}15`,
              color: P.teal,
              borderColor: `${P.teal}30`,
            }}
          >
            <Key size={18} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">
              {t("Windows License & Product Key")}
            </h3>
            <p className="text-[11px] text-muted-foreground">
              {t(
                "View and save your Windows Product Key for backup and system reinstallation."
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {isPreview && (
            <span
              className="px-2.5 py-1 rounded-full text-[10px] font-semibold border"
              style={{
                color: P.warn,
                backgroundColor: `${P.warn}15`,
                borderColor: `${P.warn}30`,
              }}
            >
              {t("Preview Mode (Simulated Key)")}
            </span>
          )}
          <button
            onClick={fetchKey}
            disabled={loading}
            className="p-1.5 rounded-lg bg-background hover:bg-secondary border border-border text-foreground transition cursor-pointer disabled:opacity-50"
            title={t("Refresh Key")}
          >
            <RefreshCw size={14} className={cn(loading && "animate-spin")} />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-8 gap-3 text-muted-foreground text-xs font-medium">
          <RefreshCw size={16} className="animate-spin text-primary" />
          <span>{t("Retrieving Key...")}</span>
        </div>
      ) : error && !keyInfo ? (
        <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/20 text-xs text-foreground space-y-2">
          <div className="flex items-start gap-2 text-destructive font-semibold">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
          <div className="pt-2 pl-6 flex items-center gap-2">
            <button
              onClick={fetchKey}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-background border border-border hover:bg-secondary text-xs font-medium transition cursor-pointer"
            >
              <RefreshCw size={12} />
              {t("Retry")}
            </button>
          </div>
        </div>
      ) : keyInfo ? (
        <div className="space-y-4">
          {/* Key Display Container */}
          <div className="p-4 rounded-xl bg-background border border-border flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3 w-full sm:w-auto overflow-x-auto">
              <span className="text-xs text-muted-foreground font-semibold shrink-0 uppercase tracking-wider">
                Key:
              </span>
              <code className="text-sm sm:text-base font-mono font-bold tracking-widest text-foreground select-all bg-card px-3 py-1.5 rounded-lg border border-border">
                {revealed ? keyInfo.key : maskKeyStr(keyInfo.key)}
              </code>
            </div>

            <div className="flex items-center gap-1.5 w-full sm:w-auto justify-end">
              <button
                onClick={() => setRevealed(!revealed)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-card hover:bg-secondary border border-border text-foreground transition cursor-pointer"
                title={revealed ? t("Mask Key") : t("Reveal Key")}
              >
                {revealed ? <EyeOff size={14} /> : <Eye size={14} />}
                <span>{revealed ? t("Mask Key") : t("Reveal Key")}</span>
              </button>

              <button
                onClick={handleCopy}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer"
                style={{
                  backgroundColor: copied ? P.good : P.teal,
                  color: P.bg,
                }}
                title={t("Copy Key")}
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
                <span>{copied ? t("Key Copied!") : t("Copy Key")}</span>
              </button>

              <button
                onClick={handleSaveFile}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-card hover:bg-secondary border border-border text-foreground transition cursor-pointer"
                title={t("Save to File")}
              >
                <Download size={14} />
                <span className="hidden sm:inline">{t("Save to File")}</span>
              </button>
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-3 rounded-xl bg-background border border-border">
              <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                {t("Windows Edition")}
              </div>
              <div className="text-xs font-bold text-foreground truncate" title={keyInfo.edition}>
                {keyInfo.edition}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-background border border-border">
              <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                {t("License Type")}
              </div>
              <div className="text-xs font-bold truncate" style={{ color: P.teal }}>
                {keyInfo.key_type}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-background border border-border">
              <div className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                {t("Activation Status")}
              </div>
              <div className="flex items-center gap-1.5 text-xs font-bold" style={{ color: P.good }}>
                <ShieldCheck size={14} />
                <span>{t("Permanently Activated")}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-muted-foreground pt-1">
            <Info size={13} className="shrink-0" style={{ color: P.teal }} />
            <span>
              {t(
                "This key is tied to your system hardware/digital account and can be used when performing a clean reinstall."
              )}
            </span>
          </div>
        </div>
      ) : null}
    </Card>
  );
}

export function SettingsTab({
  onLanguageChange,
}: {
  appName?: string;
  appVersion?: string;
  onLanguageChange: (lang: string) => void;
}) {
  const { t, i18n } = useTranslation();
  const { theme, setTheme } = useTheme();

  const [store, setStore] = useState<any>(null);
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_USER_SETTINGS);

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
        const saved = (await store.get("user-settings")) as UserSettings | null;

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

  const toggle = async (key: keyof UserSettings) => {
    const prevVal = settings[key];
    const newVal = !prevVal;

    try {
      if (isTauri) {
        if (key === "startWithWindows") {
          if (newVal) await enable();
          else await disable();
        } else if (key === "contextMenu") {
          await invoke("toggle_context_menu", { enable: newVal as boolean });
        } else if (key === "autoClean") {
          await invoke("update_auto_clean", { enable: newVal as boolean });
        } else if (key === "autoUpdate") {
          await invoke("update_auto_update", { enable: newVal as boolean });
        } else if (key === "notifications") {
          await invoke("update_notifications", { enable: newVal as boolean });
        }
      }

      const updated = { ...settings, [key]: newVal };
      setSettings(updated);

      if (store) {
        await store.set("user-settings", updated);
        await store.save();
      }
    } catch (e) {
      console.error(`Failed to toggle ${key}:`, e);
      setSettings((prev) => ({ ...prev, [key]: prevVal as never }));
    }
  };

  const changeLanguage = async (l: string) => {
    const prevLang = settings.language;
    try {
      if (isTauri) {
        await invoke("update_language", { lang: l });
      }
      const updated = { ...settings, language: l };
      setSettings(updated);
      onLanguageChange(l);

      if (store) {
        await store.set("user-settings", updated);
        await store.save();
      }
    } catch (e) {
      console.error("Failed to update language:", e);
      setSettings((prev) => ({ ...prev, language: prevLang }));
    }
  };

  const [checkingUpdate, setCheckingUpdate] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<string | null>(null);

  const checkUpdates = async () => {
    setCheckingUpdate(true);
    setUpdateStatus(null);
    try {
      if (isTauri) {
        const update = await check();
        if (update?.available) {
          setUpdateStatus(t("Update available! Downloading..."));
          await update.downloadAndInstall();
          setUpdateStatus(t("Update downloaded. Restarting..."));
          await relaunch();
        } else {
          setUpdateStatus(t("You are on the latest version."));
        }
      } else {
        await new Promise((r) => setTimeout(r, 1200));
        setUpdateStatus(t("You are on the latest version (v0.16.14)."));
      }
    } catch (e) {
      console.error("Update check failed:", e);
      setUpdateStatus(t("Failed to check for updates. Try again later."));
    } finally {
      setCheckingUpdate(false);
    }
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-5xl mx-auto">
      <div>
        <h2 className="text-lg font-bold text-foreground">{t("Settings")}</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          {t("Configure application preferences and automation")}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* System Windows Key Card */}
        <WindowsKeyCard />

        {/* General Preferences */}
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <Settings size={16} style={{ color: P.teal }} />
            <h3 className="text-sm font-semibold text-foreground">{t("General")}</h3>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-medium text-foreground">{t("Start with Windows")}</div>
                <div className="text-[11px] text-muted-foreground">
                  {t("Launch CPulse minimized when your computer boots")}
                </div>
              </div>
              <Toggle
                on={settings.startWithWindows}
                onChange={() => toggle("startWithWindows")}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-medium text-foreground">{t("Minimize to Tray")}</div>
                <div className="text-[11px] text-muted-foreground">
                  {t("Keep running in the background when window is closed")}
                </div>
              </div>
              <Toggle
                on={settings.minimizeToTray}
                onChange={() => toggle("minimizeToTray")}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-medium text-foreground">{t("Context Menu Integration")}</div>
                <div className="text-[11px] text-muted-foreground">
                  {t("Add 'Clean with CPulse' to Windows desktop right-click menu")}
                </div>
              </div>
              <Toggle
                on={settings.contextMenu}
                onChange={() => toggle("contextMenu")}
              />
            </div>
          </div>
        </Card>

        {/* Automation */}
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <Zap size={16} style={{ color: P.teal }} />
            <h3 className="text-sm font-semibold text-foreground">{t("Automation")}</h3>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-medium text-foreground">{t("Automatic Clean")}</div>
                <div className="text-[11px] text-muted-foreground">
                  {t("Run weekly silent cleanup of safe temporary files")}
                </div>
              </div>
              <Toggle
                on={settings.autoClean}
                onChange={() => toggle("autoClean")}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-medium text-foreground">{t("Real-Time Monitoring")}</div>
                <div className="text-[11px] text-muted-foreground">
                  {t("Track CPU, RAM, and Disk metrics continuously")}
                </div>
              </div>
              <Toggle
                on={settings.realTimeMonitoring}
                onChange={() => toggle("realTimeMonitoring")}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-medium text-foreground">{t("Auto-Update Check")}</div>
                <div className="text-[11px] text-muted-foreground">
                  {t("Check for CPulse updates automatically")}
                </div>
              </div>
              <Toggle
                on={settings.autoUpdate}
                onChange={() => toggle("autoUpdate")}
              />
            </div>
          </div>
        </Card>

        {/* Appearance & Language */}
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <LayoutGrid size={16} style={{ color: P.teal }} />
            <h3 className="text-sm font-semibold text-foreground">{t("Appearance & Language")}</h3>
          </div>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-foreground block mb-2">{t("Theme")}</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: "light", label: "Light" },
                  { id: "dark", label: "Dark" },
                  { id: "system", label: "System" },
                ].map((th) => (
                  <button
                    key={th.id}
                    onClick={() => setTheme(th.id)}
                    className={cn(
                      "py-2 px-3 rounded-xl text-xs font-medium border text-center transition cursor-pointer",
                      theme === th.id
                        ? "border-primary bg-primary/15 text-primary font-semibold"
                        : "border-border hover:bg-background text-muted-foreground"
                    )}
                  >
                    {t(th.label)}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-foreground block mb-2">{t("Language")}</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: "en", label: "English" },
                  { id: "id", label: "Bahasa Indonesia" },
                ].map((l) => (
                  <button
                    key={l.id}
                    onClick={() => changeLanguage(l.id)}
                    className={cn(
                      "py-2 px-3 rounded-xl text-xs font-medium border text-center transition cursor-pointer",
                      i18n.language === l.id
                        ? "border-primary bg-primary/15 text-primary font-semibold"
                        : "border-border hover:bg-background text-muted-foreground"
                    )}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Card>

        {/* Notifications & Sounds */}
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <Bell size={16} style={{ color: P.teal }} />
            <h3 className="text-sm font-semibold text-foreground">{t("Notifications & Sounds")}</h3>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-medium text-foreground">{t("Desktop Notifications")}</div>
                <div className="text-[11px] text-muted-foreground">
                  {t("Notify on low disk space or high resource usage")}
                </div>
              </div>
              <Toggle
                on={settings.notifications}
                onChange={() => toggle("notifications")}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-medium text-foreground">{t("Sound Effects")}</div>
                <div className="text-[11px] text-muted-foreground">
                  {t("Play audio tones on cleaning completions and alerts")}
                </div>
              </div>
              <Toggle
                on={settings.soundEffects}
                onChange={() => toggle("soundEffects")}
              />
            </div>
          </div>
        </Card>

        {/* About Card */}
        <Card className="col-span-1 lg:col-span-2">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <img src={AppLogo} alt="CPulse" className="w-12 h-12 rounded-xl object-contain" />
              <div>
                <h3 className="text-sm font-bold text-foreground">CPulse System Optimizer</h3>
                <p className="text-xs text-muted-foreground">Version 0.16.14 (Tauri v2 + Rust)</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  High-performance Windows maintenance engine and telemetry dashboard.
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:items-end gap-1.5 w-full sm:w-auto">
              <button
                onClick={checkUpdates}
                disabled={checkingUpdate}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer disabled:opacity-50"
                style={{ backgroundColor: P.teal, color: P.bg }}
              >
                <RefreshCw size={13} className={cn(checkingUpdate && "animate-spin")} />
                <span>{checkingUpdate ? t("Checking...") : t("Check for Updates")}</span>
              </button>
              {updateStatus && (
                <div className="text-[11px] text-muted-foreground mt-1 text-center sm:text-right">
                  {updateStatus}
                </div>
              )}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

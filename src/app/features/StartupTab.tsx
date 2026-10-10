import React, { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { PackageX, Clock, TrendingUp, Search, Plus, Trash2, Loader2, Cpu, Volume2, MessageSquare, Users } from "lucide-react";
import { useTranslation } from "react-i18next";
import { addHistoryLog } from "../utils/history";
import { StatCard } from "../components/ui/StatCard";
import { Tooltip, TooltipTrigger, TooltipContent } from "../components/ui/tooltip";

// Teal-based palette
const P = {
  teal: "#0d9488",
  amber: "#f59e0b",
  rose: "#f43f5e",
  sky: "#0ea5e9",
  slate: "#64748b",
  good: "#10b981",
};

function cn(...classes: (string | undefined | false)[]) {
  return classes.filter(Boolean).join(" ");
}

// Crisp Brand SVG Icons
function DiscordIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515a.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0a12.64 12.64 0 0 0-.617-1.25a.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057a19.9 19.9 0 0 0 5.993 3.03a.078.078 0 0 0 .084-.028a14.09 14.09 0 0 0 1.226-1.994a.076.076 0 0 0-.041-.106a13.107 13.107 0 0 1-1.872-.892a.077.077 0 0 1-.008-.128a10.2 10.2 0 0 0 .372-.292a.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127a12.299 12.299 0 0 1-1.873.892a.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028a19.839 19.839 0 0 0 6.002-3.03a.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.956-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419c0-1.333.955-2.419 2.157-2.419c1.21 0 2.176 1.096 2.157 2.42c0 1.333-.946 2.418-2.157 2.418z" />
    </svg>
  );
}

function SpotifyIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.376 0 0 5.376 0 12s5.376 12 12 12 12-5.376 12-12S18.624 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141 C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
    </svg>
  );
}

function SteamIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M11.979 0C5.678 0 .511 4.86.022 11.037l6.432 2.658c.545-.371 1.203-.59 1.912-.59.063 0 .125.004.188.006l2.861-4.142V8.91c0-2.495 2.028-4.524 4.524-4.524 2.494 0 4.524 2.03 4.524 4.524s-2.03 4.524-4.524 4.524h-.105l-4.076 2.911c0 .052.004.105.004.159 0 1.875-1.515 3.396-3.39 3.396-1.635 0-3.016-1.173-3.331-2.727L.438 15.27C1.863 20.35 6.489 24 11.979 24c6.627 0 12-5.373 12-12s-5.373-12-12-12zm-4.116 18.236c-.161.642-.741 1.118-1.43 1.118-.823 0-1.492-.669-1.492-1.492 0-.756.564-1.378 1.298-1.474l1.624.671a1.503 1.503 0 0 0 .002 1.177zm8.064-7.067c1.18 0 2.137-.956 2.137-2.136 0-1.18-.956-2.137-2.137-2.137-1.18 0-2.136.956-2.136 2.137 0 1.18.956 2.136 2.136 2.136z" />
    </svg>
  );
}

function OneDriveIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96z" />
    </svg>
  );
}

function ChromeIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm0 4.5a7.5 7.5 0 0 1 6.368 3.535H12a4 4 0 0 0-3.87 3H4.808A7.502 7.502 0 0 1 12 4.5zM4.5 12c0-.528.055-1.042.16-1.536l3.322 5.753a4 4 0 0 0 4.018 1.783v3.31A7.513 7.513 0 0 1 4.5 12zm7.5 7.5a7.487 7.487 0 0 1-5.176-2.036l3.322-5.754a4 4 0 0 0 5.854 0l3.322 5.754A7.487 7.487 0 0 1 12 19.5z" />
    </svg>
  );
}

function AdobeIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M13.966 22h8.034l-8.034-18.172zM.001 22h8.034l-8.034-18.172zm9.141-11.458l4.478 10.158h-3.324l-1.282-3.136h-3.238l2.366-5.522z" />
    </svg>
  );
}

function NvidiaIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M10.15 8.243c.954.025 2.053.25 3.064.675 1.58.653 3.321 2.032 3.868 3.82.261.85.19 1.838-.198 2.627a3.46 3.46 0 0 1-2.146 1.636 5.67 5.67 0 0 1-2.45.06c-1.242-.236-2.316-.921-3.102-1.898a8.31 8.31 0 0 1-1.428-2.82 10.87 10.87 0 0 1-.303-3.212A8.96 8.96 0 0 1 8.65 4.881a10.86 10.86 0 0 1 4.298-2.58A13.88 13.88 0 0 1 18.258 2c2.043.125 4.027.818 5.742 1.936l-1.88 2.378a10.42 10.42 0 0 0-4.32-1.488 8.6 8.6 0 0 0-4.332.32 6.55 6.55 0 0 0-2.822 1.8 6.01 6.01 0 0 0-1.298 2.452 7.78 7.78 0 0 0 .178 3.65c.348 1.137 1.09 2.11 2.072 2.76.98.65 2.168.943 3.332.84 1.166-.104 2.27-.63 3.06-1.488a4.42 4.42 0 0 0 .992-2.313 3.84 3.84 0 0 0-.272-2.176 3.82 3.82 0 0 0-1.282-1.633 4.88 4.88 0 0 0-2.072-.828 6.3 6.3 0 0 0-2.46-.011z" />
    </svg>
  );
}

function MicrosoftIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M0 0h11.379v11.379H0zM12.621 0H24v11.379H12.621zM0 12.621h11.379V24H0zM12.621 12.621H24V24H12.621z" />
    </svg>
  );
}

function FirefoxIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.37 0 0 5.37 0 12s5.37 12 12 12 12-5.37 12-12S18.63 0 12 0zm6.8 7.3c-.4.9-1 1.7-1.8 2.3 0 .2.1.4.1.7 0 3.3-2.5 7.1-7.1 7.1-1.4 0-2.7-.4-3.8-1.1.2 0 .4.1.6.1 1.2 0 2.3-.4 3.2-1.1-1.1 0-2.1-.8-2.4-1.8.2 0 .3.1.5.1.2 0 .5 0 .7-.1-1.2-.2-2.1-1.3-2.1-2.6v-.1c.3.2.7.3 1.2.3-1.2-.8-1.6-2.4-.8-3.7 1.3 1.6 3.2 2.6 5.4 2.7-.1-.3-.1-.6-.1-.9 0-1.8 1.5-3.3 3.3-3.3.9 0 1.8.4 2.4 1 .7-.1 1.4-.4 2-.8-.2.7-.7 1.3-1.3 1.7.6-.1 1.2-.2 1.8-.5-.4.6-.9 1.1-1.5 1.5z" />
    </svg>
  );
}

function VSCodeIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M23.15 2.587l-6.28 5.86L6.2 1.39A1.5 1.5 0 0 0 4 2.69v18.62a1.5 1.5 0 0 0 2.2 1.3l10.67-7.057 6.28 5.86a1.5 1.5 0 0 0 2.52-1.1V3.687a1.5 1.5 0 0 0-2.52-1.1zM18 15.65L12.5 12 18 8.35v7.3z" />
    </svg>
  );
}

function GithubIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z" />
    </svg>
  );
}

interface BrandInfo {
  Icon: React.ComponentType<{ size?: number }>;
  color: string;
  bg: string;
}

// Priority 1: Brand Icon Lookup
function getAppBrandInfo(name: string, publisher: string = ""): BrandInfo | null {
  try {
    const n = (name || "").toLowerCase();
    const p = (publisher || "").toLowerCase();

    if (n.includes("discord")) return { Icon: DiscordIcon, color: "#5865F2", bg: "rgba(88, 101, 242, 0.15)" };
    if (n.includes("spotify")) return { Icon: SpotifyIcon, color: "#1DB954", bg: "rgba(29, 185, 84, 0.15)" };
    if (n.includes("steam")) return { Icon: SteamIcon, color: "#3892e0", bg: "rgba(56, 146, 224, 0.15)" };
    if (n.includes("onedrive") || n.includes("skydrive")) return { Icon: OneDriveIcon, color: "#0078D4", bg: "rgba(0, 120, 212, 0.15)" };
    if (n.includes("teams") || n.includes("zoom") || n.includes("slack")) return { Icon: Users, color: "#6264A7", bg: "rgba(98, 100, 167, 0.15)" };
    if (p.includes("google") || n.includes("chrome")) return { Icon: ChromeIcon, color: "#4285F4", bg: "rgba(66, 133, 244, 0.15)" };
    if (p.includes("adobe") || n.includes("photoshop") || n.includes("creative cloud")) return { Icon: AdobeIcon, color: "#FF0000", bg: "rgba(255, 0, 0, 0.15)" };
    if (n.includes("nvidia")) return { Icon: NvidiaIcon, color: "#76B900", bg: "rgba(118, 185, 0, 0.15)" };
    if (n.includes("realtek") || p.includes("realtek") || n.includes("audio")) return { Icon: Volume2, color: "#005596", bg: "rgba(0, 85, 150, 0.15)" };
    if (p.includes("microsoft") || p.includes("windows") || n.includes("explorer")) return { Icon: MicrosoftIcon, color: "#0078D4", bg: "rgba(0, 120, 212, 0.15)" };
    if (n.includes("firefox")) return { Icon: FirefoxIcon, color: "#FF7139", bg: "rgba(255, 113, 57, 0.15)" };
    if (n.includes("vscode") || n.includes("visual studio")) return { Icon: VSCodeIcon, color: "#007ACC", bg: "rgba(0, 122, 204, 0.15)" };
    if (n.includes("github") || p.includes("github")) return { Icon: GithubIcon, color: "#24292e", bg: "rgba(100, 100, 100, 0.15)" };

    return null;
  } catch (err) {
    console.warn("getAppBrandInfo error:", err);
    return null;
  }
}

// Priority 3: Initial Avatar with Hash-Based Color Generation
function getInitialAvatar(name: string): { letter: string; color: string; bg: string } {
  try {
    const raw = (name || "App").trim();
    const clean = raw.replace(/^[^a-zA-Z0-9]+/, "");
    const letter = (clean.charAt(0) || raw.charAt(0) || "A").toUpperCase();

    let hash = 0;
    for (let i = 0; i < raw.length; i++) {
      hash = raw.charCodeAt(i) + ((hash << 5) - hash);
    }
    const safeHash = Math.abs(hash);

    const AVATAR_PALETTES = [
      { color: "#0d9488", bg: "rgba(13, 148, 136, 0.16)" }, // Teal
      { color: "#6366f1", bg: "rgba(99, 102, 241, 0.16)" }, // Indigo
      { color: "#ec4899", bg: "rgba(236, 72, 153, 0.16)" }, // Pink
      { color: "#f59e0b", bg: "rgba(245, 158, 11, 0.16)" }, // Amber
      { color: "#10b981", bg: "rgba(16, 185, 129, 0.16)" }, // Emerald
      { color: "#8b5cf6", bg: "rgba(139, 92, 246, 0.16)" }, // Purple
      { color: "#0ea5e9", bg: "rgba(14, 165, 233, 0.16)" }, // Sky
      { color: "#f43f5e", bg: "rgba(244, 63, 94, 0.16)" }, // Rose
      { color: "#14b8a6", bg: "rgba(20, 184, 166, 0.16)" }, // Cyan
      { color: "#a855f7", bg: "rgba(168, 85, 247, 0.16)" }, // Violet
      { color: "#3b82f6", bg: "rgba(59, 130, 246, 0.16)" }, // Blue
      { color: "#84cc16", bg: "rgba(132, 204, 22, 0.16)" }, // Lime
    ];

    const palette = AVATAR_PALETTES[safeHash % AVATAR_PALETTES.length];
    return { letter, color: palette.color, bg: palette.bg };
  } catch {
    return { letter: "A", color: "#0d9488", bg: "rgba(13, 148, 136, 0.16)" };
  }
}

function AppBrandIcon({
  name,
  publisher,
  icon,
  enabled,
}: {
  name: string;
  publisher?: string;
  icon?: string;
  enabled: boolean;
}) {
  const [exeImgFailed, setExeImgFailed] = useState(false);

  // Priority 1: Match from brand icon library
  let brandInfo: BrandInfo | null = null;
  try {
    brandInfo = getAppBrandInfo(name, publisher || "");
  } catch (err) {
    console.warn("Brand icon match failed:", err);
  }

  if (brandInfo) {
    const Icon = brandInfo.Icon;
    return (
      <div
        className="w-10 h-10 min-w-[40px] min-h-[40px] rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-200 border border-border/30 shadow-xs"
        style={{
          backgroundColor: enabled ? brandInfo.bg : "var(--secondary)",
          color: enabled ? brandInfo.color : "var(--muted-foreground)",
          filter: !enabled ? "grayscale(75%) opacity(0.6)" : "none",
        }}
      >
        <Icon size={20} />
      </div>
    );
  }

  // Priority 2: Extracted .exe icon (if provided and hasn't failed)
  if (icon && !exeImgFailed) {
    return (
      <div
        className="w-10 h-10 min-w-[40px] min-h-[40px] rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-200 border border-border/30 shadow-xs bg-secondary/40 overflow-hidden"
        style={{
          filter: !enabled ? "grayscale(75%) opacity(0.6)" : "none",
        }}
      >
        <img
          src={icon}
          alt={name}
          className="w-6 h-6 object-contain"
          onError={() => setExeImgFailed(true)}
        />
      </div>
    );
  }

  // Priority 3: Initial avatar with hash-generated consistent color
  const avatar = getInitialAvatar(name);
  return (
    <div
      className="w-10 h-10 min-w-[40px] min-h-[40px] rounded-xl flex items-center justify-center flex-shrink-0 font-bold text-sm select-none transition-all duration-200 border border-border/30 shadow-xs"
      style={{
        backgroundColor: enabled ? avatar.bg : "var(--secondary)",
        color: enabled ? avatar.color : "var(--muted-foreground)",
        filter: !enabled ? "grayscale(75%) opacity(0.6)" : "none",
      }}
    >
      {avatar.letter}
    </div>
  );
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

function PillBadge({ label }: { label: string }) {
  const { t } = useTranslation();
  let color = P.slate;
  let bg = "var(--secondary)";

  if (label === "High") {
    color = P.rose;
    bg = `color-mix(in srgb, ${P.rose} 15%, transparent)`;
  } else if (label === "Medium") {
    color = P.amber;
    bg = `color-mix(in srgb, ${P.amber} 15%, transparent)`;
  } else if (label === "Low") {
    color = P.teal;
    bg = `color-mix(in srgb, ${P.teal} 15%, transparent)`;
  }

  return (
    <span
      className="text-[10px] px-2.5 py-1 rounded-md font-bold uppercase tracking-wider border"
      style={{
        background: bg,
        color: color,
        borderColor: `color-mix(in srgb, ${color} 30%, transparent)`,
      }}
    >
      {t(label)}
    </span>
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
      }}
    >
      <span
        className="absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-all duration-300"
        style={{ left: on ? "calc(100% - 19px)" : "3px" }}
      />
    </button>
  );
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

const isTauri =
  typeof window !== "undefined" &&
  ((window as any).__TAURI_INTERNALS__ !== undefined ||
    (window as any).__TAURI_IPC__ !== undefined);

export function StartupTab() {
  const { t } = useTranslation();
  const [items, setItems] = useState<StartupItem[]>([]);
  const [search, setSearch] = useState("");
  const [newName, setNewName] = useState("");
  const [newPath, setNewPath] = useState("");
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (isTauri) {
      invoke<StartupItem[]>("get_startup_items")
        .then((res) => {
          setItems(res);
        })
        .catch(console.error);
    }
  }, []);

  const toggle = async (name: string, is_hkcu: boolean, current_enabled: boolean) => {
    try {
      await invoke("toggle_startup_item", { name, isHkcu: is_hkcu, enable: !current_enabled });
      setItems((prev) =>
        prev.map((item) => (item.name === name ? { ...item, enabled: !item.enabled } : item))
      );
      addHistoryLog({
        type: "Startup Toggled",
        freed: "N/A",
        fixed: 1,
        duration: "0.0s",
        details: !current_enabled ? `Enabled:${name}` : `Disabled:${name}`,
      });
    } catch (e) {
      console.error("Failed to toggle:", e);
    }
  };

  const handleDisableAllHighImpact = async () => {
    const highImpactEnabled = items.filter((i) => i.impact === "High" && i.enabled);
    if (highImpactEnabled.length === 0) return;
    const startTime = Date.now();
    try {
      for (const item of highImpactEnabled) {
        await invoke("toggle_startup_item", {
          name: item.name,
          isHkcu: item.is_hkcu,
          enable: false,
        });
      }
      setItems((prev) =>
        prev.map((item) => (item.impact === "High" ? { ...item, enabled: false } : item))
      );
      const duration = ((Date.now() - startTime) / 1000).toFixed(1) + "s";
      addHistoryLog({
        type: "Startup Optimizer",
        freed: "N/A",
        fixed: highImpactEnabled.length,
        duration,
        details: `DisabledHighImpact:${highImpactEnabled.length}`,
      });
    } catch (e) {
      console.error("Failed to disable high impact:", e);
    }
  };

  const refreshItems = async () => {
    const res = await invoke<StartupItem[]>("get_startup_items");
    setItems(res);
  };

  const handleDelete = async (name: string, is_hkcu: boolean) => {
    if (!confirm(t("Are you sure you want to delete this startup item?"))) return;
    try {
      await invoke("delete_startup_item", { name, isHkcu: is_hkcu });
      setItems((prev) => prev.filter((item) => item.name !== name));
      addHistoryLog({
        type: "Startup Deleted",
        freed: "N/A",
        fixed: 1,
        duration: "0.0s",
        details: `Deleted:${name}`,
      });
    } catch (e) {
      console.error("Failed to delete startup item:", e);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newPath.trim()) return;
    setAdding(true);
    try {
      await invoke("add_startup_item", {
        name: newName.trim(),
        path: newPath.trim(),
        isHkcu: true,
      });
      addHistoryLog({
        type: "Startup Added",
        freed: "N/A",
        fixed: 1,
        duration: "0.0s",
        details: `Added:${newName.trim()}`,
      });
      setNewName("");
      setNewPath("");
      await refreshItems();
    } catch (e) {
      console.error("Failed to add startup item:", e);
    } finally {
      setAdding(false);
    }
  };

  const filtered = items.filter(
    (i) =>
      i.name.toLowerCase().includes(search.toLowerCase()) ||
      (i.publisher && i.publisher.toLowerCase().includes(search.toLowerCase()))
  );

  const disabledCount = items.filter((i) => !i.enabled).length;
  const timeSaved = items
    .filter((i) => !i.enabled)
    .reduce((s, i) => s + (i.delay || 0), 0)
    .toFixed(1);
  const bootTime = (
    items.filter((i) => i.enabled).reduce((s, i) => s + (i.delay || 0), 0) + 8
  ).toFixed(1);

  return (
    <div className="space-y-4">
      {/* ── Stats ────────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          icon={<Clock size={15} />}
          label={t("Est. Boot Time")}
          value={`${bootTime}s`}
          sub={t("With enabled items")}
          color={P.sky}
        />
        <StatCard
          icon={<TrendingUp size={15} />}
          label={t("Time Saved")}
          value={`${timeSaved}s`}
          sub={`${disabledCount} ${t("items disabled")}`}
          color={P.teal}
        />
        <StatCard
          icon={<PackageX size={15} />}
          label={t("High Impact")}
          value={`${items.filter((i) => i.impact === "High" && i.enabled).length}`}
          sub={t("Items still enabled")}
          color={P.rose}
        />
      </div>

      <form
        onSubmit={handleAdd}
        className="grid grid-cols-1 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.4fr)_auto] gap-3 rounded-2xl border border-border/60 bg-card p-4 shadow-sm"
      >
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder={t("Program name")}
          className="min-w-0 rounded-xl border border-border bg-secondary/40 px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-teal-500"
        />
        <input
          value={newPath}
          onChange={(e) => setNewPath(e.target.value)}
          placeholder={t("Executable path")}
          className="min-w-0 rounded-xl border border-border bg-secondary/40 px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-teal-500"
        />
        <button
          type="submit"
          disabled={adding || !newName.trim() || !newPath.trim()}
          className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold text-white shadow-sm transition-all hover:-translate-y-0.5 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
          style={{ background: P.teal }}
        >
          {adding ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
          {adding ? t("Adding...") : t("Add Startup Item")}
        </button>
      </form>

      {/* ── Manager ────────────────────────────────────────────────────────── */}
      <Card className="p-0 overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 border-b border-border bg-card">
          <div className="flex-1 flex items-center gap-2 px-3 py-2 rounded-xl bg-secondary/50 border border-border">
            <Search size={14} className="text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("Search programs...")}
              className="flex-1 text-sm bg-transparent outline-none text-foreground placeholder-muted-foreground"
            />
          </div>
          <button
            onClick={handleDisableAllHighImpact}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-white transition-all hover:-translate-y-0.5 active:scale-95 shadow-sm whitespace-nowrap cursor-pointer"
            style={{ background: P.teal }}
          >
            {t("Disable All High Impact")}
          </button>
        </div>

        <div className="divide-y divide-border">
          {filtered.length > 0 ? (
            filtered.map((item) => (
              <div
                key={item.name}
                className={cn(
                  "flex items-center gap-4 p-4 transition-colors duration-200",
                  item.enabled
                    ? "bg-card hover:bg-secondary/30"
                    : "bg-secondary/20 hover:bg-secondary/50 opacity-80"
                )}
              >
                <AppBrandIcon
                  name={item.name}
                  publisher={item.publisher || ""}
                  icon={item.icon}
                  enabled={item.enabled}
                />
                <div className="flex-1 min-w-0">
                  <div
                    className={cn(
                      "text-sm font-semibold truncate",
                      item.enabled
                        ? "text-foreground"
                        : "text-muted-foreground line-through decoration-muted-foreground/30"
                    )}
                  >
                    {item.name}
                  </div>
                  <div
                    className="text-[11px] text-muted-foreground truncate mt-0.5"
                    title={item.command}
                  >
                    {item.publisher} <span className="mx-1.5 opacity-50">•</span> {t("Boot delay:")}{" "}
                    +{item.delay?.toFixed(1)}s
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <PillBadge label={item.impact || "Low"} />
                  <Toggle
                    on={item.enabled}
                    onChange={() => toggle(item.name, item.is_hkcu, item.enabled)}
                  />
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={() => handleDelete(item.name, item.is_hkcu)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground transition-all hover:-translate-y-0.5 hover:border-rose-400 hover:text-rose-500 active:scale-95"
                        aria-label={t("Delete startup item")}
                      >
                        <Trash2 size={14} />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      {t("Delete startup item")}
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>
            ))
          ) : (
            <div className="py-10 text-center text-sm text-muted-foreground">
              {t("No startup items found")}
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

// Centralized Type Definitions for CPulse

export const JUNK_CATEGORIES = [
  "Windows Temp Files",
  "Browser Cache",
  "Windows Update Cache",
  "System Log Files",
  "Thumbnail Cache",
  "Windows Error Reports",
  "Delivery Optimization Files",
  "Temporary Setup Files",
  "Prefetch Cache",
  "DirectX Shader Cache",
  "Recycle Bin",
  "Memory Dumps",
  "Font Cache",
] as const;

export type JunkCategoryName = (typeof JUNK_CATEGORIES)[number];

export interface JunkItem {
  name: string;
  size: string;
  bytes: number;
  count: number;
  description: string;
  warning: string;
  requires_admin: boolean;
}

export interface CleanResult {
  bytes_freed: number;
  files_cleaned: number;
}

export interface StartupItem {
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

export interface DiskInfo {
  name: string;
  used: number;
  total: number;
  disk_type: string;
  model: string;
}

export interface SystemMetrics {
  cpu_usage: number;
  cpu_temp: number;
  cpu_name: string;
  cpu_cores: number[];
  ram_usage: number;
  total_ram: number;
  used_ram: number;
  disks: DiskInfo[];
  network_up: number;
  network_down: number;
  disk_read_speed: number;
  disk_write_speed: number;
  uptime: number;
  process_count: number;
}

export interface UserSettings {
  startWithWindows: boolean;
  minimizeToTray: boolean;
  autoUpdate: boolean;
  autoClean: boolean;
  realTimeMonitoring: boolean;
  contextMenu: boolean;
  notifications: boolean;
  soundEffects: boolean;
  language: string;
}

export const DEFAULT_USER_SETTINGS: UserSettings = {
  startWithWindows: false,
  minimizeToTray: true,
  autoUpdate: false,
  autoClean: false,
  realTimeMonitoring: true,
  contextMenu: false,
  notifications: false,
  soundEffects: false,
  language: "en",
};

export interface PrivacyItemDetail {
  found: boolean;
  count: number;
  desc: string;
}

export type PrivacyScanResult = Record<string, PrivacyItemDetail>;

export interface WindowsKeyData {
  key: string;
  key_type: string;
  edition: string;
  is_valid: boolean;
}

export interface NotificationItem {
  id: number;
  title: string;
  desc: string;
  time: string;
  unread: boolean;
}

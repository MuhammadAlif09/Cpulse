import React, { useState, useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { getVersion, getName } from "@tauri-apps/api/app";
import { RadialGauge } from "./components/RadialGauge";
import { ScanAnimation } from "./components/ScanAnimation";
import { MainLayout } from "./layouts/MainLayout";
import { motion, AnimatePresence } from "motion/react";
import {
  Shield,
  Trash2,
  Zap,
  Settings,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
  HardDrive,
  Cpu,
  MemoryStick,
  Wifi,
  Monitor,
  Play,
  RotateCcw,
  BarChart3,
  PackageX,
  Star,
  TrendingUp,
  Clock,
  Lock,
  Globe,
  Eye,
  EyeOff,
  RefreshCw,
  Activity,
  Thermometer,
  Database,
  ArrowUpRight,
  ArrowDownRight,
  ChevronDown,
  X,
  Sparkles,
  Battery,
  Search,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { DashboardTab } from "./features/DashboardTab";
import { CleanerTab } from "./features/CleanerTab";
import { BoosterTab } from "./features/BoosterTab";
import { StartupTab } from "./features/StartupTab";
import { PrivacyTab } from "./features/PrivacyTab";
import { HistoryTab } from "./features/HistoryTab";
import { SettingsTab } from "./features/SettingsTab";
import { DiagnosticsTab } from "./features/DiagnosticsTab";
import { useCleanerStore } from "./store/useCleanerStore";

// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ translations Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
const TRANSLATIONS: Record<string, Record<string, string>> = {
  id: {
    Dashboard: "Dasbor",
    Cleaner: "Pembersih",
    Booster: "Peningkat",
    Startup: "Awalan",
    Privacy: "Privasi",
    History: "Riwayat",
    Settings: "Pengaturan",
    "System overview and real-time health metrics":
      "Ikhtisar sistem dan metrik kesehatan real-time",
    "Scan and remove junk files to free up disk space":
      "Pindai dan hapus file sampah untuk mengosongkan ruang disk",
    "Tune Windows settings for maximum performance":
      "Sesuaikan pengaturan Windows untuk performa maksimal",
    "Manage programs that launch automatically at boot":
      "Kelola program yang berjalan otomatis saat booting",
    "Find and erase privacy traces and tracking data":
      "Temukan dan hapus jejak privasi dan data pelacakan",
    "View past cleaning and optimization sessions":
      "Lihat sesi pembersihan dan optimalisasi sebelumnya",
    "Configure application preferences and automation":
      "Konfigurasi preferensi aplikasi dan otomatisasi",
    "System Health Score": "Skor Kesehatan Sistem",
    "System is running optimally": "Sistem berjalan optimal",
    "Your PC needs some attention": "PC Anda butuh perhatian",
    "Real-time protection active": "Perlindungan real-time aktif",
    "Disk and memory are healthy": "Disk dan memori sehat",
    "CPU Usage": "Penggunaan CPU",
    "RAM Usage": "Penggunaan RAM",
    "Disk Usage": "Penggunaan Disk",
    "Network I/O": "Jaringan I/O",
    "Run as Admin for Temp": "Buka sbg Admin u/ Suhu",
    "in use": "digunakan",
    "Waiting for data": "Menunggu data",
    "CPU History": "Riwayat CPU",
    "Last 20s": "20d terakhir",
    "RAM History": "Riwayat RAM",
    "Disk Space": "Ruang Disk",
    "Loading disks...": "Memuat disk...",
    "Quick Actions": "Aksi Cepat",
    "Clean Junk": "Bersih Sampah",
    "Found Junk": "Sampah Ditemukan",
    "Cleaned!": "Bersih!",
    "Scan PC": "Pindai PC",
    ready: "siap",
    Freed: "Dikosongkan",
    Scan: "Pindai",
    Clean: "Bersih",
    "Wait...": "Tunggu...",
    Done: "Selesai",
    "RAM Cleaner": "Pembersih RAM",
    "Free up memory": "Kosongkan memori",
    "Optimizing...": "Mengoptimalkan...",
    "Fix Startup": "Awalan",
    "Checking...": "Memeriksa...",
    "items active": "item aktif",
    "Privacy Sweep": "Sapu Privasi",
    "Traces found": "Jejak ditemukan",
    "Junk File Scanner": "Pemindai File Sampah",
    "Deep scan for all unnecessary files — temporary data, cache, and residual clutter":
      "Pindai mendalam file tak perlu — data sementara, cache, dan sisa",
    "Start Scan": "Mulai Pindai",
    "Scanning...": "Memindai...",
    Rescan: "Pindai Ulang",
    "Cleaned Successfully!": "Berhasil Dibersihkan!",
    Ready: "Siap",
    "Scan complete": "Pindai selesai",
    "Found — Select to Clean": "Ditemukan — Pilih untuk Dibersihkan",
    "Select All": "Semua",
    None: "Tidak ada",
    files: "file",
    "Optimization Profile": "Profil Optimalisasi",
    "Choose how aggressively to optimize your system":
      "Pilih seberapa agresif mengoptimalkan sistem Anda",
    Balanced: "Seimbang",
    Performance: "Performa",
    Gaming: "Gaming",
    applied: "diterapkan",
    "Apply All": "Terapkan Semua",
    Apply: "Terapkan",
    "Est. Boot Time": "Est. Waktu Boot",
    "With enabled items": "Dengan item aktif",
    "Time Saved": "Waktu Dihemat",
    "items disabled": "item dimatikan",
    "High Impact": "Dampak Tinggi",
    "Items still enabled": "Item masih aktif",
    "Search programs...": "Cari program...",
    "Disable All High Impact": "Matikan Semua Dampak Tinggi",
    "Privacy Scanner": "Pemindai Privasi",
    "Finds browsing history, search traces, saved passwords, and tracking data left on your PC":
      "Cari riwayat, jejak pencarian, kata sandi, dan data pelacakan",
    "Sweep Items": "Sapu Item",
    "Sweeping...": "Menyapu...",
    "Privacy Cleared!": "Privasi Bersih!",
    "Privacy Traces Found": "Jejak Privasi Ditemukan",
    "selected for removal": "dipilih untuk dihapus",
    "Privacy Protection Tips": "Tips Perlindungan Privasi",
    "General Preferences": "Preferensi Umum",
    Language: "Bahasa",
    "Select application language": "Pilih bahasa aplikasi",
    "Start with Windows": "Mulai bersama Windows",
    "Launch automatically when PC boots": "Jalankan otomatis saat PC menyala",
    "Minimize to Tray": "Minimalkan ke Tray",
    "Keep running in background when closed": "Tetap di latar saat ditutup",
    "Context Menu Integration": "Integrasi Menu Konteks",
    'Add "Clean with CPulse" to right-click menu': 'Tambah "Bersihkan dengan CPulse" ke klik kanan',
    Automation: "Otomatisasi",
    "Auto-Clean Schedule": "Jadwal Bersih Otomatis",
    "Clean junk files automatically every week": "Bersihkan file sampah otomatis setiap minggu",
    "Real-time Monitoring": "Pemantauan Real-time",
    "Alert when disk space is critically low": "Peringatan saat ruang disk menipis",
    "Automatic Updates": "Pembaruan Otomatis",
    "Install new versions silently in background": "Instal versi baru di latar",
    "Alerts & Sounds": "Peringatan & Suara",
    "Push Notifications": "Notifikasi Push",
    "Show system tray alerts for important events": "Tampilkan peringatan tray untuk acara penting",
    "Sound Effects": "Efek Suara",
    "Play sounds when scans or cleans finish": "Mainkan suara saat selesai",
    "About CPulse": "Tentang CPulse",
    Version: "Versi",
    "Check for Updates": "Cek Pembaruan",
    "Loading history...": "Memuat riwayat...",
    "No cleaning history yet.": "Belum ada riwayat pembersihan.",
    "Run your first scan!": "Jalankan pemindaian pertama Anda!",
    "Total Freed": "Total Dikosongkan",
    "All time": "Sepanjang waktu",
    "Scans Run": "Pemindaian",
    "Last 30 days": "30 hari terakhir",
    "Issues Fixed": "Masalah Diperbaiki",
    "Space Freed Per Month": "Ruang Dikosongkan/Bulan",
    "Chart data will appear after a few cleanings.":
      "Data grafik muncul setelah beberapa pembersihan.",
    "Session Log": "Log Sesi",
    "Administrator Mode": "Mode Administrator",
    "Standard Mode": "Mode Standar",
    Notifications: "Notifikasi",
    "Clear all": "Hapus semua",
    "No new notifications.": "Belum ada notifikasi baru.",
    "Last cleaned": "Terakhir dibersihkan",
    "None yet": "Belum ada",
    freed: "dikosongkan",
    English: "Inggris",
    Indonesia: "Indonesia",
    "issue found": "masalah ditemukan",
    "issues found": "masalah ditemukan",
    "issues fixed": "masalah diperbaiki",
    "Disk Space Low": "Ruang Disk Menipis",
    "Overall disk usage is at": "Penggunaan disk keseluruhan ada di",
    "capacity.": "kapasitas.",
    "Just now": "Baru saja",
    "Disk at": "Disk di",
    "consider cleaning": "pertimbangkan membersihkan",
    "of junk found": "sampah ditemukan",
    "startup items slowing boot": "item awalan memperlambat booting",
    "High RAM usage": "Penggunaan RAM tinggi",
    Excellent: "Sangat Baik",
    Good: "Baik",
    "Needs Attention": "Butuh Perhatian",
    issue: "masalah",
    issues: "masalah",
    "RAM Optimizer": "Pengoptimal RAM",
    "Flush standby list and free unused memory pages": "Kosongkan memori yang tidak digunakan",
    "+1.4 GB freed": "+1.4 GB dikosongkan",
    Memory: "Memori",
    "CPU Priority Manager": "Manajer Prioritas CPU",
    "Elevate priority for active foreground processes":
      "Tingkatkan prioritas untuk proses yang sedang aktif",
    "~12% snappier": "~12% lebih responsif",
    Processor: "Prosesor",
    "Network Tweaker": "Penyetel Jaringan",
    "Optimize TCP/IP stack, DNS cache & buffer sizes":
      "Optimalkan TCP/IP, cache DNS & ukuran buffer",
    "Ã¢Ë†â€™18ms latency": "Ã¢Ë†â€™18ms latensi",
    Network: "Jaringan",
    "Visual Effects Trim": "Pemangkas Efek Visual",
    "Turn off non-essential animations and transparency": "Matikan animasi yang tidak penting",
    "+6% GPU free": "+6% GPU bebas",
    Graphics: "Grafis",
    "High Performance Mode": "Mode Performa Tinggi",
    "Switch Windows power plan to maximum performance":
      "Ubah mode daya Windows ke performa maksimal",
    "Max clock speed": "Kecepatan clock maksimal",
    Power: "Daya",
    "Disk I/O Optimizer": "Pengoptimal I/O Disk",
    "TRIM SSD, optimize prefetch and SuperFetch settings":
      "TRIM SSD, optimalkan prefetch dan SuperFetch",
    "Ã¢Ë†â€™22% I/O wait": "Ã¢Ë†â€™22% tunggu I/O",
    Storage: "Penyimpanan",
    "Game Mode Enhancer": "Peningkat Mode Game",
    "Redirect resources to foreground game processes":
      "Arahkan sumber daya ke game yang sedang berjalan",
    "Smoother FPS": "FPS lebih mulus",
    "Thermal Manager": "Manajer Suhu",
    "Optimize fan curves and thermal throttle limits": "Optimalkan kurva kipas dan batas suhu",
    "Ã¢Ë†â€™4Ã‚Â°C average": "Ã¢Ë†â€™4Ã‚Â°C rata-rata",
    Cooling: "Pendingin",
    "Chrome Browsing History": "Riwayat Penelusuran Chrome",
    "1,842 URLs found": "1.842 URL ditemukan",
    "Edge Browsing History": "Riwayat Penelusuran Edge",
    "673 URLs found": "673 URL ditemukan",
    "Recent Files List": "Daftar File Baru-baru Ini",
    "128 entries": "128 entri",
    "Clipboard History": "Riwayat Papan Klip",
    "47 copied items": "47 item disalin",
    "Windows Search History": "Riwayat Pencarian Windows",
    "312 queries": "312 pencarian",
    "Saved Wi-Fi Passwords": "Kata Sandi Wi-Fi Tersimpan",
    "9 networks stored": "9 jaringan tersimpan",
    "Tracking Cookies": "Kuki Pelacak",
    "4,291 cookies": "4.291 kuki",
    "Run Dialog History": "Riwayat Dialog Run",
    "23 entries": "23 entri",
    Found: "Ditemukan",
    "Enable BitLocker encryption on your drive for full data protection.":
      "Aktifkan enkripsi BitLocker pada disk untuk perlindungan data penuh.",
    "Use a private DNS (like Cloudflare 1.1.1.1) to prevent ISP tracking.":
      "Gunakan DNS pribadi untuk mencegah pelacakan ISP.",
    "Clear cookies weekly to remove cross-site tracking data.":
      "Bersihkan kuki setiap minggu untuk menghapus pelacakan.",
    "Review app permissions — revoke access to camera and mic you don't need.":
      "Tinjau izin aplikasi — cabut akses kamera dan mikrofon.",
    Up: "Unggah",
    Down: "Unduh",
    "Boot delay:": "Tunda boot:",
    pts: "poin",
    "Deep Clean": "Pembersihan Mendalam",
    "Quick Clean": "Pembersihan Cepat",
    "System Cache": "Cache Sistem",
    "Temporary Files": "File Sementara",
    "Log Files": "File Log",
    "Recycle Bin": "Tempat Sampah",
    "Browser Cache": "Cache Peramban",
    "Windows Update Cache": "Cache Pembaruan Windows",
  },
};

const t = (lang: string, text: string) => {
  const l = lang?.toLowerCase() === "id" ? "id" : "en";
  if (l === "en") return text;
  return TRANSLATIONS[l]?.[text] || text;
};

// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ palette Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
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

// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ mock data Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
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
  {
    id: "chrome_hist",
    label: "Chrome Browsing History",
    desc: "1,842 URLs found",
    found: true,
    color: C.indigo,
  },
  {
    id: "edge_hist",
    label: "Edge Browsing History",
    desc: "673 URLs found",
    found: true,
    color: C.violet,
  },
  {
    id: "recent_files",
    label: "Recent Files List",
    desc: "128 entries",
    found: true,
    color: C.amber,
  },
  {
    id: "clipboard",
    label: "Clipboard History",
    desc: "47 copied items",
    found: true,
    color: C.rose,
  },
  {
    id: "search_hist",
    label: "Windows Search History",
    desc: "312 queries",
    found: true,
    color: C.pink,
  },
  {
    id: "wifi_pass",
    label: "Saved Wi-Fi Passwords",
    desc: "9 networks stored",
    found: true,
    color: C.emerald,
  },
  { id: "cookies", label: "Tracking Cookies", desc: "4,291 cookies", found: true, color: C.cyan },
  { id: "run_hist", label: "Run Dialog History", desc: "23 entries", found: false, color: C.slate },
];

type Tab =
  | "dashboard"
  | "cleaner"
  | "booster"
  | "startup"
  | "privacy"
  | "history"
  | "settings"
  | "diagnostics";

// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ shared helpers Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
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
        "rounded-2xl p-5 border border-white/60 dark:border-slate-800/40 shadow-sm relative overflow-hidden transition-colors duration-300 bg-card text-card-foreground",
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

function PillBadge({ label, color, lang }: { label: string; color: string; lang: string }) {
  const map: Record<string, string> = {
    High: "bg-rose-50 text-rose-600 border border-rose-200",
    Medium: "bg-amber-50 text-amber-600 border border-amber-200",
    Low: "bg-emerald-50 text-emerald-600 border border-emerald-200",
  };
  return (
    <span
      className={cn(
        "text-xs px-2.5 py-0.5 rounded-full font-medium",
        map[label] ?? "bg-slate-100 text-slate-600"
      )}
    >
      {t(lang, label)}
    </span>
  );
}

function Toggle({ on, onChange }: { on: boolean; onChange: () => void }) {
  return (
    <button
      onClick={onChange}
      className="relative w-11 h-6 rounded-full transition-all duration-300 flex-shrink-0 cursor-pointer"
      style={{ background: on ? C.indigo : "var(--border)" }}
    >
      <span
        className={cn(
          "absolute top-1 w-4 h-4 rounded-full transition-all duration-300",
          on ? "bg-white shadow-sm" : "bg-slate-400 dark:bg-slate-600"
        )}
        style={{ left: on ? "calc(100% - 20px)" : "4px" }}
      />
    </button>
  );
}

// Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬ dashboard Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬Ã¢â€â‚¬
import { listen } from "@tauri-apps/api/event";
import { load } from "@tauri-apps/plugin-store";
import { enable, isEnabled, disable } from "@tauri-apps/plugin-autostart";
import { check } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";

let store: any = null;

const isTauri =
  typeof window !== "undefined" &&
  ((window as any).__TAURI_INTERNALS__ !== undefined ||
    (window as any).__TAURI_IPC__ !== undefined ||
    (window as any).process?.env?.NODE_ENV === "test");

interface DiskInfo {
  name: string;
  used: number;
  total: number;
  disk_type: string;
  model: string;
}

interface SystemMetrics {
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

const NAV: { id: Tab; label: string; icon: React.ReactNode; badge?: number }[] = [
  { id: "dashboard", label: "Dashboard", icon: <Monitor size={16} /> },
  { id: "cleaner", label: "Cleaner", icon: <Trash2 size={16} />, badge: 3 },
  { id: "booster", label: "Booster", icon: <Zap size={16} /> },
  { id: "startup", label: "Startup", icon: <PackageX size={16} />, badge: 3 },
  { id: "privacy", label: "Privacy", icon: <Lock size={16} />, badge: 7 },
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

export default function App() {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const checkAdmin = async () => {
      if (!isTauri) return;
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
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const junkItems = useCleanerStore((state) => state.junkCats);
  const [startupItems, setStartupItems] = useState<StartupItem[]>([]);
  const [privacySwept, setPrivacySwept] = useState(false);
  const [appVersion, setAppVersion] = useState("0.16.10");
  const [appName, setAppName] = useState("Cpulse");

  useEffect(() => {
    if (isTauri) {
      getVersion().then(setAppVersion).catch(console.error);
      getName().then(setAppName).catch(console.error);
    }
  }, []);

  const unreadCount = notifications.filter((n) => n.unread).length;

  const [globalSettings, setGlobalSettings] = useState<any>({
    notifications: false,
    realTimeMonitoring: true,
    soundEffects: false,
    language: "en",
  });
  const [lang, setLang] = useState<string>("en");

  // Initial data fetch
  useEffect(() => {
    if (isTauri) {
      useCleanerStore.getState().startScan().catch(console.error);
      invoke<StartupItem[]>("get_startup_items").then(setStartupItems).catch(console.error);
    }
  }, []);

  // Health Score Calculation
  let score = 100;
  let issues: string[] = [];

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

  useEffect(() => {
    const loadGlobalSettings = async () => {
      if (!store) {
        store = await load("settings.json");
      }
      const saved = (await store.get("user-settings")) as any;
      if (saved) {
        setGlobalSettings((prev: any) => ({ ...prev, ...saved }));
        if (saved.language) setLang(saved.language);
      } else {
        const defaults = {
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
        await store.set("user-settings", defaults);
        await store.save();
        setGlobalSettings(defaults);
        setLang("en");
      }
    };
    loadGlobalSettings();
  }, [tab]); // Reload settings when tab changes just in case

  useEffect(() => {
    let unlisten: () => void;
    let hasNotifiedDisk = false;

    const setup = async () => {
      if (!isTauri) return;
      unlisten = await listen<SystemMetrics>("system-metrics", (event) => {
        const metrics = event.payload;
        setMetrics(metrics);

        if (!globalSettings.realTimeMonitoring) return;

        const totalDiskUsed = metrics ? metrics.disks.reduce((acc, d) => acc + d.used, 0) : 0;
        const totalDiskSize = metrics ? metrics.disks.reduce((acc, d) => acc + d.total, 0) : 1;
        const diskUsagePct = metrics ? Math.round((totalDiskUsed / totalDiskSize) * 100) : 0;

        if (diskUsagePct > 80 && !hasNotifiedDisk) {
          hasNotifiedDisk = true;
          if (globalSettings.notifications) {
            setNotifications((prev) => [
              {
                id: Date.now(),
                title: "Disk Space Low",
                desc: `C: Drive is at ${diskUsagePct}% capacity.`,
                time: "Just now",
                unread: true,
              },
              ...prev,
            ]);

            if (globalSettings.soundEffects) {
              // Play a mock sound
              // new Audio('/alert.mp3').play().catch(() => {});
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
    lang,
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
        setTab,
        unreadCount,
        showNotif,
        setShowNotif,
        notifications,
        setNotifications,
      }}
      sidebarProps={{
        nav: NAV,
        tab,
        setTab,
        junkItems,
        startupItems,
        privacyItems: PRIVACY_ITEMS,
        privacySwept,
        score,
        healthText,
        issues,
        lang,
        t,
      }}
    >
      <div className="mb-6 animate-fade-in">
        <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100 transition-colors duration-300">
          {t(lang, NAV.find((n) => n.id === tab)?.label || "")}
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5 transition-colors duration-300">
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
          {tab === "dashboard" && (
            <DashboardTab
              lang={lang}
              setTab={setTab}
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
                setGlobalSettings((prev: any) => ({ ...prev, language: l }));
              }}
            />
          )}
        </motion.div>
      </AnimatePresence>
    </MainLayout>
  );
}

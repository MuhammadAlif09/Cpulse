import { emit } from "./tauriEvent";

export interface JunkItem {
  name: string;
  size: string;
  bytes: number;
  count: number;
  description: string;
  warning: string;
  requires_admin: boolean;
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

let mockJunkList: JunkItem[] = [
  {
    name: "System Cache & Temp Files",
    size: "1.4 GB",
    bytes: 1503238553,
    count: 4820,
    description: "Temporary files created by system applications and OS routines",
    warning: "",
    requires_admin: false,
  },
  {
    name: "Browser Cache",
    size: "850.4 MB",
    bytes: 891702476,
    count: 1840,
    description: "Cached web pages, images, and script files from Chrome & Edge",
    warning: "",
    requires_admin: false,
  },
  {
    name: "Windows Update Cleanup",
    size: "2.1 GB",
    bytes: 2254857830,
    count: 120,
    description: "Downloaded update packages and installer caches",
    warning: "Clearing may delay installation of pending updates",
    requires_admin: true,
  },
  {
    name: "Crash Dumps & Error Logs",
    size: "340.0 MB",
    bytes: 356515840,
    count: 85,
    description: "Memory dump files and application crash logs",
    warning: "",
    requires_admin: false,
  },
  {
    name: "Recycle Bin",
    size: "1.8 GB",
    bytes: 1932735283,
    count: 312,
    description: "Files moved to Recycle Bin awaiting permanent deletion",
    warning: "Permanently deletes all items in Recycle Bin",
    requires_admin: false,
  },
  {
    name: "Windows Prefetch",
    size: "45.2 MB",
    bytes: 47395840,
    count: 180,
    description: "System prefetch files used to speed up app loading",
    warning: "May temporarily slow down initial launch of some apps",
    requires_admin: true,
  },
];

let mockStartupItems: StartupItem[] = [
  {
    name: "Discord",
    publisher: "Discord Inc.",
    command: "C:\\Program Files\\Discord\\Discord.exe --autostart",
    registry_path: "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run",
    is_hkcu: true,
    enabled: true,
    impact: "High",
    delay: 2.4,
  },
  {
    name: "Spotify",
    publisher: "Spotify AB",
    command: "C:\\Users\\User\\AppData\\Roaming\\Spotify\\Spotify.exe --minimized",
    registry_path: "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run",
    is_hkcu: true,
    enabled: true,
    impact: "Medium",
    delay: 1.2,
  },
  {
    name: "Steam Web Helper",
    publisher: "Valve Corporation",
    command: "C:\\Program Files (x86)\\Steam\\steam.exe -silent",
    registry_path: "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run",
    is_hkcu: true,
    enabled: false,
    impact: "High",
    delay: 3.1,
  },
  {
    name: "OneDrive",
    publisher: "Microsoft Corporation",
    command: "C:\\Program Files\\Microsoft OneDrive\\OneDrive.exe /background",
    registry_path: "HKLM\\Software\\Microsoft\\Windows\\CurrentVersion\\Run",
    is_hkcu: false,
    enabled: true,
    impact: "High",
    delay: 2.8,
  },
  {
    name: "Realtek HD Audio",
    publisher: "Realtek Semiconductor",
    command: "C:\\Windows\\System32\\RAVCpl64.exe -s",
    registry_path: "HKLM\\Software\\Microsoft\\Windows\\CurrentVersion\\Run",
    is_hkcu: false,
    enabled: true,
    impact: "Low",
    delay: 0.4,
  },
];

let mockDiagnosticsReports: { filename: string; date: string; content: string }[] = [
  {
    filename: "report_2026-07-20_health.txt",
    date: "2026-07-20 14:32:10",
    content: `=== CPulse System Diagnostics Report ===
Date: 2026-07-20 14:32:10
OS: Windows 11 Pro 23H2 (22631.3880)
CPU: Intel(R) Core(TM) i7-13700K (16 cores)
RAM: 16.0 GB (Used: 9.2 GB / 57.5%)
Disks:
 - C: NVMe SSD 512GB (Used: 218.4 GB / 42.6%)
 - D: SATA SSD 1TB (Used: 412.0 GB / 40.2%)

Health Assessment: OPTIMAL
 - No critical thermal throttling detected.
 - Pagefile size is appropriately managed.
 - Disk health SMART status: Good (100%).
`,
  },
];

export async function invoke<T = any>(cmd: string, args: any = {}): Promise<T> {
  // Simulate network latency for command execution
  await new Promise((r) => setTimeout(r, 60));

  switch (cmd) {
    case "is_admin":
      return true as unknown as T;

    case "scan_junk": {
      for (let p = 10; p <= 100; p += 20) {
        emit("scan_progress", p);
        await new Promise((r) => setTimeout(r, 80));
      }
      return [...mockJunkList] as unknown as T;
    }

    case "clean_junk": {
      const selectedCats: string[] = args.categories || [];
      let totalBytesFreed = 0;
      let totalFilesCleaned = 0;

      for (let p = 10; p <= 100; p += 25) {
        emit("clean_progress", p);
        await new Promise((r) => setTimeout(r, 90));
      }

      mockJunkList = mockJunkList.map((item) => {
        if (selectedCats.includes(item.name)) {
          totalBytesFreed += item.bytes;
          totalFilesCleaned += item.count;
          return { ...item, bytes: 0, count: 0, size: "0 B" };
        }
        return item;
      });

      return {
        bytes_freed: totalBytesFreed || 1420000000,
        files_cleaned: totalFilesCleaned || 2400,
      } as unknown as T;
    }

    case "cancel_scan":
      return true as unknown as T;

    case "clean_ram":
      return 1478492160 as unknown as T; // 1.4 GB freed

    case "apply_boost":
      return `Successfully applied boost: ${args.id || "Optimized"}` as unknown as T;

    case "restore_boost":
      return `Restored default setting for: ${args.id || "Setting"}` as unknown as T;

    case "set_power_plan":
      return true as unknown as T;

    case "get_startup_items":
      return [...mockStartupItems] as unknown as T;

    case "toggle_startup_item": {
      const { name, enable } = args;
      mockStartupItems = mockStartupItems.map((item) =>
        item.name === name ? { ...item, enabled: !!enable } : item
      );
      return true as unknown as T;
    }

    case "add_startup_item": {
      const { name, path, isHkcu } = args;
      mockStartupItems.push({
        name,
        command: path,
        publisher: "Custom App",
        registry_path: isHkcu
          ? "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run"
          : "HKLM\\Software\\Microsoft\\Windows\\CurrentVersion\\Run",
        is_hkcu: !!isHkcu,
        enabled: true,
        impact: "Medium",
        delay: 1.0,
      });
      return true as unknown as T;
    }

    case "delete_startup_item": {
      const { name } = args;
      mockStartupItems = mockStartupItems.filter((i) => i.name !== name);
      return true as unknown as T;
    }

    case "scan_privacy":
      return {
        chrome_hist: { found: true, count: 1842, desc: "1,842 URLs found" },
        edge_hist: { found: true, count: 673, desc: "673 URLs found" },
        recent_files: { found: true, count: 128, desc: "128 entries" },
        clipboard: { found: true, count: 47, desc: "47 copied items" },
        search_hist: { found: true, count: 312, desc: "312 queries" },
        wifi_pass: { found: true, count: 9, desc: "9 networks stored" },
        cookies: { found: true, count: 4291, desc: "4,291 cookies" },
        run_hist: { found: false, count: 0, desc: "No run command entries" },
      } as unknown as T;

    case "sweep_privacy":
      return true as unknown as T;

    case "get_system_info":
      return {
        os_name: "Windows 11 Pro",
        os_version: "23H2 (22631.3880)",
        kernel: "10.0.22631",
        host_name: "DESKTOP-CPULSE",
      } as unknown as T;

    case "get_diagnostics_reports":
      return mockDiagnosticsReports.map((r) => r.filename) as unknown as T;

    case "generate_diagnostics_report": {
      const newFile = `report_${new Date().toISOString().slice(0, 10)}_${Math.floor(Math.random() * 1000)}.txt`;
      const reportObj = {
        filename: newFile,
        date: new Date().toLocaleString(),
        content: `=== CPulse System Diagnostics Report ===
Generated: ${new Date().toLocaleString()}
Status: Excellent
CPU: Intel(R) Core(TM) i7-13700K @ 3.40GHz
RAM: 16 GB DDR5
Storage: All volumes healthy (NVMe SSD C:, SATA SSD D:)
Processes: 186 active
`,
      };
      mockDiagnosticsReports.unshift(reportObj);
      return newFile as unknown as T;
    }

    case "read_diagnostics_report": {
      const match = mockDiagnosticsReports.find((r) => r.filename === args.filename);
      return (match?.content || "Report content not found.") as unknown as T;
    }

    case "export_diagnostics_report":
      return "Report exported successfully to Downloads folder." as unknown as T;

    default:
      return true as unknown as T;
  }
}

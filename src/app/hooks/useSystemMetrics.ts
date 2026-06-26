import { useState, useEffect } from "react";
import { listen } from "@tauri-apps/api/event";

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

const INITIAL_HISTORY = Array.from({ length: 20 }, (_, i) => ({ t: i, v: 0 }));

const isTauri =
  typeof window !== "undefined" &&
  ((window as any).__TAURI_INTERNALS__ !== undefined ||
    (window as any).__TAURI_IPC__ !== undefined ||
    (window as any).process?.env?.NODE_ENV === "test");

export function useSystemMetrics() {
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [cpuData, setCpuData] = useState<{ t: number; v: number }[]>(INITIAL_HISTORY);
  const [ramData, setRamData] = useState<{ t: number; v: number }[]>(INITIAL_HISTORY);

  useEffect(() => {
    let tick = 20;
    let unlistenFn: (() => void) | null = null;

    const setupListener = async () => {
      if (!isTauri) return;
      unlistenFn = await listen<SystemMetrics>("system-metrics", (event) => {
        const data = event.payload;
        setMetrics(data);

        setCpuData((prev) => {
          const next = [...prev.slice(1), { t: tick, v: Math.round(data.cpu_usage) }];
          return next;
        });

        setRamData((prev) => {
          const next = [...prev.slice(1), { t: tick, v: Math.round(data.ram_usage) }];
          return next;
        });

        tick++;
      });
    };

    setupListener().catch(console.error);

    return () => {
      if (unlistenFn) {
        unlistenFn();
      }
    };
  }, []);

  return { metrics, cpuData, ramData };
}

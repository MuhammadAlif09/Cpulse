import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";

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
  ram_usage: number;
  total_ram: number;
  used_ram: number;
  disks: DiskInfo[];
  network_up: number;
  network_down: number;
}

const INITIAL_HISTORY = Array.from({ length: 20 }, (_, i) => ({ t: i, v: 0 }));

export function useSystemMetrics() {
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [cpuData, setCpuData] = useState<{ t: number; v: number }[]>(INITIAL_HISTORY);
  const [ramData, setRamData] = useState<{ t: number; v: number }[]>(INITIAL_HISTORY);

  useEffect(() => {
    let tick = 20;
    const interval = setInterval(async () => {
      try {
        const data: SystemMetrics = await invoke("get_system_metrics");
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
      } catch (err) {
        console.error("Metrics error:", err);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return { metrics, cpuData, ramData };
}

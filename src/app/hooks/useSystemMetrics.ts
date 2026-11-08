import { useState, useEffect } from "react";
import { listen } from "@tauri-apps/api/event";
import { SystemMetrics, DiskInfo } from "../../types";
import { isTauri } from "../utils/tauri";

export type { SystemMetrics, DiskInfo };

const INITIAL_HISTORY = Array.from({ length: 20 }, (_, i) => ({ t: i, v: 0 }));

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

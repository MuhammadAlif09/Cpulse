// Event dispatcher mock for Tauri
type ListenerCallback<T = any> = (event: { event: string; payload: T }) => void;

const listeners = new Map<string, Set<ListenerCallback>>();

export async function listen<T = any>(
  event: string,
  handler: ListenerCallback<T>
): Promise<() => void> {
  if (!listeners.has(event)) {
    listeners.set(event, new Set());
  }
  const set = listeners.get(event)!;
  set.add(handler);

  return () => {
    set.delete(handler);
  };
}

export function emit(event: string, payload: any): void {
  const set = listeners.get(event);
  if (set) {
    set.forEach((cb) => {
      try {
        cb({ event, payload });
      } catch (e) {
        console.error("Error in event listener:", e);
      }
    });
  }
}

// Background metrics emitter simulating live PC telemetry
let timeTick = 0;
setInterval(() => {
  timeTick++;
  const cpuBase = 22 + Math.sin(timeTick * 0.3) * 12;
  const ramBase = 54 + Math.cos(timeTick * 0.2) * 6;
  const tempBase = 46 + Math.sin(timeTick * 0.1) * 4;

  const mockMetrics = {
    cpu_usage: Math.max(5, Math.min(99, cpuBase + (Math.random() * 6 - 3))),
    cpu_temp: tempBase,
    cpu_name: "Intel(R) Core(TM) i7-13700K",
    cpu_cores: Array.from({ length: 16 }, (_, i) =>
      Math.max(2, Math.min(98, Math.round(cpuBase + Math.sin(timeTick + i) * 15 + Math.random() * 8)))
    ),
    ram_usage: Math.max(20, Math.min(95, ramBase)),
    total_ram: 16.0,
    used_ram: parseFloat(((ramBase / 100) * 16.0).toFixed(1)),
    disks: [
      {
        name: "Local Disk (C:)",
        used: 218.4,
        total: 512.0,
        disk_type: "NVMe SSD",
        model: "Samsung SSD 980 PRO 500GB",
      },
      {
        name: "Data (D:)",
        used: 412.0,
        total: 1024.0,
        disk_type: "SATA SSD",
        model: "Crucial MX500 1TB",
      },
    ],
    network_up: parseFloat((Math.random() * 1.8).toFixed(1)),
    network_down: parseFloat((3.2 + Math.random() * 8.5).toFixed(1)),
    disk_read_speed: parseFloat((12.5 + Math.random() * 25.0).toFixed(1)),
    disk_write_speed: parseFloat((4.2 + Math.random() * 18.0).toFixed(1)),
    uptime: 284920 + timeTick,
    process_count: 186 + Math.floor(Math.random() * 5),
  };

  emit("system-metrics", mockMetrics);
}, 1500);

import React, { useEffect, useState, useRef } from "react";

const CATEGORY_LOGS = [
  // 0% - 10%: Temp Files
  [
    "Scanning C:\\Windows\\Temp...",
    "Analyzing temporary directory files...",
    "Checking local app temporary storage...",
  ],
  // 10% - 20%: Browser Cache
  [
    "Checking browser cache (Chrome)...",
    "Checking browser cache (Edge)...",
    "Checking browser cache (Brave)...",
    "Analyzing browser storage files...",
  ],
  // 20% - 30%: Update Cache
  ["Checking Windows Update residuals...", "Analyzing SoftwareDistribution directory..."],
  // 30% - 40%: Crash Dumps & Logs
  ["Analyzing crash dump files...", "Checking Minidumps directory..."],
  // 40% - 50%: Recycle Bin
  ["Querying Recycle Bin items...", "Checking all drive trash paths..."],
  // 50% - 60%: Prefetch
  ["Scanning Windows Prefetch data...", "Analyzing application launch metadata..."],
  // 60% - 70%: Thumbnail Cache
  ["Checking Explorer thumbnail database...", "Analyzing thumbcache index files..."],
  // 70% - 80%: Windows Log Files
  ["Scanning system log files...", "Checking CBS and DISM logs..."],
  // 80% - 90%: System Caches (Font, Shader, WER)
  [
    "Checking DirectX shader caches...",
    "Scanning Windows Error Reporting files...",
    "Querying local font caches...",
  ],
  // 90% - 100%: App Cache
  [
    "Scanning Discord and Teams app data...",
    "Checking Steam html caches...",
    "Checking Riot Client logs...",
    "Finalizing junk scan results...",
  ],
];

interface Props {
  scanning: boolean;
  progress: number;
}

export function ScanAnimation({ scanning, progress }: Props) {
  const [logs, setLogs] = useState<{ text: string; id: number }[]>([]);
  const counterRef = useRef(0);
  const lastProgressRef = useRef(-1);

  useEffect(() => {
    if (!scanning) {
      setLogs([]);
      counterRef.current = 0;
      lastProgressRef.current = -1;
      return;
    }

    // Determine category log index based on current progress scaled to logs array size
    const catIdx = Math.min(
      Math.floor((progress / 100) * CATEGORY_LOGS.length),
      CATEGORY_LOGS.length - 1
    );

    const currentLogs = CATEGORY_LOGS[catIdx];

    // If progress has advanced, immediately add the first log from this category
    if (progress !== lastProgressRef.current) {
      lastProgressRef.current = progress;
      const firstLog = currentLogs[0];
      counterRef.current += 1;
      setLogs((prev) => {
        if (prev.length > 0 && prev[prev.length - 1].text === firstLog) return prev;
        return [...prev.slice(-6), { text: firstLog, id: counterRef.current }];
      });
    }

    // Interval to simulate other logs inside the same category
    let subIdx = 1;
    const interval = setInterval(() => {
      if (subIdx < currentLogs.length) {
        counterRef.current += 1;
        const logText = currentLogs[subIdx];
        setLogs((prev) => {
          if (prev.length > 0 && prev[prev.length - 1].text === logText) return prev;
          return [...prev.slice(-6), { text: logText, id: counterRef.current }];
        });
        subIdx++;
      }
    }, 400);

    return () => clearInterval(interval);
  }, [scanning, progress]);

  if (!scanning && logs.length === 0)
    return (
      <div className="h-32 flex items-center justify-center">
        <p className="text-sm text-slate-400">Ready to scan your system</p>
      </div>
    );

  return (
    <div
      className="rounded-lg p-3 h-32 overflow-hidden font-mono text-xs space-y-0.5"
      style={{ background: "#f8fafc", border: "1px solid #e2e8f0" }}
    >
      {logs.map((log, i) => (
        <div
          key={log.id}
          className="flex items-center gap-2"
          style={{ opacity: 0.3 + (i / logs.length) * 0.7 }}
        >
          <span className="text-indigo-500">&gt;</span>
          <span className="text-slate-600">{log.text}</span>
        </div>
      ))}
      {scanning && (
        <div className="flex items-center gap-2">
          <span className="text-indigo-500">&gt;</span>
          <span className="text-indigo-600 animate-pulse">
            Processing... {Math.round(progress)}%
          </span>
        </div>
      )}
    </div>
  );
}

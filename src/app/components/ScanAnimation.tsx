import React, { useEffect, useState, useRef } from "react";

const CATEGORY_LOGS = [
  // 0% - 25%: Temp Files
  [
    "Scanning C:\\Windows\\Temp...",
    "Analyzing temp directory files...",
    "Cleaning temporary index...",
  ],
  // 25% - 50%: Browser Cache
  [
    "Checking browser cache (Chrome)...",
    "Checking browser cache (Edge)...",
    "Analyzing local storage items...",
  ],
  // 50% - 75%: Update Cache
  [
    "Checking Windows Update residuals...",
    "Analyzing SoftwareDistribution directory...",
    "Scanning update package registry...",
  ],
  // 75% - 100%: Crash Dumps & Logs
  [
    "Analyzing crash dump files...",
    "Checking system log files...",
    "Analyzing memory dump files...",
    "Finalizing scan results...",
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

    // Tentukan kategori log berdasarkan progress saat ini
    let catIdx = 0;
    if (progress > 75) catIdx = 3;
    else if (progress > 50) catIdx = 2;
    else if (progress > 25) catIdx = 1;

    const currentLogs = CATEGORY_LOGS[catIdx];

    // Jika progress baru saja naik, langsung tambahkan log pertama dari kategori baru
    if (progress !== lastProgressRef.current) {
      lastProgressRef.current = progress;
      const firstLog = currentLogs[0];
      counterRef.current += 1;
      setLogs((prev) => {
        // Jangan duplikasi log terakhir
        if (prev.length > 0 && prev[prev.length - 1].text === firstLog) return prev;
        return [...prev.slice(-6), { text: firstLog, id: counterRef.current }];
      });
    }

    // Interval untuk mensimulasikan log lain di dalam kategori yang sama agar UI tetap dinamis
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
          <span className="text-indigo-500">�</span>
          <span className="text-slate-600">{log.text}</span>
        </div>
      ))}
      {scanning && (
        <div className="flex items-center gap-2">
          <span className="text-indigo-500">�</span>
          <span className="text-indigo-600 animate-pulse">
            Processing... {Math.round(progress)}%
          </span>
        </div>
      )}
    </div>
  );
}

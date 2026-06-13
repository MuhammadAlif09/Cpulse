import React, { useEffect, useState } from "react";

const LOG_LINES = [
  "Scanning C:\\Windows\\Temp...",
  "Analyzing prefetch files...",
  "Checking browser cache (Chrome)...",
  "Checking browser cache (Edge)...",
  "Scanning registry orphan keys...",
  "Analyzing startup program entries...",
  "Checking system log files...",
  "Scanning thumbnail cache...",
  "Analyzing crash dump files...",
  "Checking Windows Update residuals...",
  "Scanning recycle bin contents...",
  "Analyzing memory dump files...",
  "Checking DirectX shader cache...",
  "Scanning download history traces...",
  "Analyzing Windows error reports...",
  "Checking font cache files...",
  "Scanning old restore points...",
  "Analyzing driver package cache...",
  "Finalizing scan results...",
];

interface Props { scanning: boolean; progress: number; }

export function ScanAnimation({ scanning, progress }: Props) {
  const [logs, setLogs] = useState<{ text: string; id: number }[]>([]);
  const counterRef = React.useRef(0);
  const indexRef = React.useRef(0);

  useEffect(() => {
    if (!scanning) { setLogs([]); indexRef.current = 0; return; }
    const interval = setInterval(() => {
      const idx = indexRef.current % LOG_LINES.length;
      counterRef.current += 1;
      setLogs((prev) => [...prev.slice(-7), { text: LOG_LINES[idx], id: counterRef.current }]);
      indexRef.current += 1;
    }, 380);
    return () => clearInterval(interval);
  }, [scanning]);

  if (!scanning && logs.length === 0) return (
    <div className="h-32 flex items-center justify-center">
      <p className="text-sm text-slate-400">Ready to scan your system</p>
    </div>
  );

  return (
    <div className="rounded-lg p-3 h-32 overflow-hidden font-mono text-xs space-y-0.5"
      style={{ background: "#f8fafc", border: "1px solid #e2e8f0" }}>
      {logs.map((log, i) => (
        <div key={log.id} className="flex items-center gap-2"
          style={{ opacity: 0.3 + (i / logs.length) * 0.7 }}>
          <span className="text-indigo-500">›</span>
          <span className="text-slate-600">{log.text}</span>
        </div>
      ))}
      {scanning && (
        <div className="flex items-center gap-2">
          <span className="text-indigo-500">›</span>
          <span className="text-indigo-600 animate-pulse">Processing... {Math.round(progress)}%</span>
        </div>
      )}
    </div>
  );
}

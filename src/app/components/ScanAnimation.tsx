import React, { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";

const CATEGORY_LOGS = [
  [
    "Scanning C:\\Windows\\Temp...",
    "Analyzing temporary directory files...",
    "Checking local app temporary storage...",
  ],
  [
    "Checking browser cache (Chrome)...",
    "Checking browser cache (Edge)...",
    "Checking browser cache (Brave)...",
    "Analyzing browser storage files...",
  ],
  ["Checking Windows Update residuals...", "Analyzing SoftwareDistribution directory..."],
  ["Analyzing crash dump files...", "Checking Minidumps directory..."],
  ["Querying Recycle Bin items...", "Checking all drive trash paths..."],
  ["Scanning Windows Prefetch data...", "Analyzing application launch metadata..."],
  ["Checking Explorer thumbnail database...", "Analyzing thumbcache index files..."],
  ["Scanning system log files...", "Checking CBS and DISM logs..."],
  [
    "Checking DirectX shader caches...",
    "Scanning Windows Error Reporting files...",
    "Querying local font caches...",
  ],
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

    const catIdx = Math.min(
      Math.floor((progress / 100) * CATEGORY_LOGS.length),
      CATEGORY_LOGS.length - 1
    );

    const currentLogs = CATEGORY_LOGS[catIdx];

    if (progress !== lastProgressRef.current) {
      lastProgressRef.current = progress;
      const firstLog = currentLogs[0];
      counterRef.current += 1;
      setLogs((prev) => {
        if (prev.length > 0 && prev[prev.length - 1].text === firstLog) return prev;
        return [...prev.slice(-5), { text: firstLog, id: counterRef.current }];
      });
    }

    let subIdx = 1;
    const interval = setInterval(() => {
      if (subIdx < currentLogs.length) {
        counterRef.current += 1;
        const logText = currentLogs[subIdx];
        setLogs((prev) => {
          if (prev.length > 0 && prev[prev.length - 1].text === logText) return prev;
          return [...prev.slice(-5), { text: logText, id: counterRef.current }];
        });
        subIdx++;
      }
    }, 400);

    return () => clearInterval(interval);
  }, [scanning, progress]);

  if (!scanning && logs.length === 0)
    return (
      <div className="h-32 flex items-center justify-center border border-dashed border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-900/10 transition-colors duration-300">
        <p className="text-sm text-slate-400 dark:text-slate-500 font-medium">Ready to scan your system</p>
      </div>
    );

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ 
        opacity: 1, 
        y: 0,
        boxShadow: scanning 
          ? "0 0 15px rgba(79, 70, 229, 0.12)" 
          : "0 0 0px rgba(0, 0, 0, 0)"
      }}
      transition={{ duration: 0.4 }}
      className="rounded-xl p-4 h-36 overflow-hidden font-mono text-xs space-y-1.5 transition-all duration-300 border bg-slate-950 border-slate-800 dark:bg-black/90"
    >
      <div className="space-y-1.5 h-[100px] overflow-hidden flex flex-col justify-end">
        <AnimatePresence initial={false}>
          {logs.map((log, i) => (
            <motion.div
              key={log.id}
              initial={{ opacity: 0, x: -6, y: 3 }}
              animate={{ opacity: 0.3 + (i / logs.length) * 0.7, x: 0, y: 0 }}
              exit={{ opacity: 0, y: -3 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className="flex items-center gap-2"
            >
              <span className="text-indigo-400 font-bold">&gt;</span>
              <span className="text-slate-300 select-all">{log.text}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      
      {scanning && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center gap-2 pt-1 border-t border-slate-800/60"
        >
          <span className="text-indigo-400 animate-pulse font-bold">&gt;</span>
          <span className="bg-gradient-to-r from-indigo-400 to-violet-400 bg-clip-text text-transparent font-semibold animate-pulse">
            Processing... {Math.round(progress)}%
          </span>
        </motion.div>
      )}
    </motion.div>
  );
}

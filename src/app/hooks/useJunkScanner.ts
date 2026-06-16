import { useState, useRef, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { addHistoryLog } from "../utils/history";

export interface JunkItem {
  name: string;
  size: string;
  bytes: number;
  count: number;
  color: string;
  icon: string;
}

export function useJunkScanner() {
  const [scanning, setScanning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  const [cleaned, setCleaned] = useState(false);
  const [junkCats, setJunkCats] = useState<JunkItem[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const unlistenScan = listen<number>("scan_progress", (event) => {
      setProgress(event.payload);
    });
    const unlistenClean = listen<number>("clean_progress", (event) => {
      setProgress(event.payload);
    });

    return () => {
      unlistenScan.then((fn) => fn());
      unlistenClean.then((fn) => fn());
    };
  }, []);

  const startScan = async () => {
    setDone(false);
    setCleaned(false);
    setProgress(0);
    setScanning(true);

    try {
      const results = await invoke<JunkItem[]>("scan_junk");
      setJunkCats(results);
      setSelected(Object.fromEntries(results.map((c) => [c.name, true])));
      setProgress(100);
      setDone(true);
    } catch (e) {
      console.error("Scan failed:", e);
    } finally {
      setScanning(false);
    }
  };

  const doClean = async () => {
    setCleaning(true);
    setProgress(0);
    const startTime = Date.now();

    try {
      const selectedCats = Object.keys(selected).filter((k) => selected[k]);
      await invoke("clean_junk", { categories: selectedCats });
      setCleaned(true);
      setProgress(100);

      const totalSelected = junkCats
        .filter((c) => selected[c.name])
        .reduce((s, c) => s + c.bytes, 0);
      const freedStr =
        totalSelected > 1073741824
          ? (totalSelected / 1073741824).toFixed(2) + " GB"
          : (totalSelected / 1048576).toFixed(1) + " MB";
      const totalFiles = junkCats.filter((c) => selected[c.name]).reduce((s, c) => s + c.count, 0);
      const duration = ((Date.now() - startTime) / 1000).toFixed(1) + "s";

      addHistoryLog({
        type: "Deep Clean",
        freed: freedStr,
        fixed: totalFiles,
        duration,
      });
    } catch (e) {
      console.error("Clean failed:", e);
    } finally {
      setCleaning(false);
    }
  };

  return {
    scanning,
    progress,
    done,
    cleaning,
    cleaned,
    junkCats,
    selected,
    setSelected,
    startScan,
    doClean,
  };
}

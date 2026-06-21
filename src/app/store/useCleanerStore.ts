import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import { listen, UnlistenFn } from "@tauri-apps/api/event";
import { addHistoryLog } from "../utils/history";

export interface JunkItem {
  name: string;
  size: string;
  bytes: number;
  count: number;
  color: string;
  icon: string;
  description: string;
  warning: string;
  requires_admin: boolean;
}

interface CleanerState {
  scanning: boolean;
  progress: number;
  done: boolean;
  cleaning: boolean;
  cleaned: boolean;
  junkCats: JunkItem[];
  selected: Record<string, boolean>;
  scanDuration: string;
  error: string | null;

  // Actions
  startScan: () => Promise<void>;
  cancelScan: () => Promise<void>;
  doClean: () => Promise<void>;
  setSelected: (selected: Record<string, boolean>) => void;
  toggleSelectedCategory: (name: string) => void;
  selectAllCategories: () => void;
  deselectAllCategories: () => void;
  resetCleanerState: () => void;
}

// Keep track of event listeners at the module level
let scanUnlisten: UnlistenFn | null = null;
let cleanUnlisten: UnlistenFn | null = null;

const setupListeners = async (setProgress: (progress: number) => void) => {
  // Clean up existing listeners if any
  if (scanUnlisten) scanUnlisten();
  if (cleanUnlisten) cleanUnlisten();

  scanUnlisten = await listen<number>("scan_progress", (event) => {
    setProgress(event.payload);
  });

  cleanUnlisten = await listen<number>("clean_progress", (event) => {
    setProgress(event.payload);
  });
};

export const useCleanerStore = create<CleanerState>((set, get) => ({
  scanning: false,
  progress: 0,
  done: false,
  cleaning: false,
  cleaned: false,
  junkCats: [],
  selected: {},
  scanDuration: "0.0s",
  error: null,

  setSelected: (selected) => set({ selected }),

  toggleSelectedCategory: (name) => {
    const currentSelected = get().selected;
    set({
      selected: {
        ...currentSelected,
        [name]: !currentSelected[name],
      },
    });
  },

  selectAllCategories: () => {
    const { junkCats } = get();
    const newSelected: Record<string, boolean> = {};
    junkCats.forEach((c) => {
      newSelected[c.name] = true;
    });
    set({ selected: newSelected });
  },

  deselectAllCategories: () => {
    const { junkCats } = get();
    const newSelected: Record<string, boolean> = {};
    junkCats.forEach((c) => {
      newSelected[c.name] = false;
    });
    set({ selected: newSelected });
  },

  resetCleanerState: () => {
    set({
      scanning: false,
      progress: 0,
      done: false,
      cleaning: false,
      cleaned: false,
      junkCats: [],
      selected: {},
      scanDuration: "0.0s",
      error: null,
    });
  },

  startScan: async () => {
    set({
      done: false,
      cleaned: false,
      progress: 0,
      scanning: true,
      error: null,
    });

    const startTime = Date.now();

    await setupListeners((progress) => set({ progress }));

    try {
      const results = await invoke<JunkItem[]>("scan_junk");
      const duration = ((Date.now() - startTime) / 1000).toFixed(1) + "s";

      const initialSelected: Record<string, boolean> = {};
      results.forEach((c) => {
        initialSelected[c.name] = true;
      });

      set({
        junkCats: results,
        selected: initialSelected,
        progress: 100,
        done: true,
        scanDuration: duration,
      });
    } catch (e: any) {
      console.error("Scan failed:", e);
      set({ error: typeof e === "string" ? e : String(e), done: false });
    } finally {
      set({ scanning: false });
    }
  },

  cancelScan: async () => {
    try {
      await invoke("cancel_scan");
      set({
        scanning: false,
        progress: 0,
        done: false,
      });
    } catch (e) {
      console.error("Cancel scan failed:", e);
    }
  },

  doClean: async () => {
    const { selected, junkCats } = get();
    const selectedCats = Object.keys(selected).filter((k) => selected[k]);

    if (selectedCats.length === 0) return;

    set({ cleaning: true, progress: 0, error: null });
    const startTime = Date.now();

    try {
      await invoke("clean_junk", { categories: selectedCats });
      const duration = ((Date.now() - startTime) / 1000).toFixed(1) + "s";

      // Calculate total bytes freed
      const totalSelected = junkCats
        .filter((c) => selected[c.name])
        .reduce((sum, c) => sum + c.bytes, 0);

      const freedStr =
        totalSelected > 1073741824
          ? (totalSelected / 1073741824).toFixed(2) + " GB"
          : (totalSelected / 1048576).toFixed(1) + " MB";

      const totalFiles = junkCats
        .filter((c) => selected[c.name])
        .reduce((sum, c) => sum + c.count, 0);

      set({
        cleaned: true,
        progress: 100,
      });

      addHistoryLog({
        type: "Deep Clean",
        freed: freedStr,
        fixed: totalFiles,
        duration,
      });
    } catch (e: any) {
      console.error("Clean failed:", e);
      set({ error: typeof e === "string" ? e : String(e) });
    } finally {
      set({ cleaning: false });
    }
  },
}));

import { create } from "zustand";

type Tab = "dashboard" | "cleaner" | "booster" | "startup" | "privacy" | "history" | "settings" | "diagnostics";

interface AppState {
  currentTab: Tab;
  setTab: (tab: Tab) => void;
  lang: string;
  setLang: (lang: string) => void;
}

export const useAppStore = create<AppState>((set) => ({
  currentTab: "dashboard",
  setTab: (tab) => set({ currentTab: tab }),
  lang: "en",
  setLang: (lang) => set({ lang }),
}));

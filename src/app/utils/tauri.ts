// Centralized Tauri detection utility

export const isTauri: boolean =
  typeof window !== "undefined" &&
  (Boolean((window as any).__TAURI_INTERNALS__) ||
    Boolean((window as any).__TAURI_IPC__) ||
    (typeof process !== "undefined" && Boolean(process.env && process.env.NODE_ENV === "test")) ||
    (typeof import.meta !== "undefined" && Boolean(import.meta.env && import.meta.env.MODE === "test")));

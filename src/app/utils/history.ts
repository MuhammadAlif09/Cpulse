import { load } from "@tauri-apps/plugin-store";

export interface SessionLog {
  date: string;
  freed: string;
  fixed: number;
  duration: string;
  type: string;
  details?: string;
}

export async function addHistoryLog(log: Omit<SessionLog, "date">) {
  try {
    const store = await load("history.json");
    const logs = (await store.get<SessionLog[]>("logs")) || [];

    const dateOptions: Intl.DateTimeFormatOptions = {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    };

    const newLog: SessionLog = {
      ...log,
      date: new Date().toLocaleString(undefined, dateOptions),
    };

    const updatedLogs = [newLog, ...logs];
    await store.set("logs", updatedLogs);
    await store.save();
    console.log("History log saved successfully:", newLog);
  } catch (error) {
    console.error("Failed to save history log:", error);
  }
}

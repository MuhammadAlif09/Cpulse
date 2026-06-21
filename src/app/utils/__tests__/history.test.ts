import { describe, it, expect, vi, beforeEach } from "vitest";
import { addHistoryLog } from "../history";
import { load } from "@tauri-apps/plugin-store";

vi.mock("@tauri-apps/plugin-store", () => {
  const mockStore = {
    get: vi.fn(),
    set: vi.fn(),
    save: vi.fn(),
  };
  return {
    load: vi.fn().mockResolvedValue(mockStore),
  };
});

describe("history utility", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should create a new log and append it when history is empty", async () => {
    const mockStore = await load("history.json");
    (mockStore.get as any).mockResolvedValue(null);

    await addHistoryLog({
      type: "RAM Boost",
      freed: "512 MB",
      fixed: 1,
      duration: "1.2s",
    });

    expect(load).toHaveBeenCalledWith("history.json");
    expect(mockStore.get).toHaveBeenCalledWith("logs");
    expect(mockStore.set).toHaveBeenCalledWith("logs", [
      expect.objectContaining({
        type: "RAM Boost",
        freed: "512 MB",
        fixed: 1,
        duration: "1.2s",
        date: expect.any(String),
      }),
    ]);
    expect(mockStore.save).toHaveBeenCalled();
  });

  it("should prepend new logs to the existing logs list", async () => {
    const mockStore = await load("history.json");
    const existingLogs = [
      {
        type: "Quick Clean",
        freed: "100 MB",
        fixed: 5,
        duration: "2.0s",
        date: "Jun 16, 2026, 05:00 PM",
      },
    ];
    (mockStore.get as any).mockResolvedValue(existingLogs);

    await addHistoryLog({
      type: "Privacy Sweep",
      freed: "0.0 GB",
      fixed: 42,
      duration: "0.5s",
    });

    expect(mockStore.set).toHaveBeenCalledWith("logs", [
      expect.objectContaining({
        type: "Privacy Sweep",
        freed: "0.0 GB",
        fixed: 42,
        duration: "0.5s",
        date: expect.any(String),
      }),
      existingLogs[0],
    ]);
    expect(mockStore.save).toHaveBeenCalled();
  });

  it("should save history log with details field", async () => {
    const mockStore = await load("history.json");
    (mockStore.get as any).mockResolvedValue([]);

    await addHistoryLog({
      type: "Booster Applied",
      freed: "N/A",
      fixed: 1,
      duration: "0.0s",
      details: "Applied CPU Priority Manager",
    });

    expect(mockStore.set).toHaveBeenCalledWith("logs", [
      expect.objectContaining({
        type: "Booster Applied",
        freed: "N/A",
        fixed: 1,
        duration: "0.0s",
        details: "Applied CPU Priority Manager",
      }),
    ]);
  });
});

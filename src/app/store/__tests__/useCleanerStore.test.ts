import { describe, it, expect, vi, beforeEach } from "vitest";
import { useCleanerStore } from "../useCleanerStore";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { addHistoryLog } from "../../utils/history";

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn(),
}));

vi.mock("@tauri-apps/api/event", () => ({
  listen: vi.fn(),
}));

vi.mock("../../utils/history", () => ({
  addHistoryLog: vi.fn(),
}));

const mockJunkCats = [
  {
    name: "System Temp",
    size: "15.5 MB",
    bytes: 16252928,
    count: 142,
    color: "amber",
    icon: "trash",
    description: "Temporary files",
    warning: "Safe to delete",
    requires_admin: false,
  },
  {
    name: "Recycle Bin",
    size: "1.2 GB",
    bytes: 1288490188,
    count: 24,
    color: "red",
    icon: "trash",
    description: "Deleted files",
    warning: "Irreversible",
    requires_admin: false,
  }
];

describe("useCleanerStore", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useCleanerStore.getState().resetCleanerState();
    
    // Mock Date.now to simulate passage of time
    let time = 1000;
    vi.spyOn(Date, "now").mockImplementation(() => {
      time += 1500;
      return time;
    });
  });

  it("should have correct initial state", () => {
    const state = useCleanerStore.getState();
    expect(state.scanning).toBe(false);
    expect(state.progress).toBe(0);
    expect(state.done).toBe(false);
    expect(state.cleaning).toBe(false);
    expect(state.cleaned).toBe(false);
    expect(state.junkCats).toEqual([]);
    expect(state.selected).toEqual({});
    expect(state.scanDuration).toBe("0.0s");
    expect(state.error).toBeNull();
    expect(state.cleanedBytes).toBe(0);
    expect(state.cleanedFiles).toBe(0);
  });

  it("should update selected categories", () => {
    useCleanerStore.getState().setSelected({ "System Temp": true, "Recycle Bin": false });
    expect(useCleanerStore.getState().selected).toEqual({ "System Temp": true, "Recycle Bin": false });
  });

  it("should toggle a selected category", () => {
    useCleanerStore.setState({ selected: { "System Temp": true, "Recycle Bin": false } });
    useCleanerStore.getState().toggleSelectedCategory("System Temp");
    expect(useCleanerStore.getState().selected["System Temp"]).toBe(false);
    useCleanerStore.getState().toggleSelectedCategory("Recycle Bin");
    expect(useCleanerStore.getState().selected["Recycle Bin"]).toBe(true);
  });

  it("should select all categories", () => {
    useCleanerStore.setState({ junkCats: mockJunkCats });
    useCleanerStore.getState().selectAllCategories();
    expect(useCleanerStore.getState().selected).toEqual({
      "System Temp": true,
      "Recycle Bin": true,
    });
  });

  it("should deselect all categories", () => {
    useCleanerStore.setState({ junkCats: mockJunkCats, selected: { "System Temp": true } });
    useCleanerStore.getState().deselectAllCategories();
    expect(useCleanerStore.getState().selected).toEqual({
      "System Temp": false,
      "Recycle Bin": false,
    });
  });

  it("should run startScan successfully", async () => {
    vi.mocked(listen).mockResolvedValue(() => {});
    vi.mocked(invoke).mockResolvedValue(mockJunkCats);

    const promise = useCleanerStore.getState().startScan();
    
    // Check initial status during scan
    expect(useCleanerStore.getState().scanning).toBe(true);
    expect(useCleanerStore.getState().error).toBeNull();

    await promise;

    const state = useCleanerStore.getState();
    expect(state.scanning).toBe(false);
    expect(state.done).toBe(true);
    expect(state.progress).toBe(100);
    expect(state.junkCats).toEqual(mockJunkCats);
    expect(state.selected).toEqual({
      "System Temp": true,
      "Recycle Bin": true,
    });
    expect(state.scanDuration).not.toBe("0.0s");
    expect(invoke).toHaveBeenCalledWith("scan_junk");
  });

  it("should handle error in startScan", async () => {
    vi.mocked(listen).mockResolvedValue(() => {});
    vi.mocked(invoke).mockRejectedValue("Backend error");

    await useCleanerStore.getState().startScan();

    const state = useCleanerStore.getState();
    expect(state.scanning).toBe(false);
    expect(state.done).toBe(false);
    expect(state.error).toBe("Backend error");
  });

  it("should run cancelScan successfully", async () => {
    vi.mocked(invoke).mockResolvedValue(null);
    useCleanerStore.setState({ scanning: true, progress: 50, done: false });

    await useCleanerStore.getState().cancelScan();

    const state = useCleanerStore.getState();
    expect(state.scanning).toBe(false);
    expect(state.progress).toBe(0);
    expect(state.done).toBe(false);
    expect(invoke).toHaveBeenCalledWith("cancel_scan");
  });

  it("should run doClean successfully", async () => {
    vi.mocked(invoke).mockResolvedValue({ bytes_freed: 16252928, files_cleaned: 142 });
    useCleanerStore.setState({
      junkCats: mockJunkCats,
      selected: { "System Temp": true, "Recycle Bin": false }
    });

    await useCleanerStore.getState().doClean();

    const state = useCleanerStore.getState();
    expect(state.cleaning).toBe(false);
    expect(state.cleaned).toBe(true);
    expect(state.progress).toBe(100);
    expect(state.cleanedBytes).toBe(16252928);
    expect(state.cleanedFiles).toBe(142);
    
    // System Temp (which was selected) should be reset to 0
    expect(state.junkCats[0].bytes).toBe(0);
    expect(state.junkCats[0].count).toBe(0);
    expect(state.junkCats[0].size).toBe("0 B");

    // Recycle Bin (unselected) should remain unchanged
    expect(state.junkCats[1].bytes).toBe(1288490188);

    expect(invoke).toHaveBeenCalledWith("clean_junk", { categories: ["System Temp"] });
    expect(addHistoryLog).toHaveBeenCalledWith(expect.objectContaining({
      type: "Deep Clean",
      freed: "15.5 MB",
      fixed: 142,
    }));
  });

  it("should handle error in doClean", async () => {
    vi.mocked(invoke).mockRejectedValue("Cleaning error");
    useCleanerStore.setState({
      junkCats: mockJunkCats,
      selected: { "System Temp": true }
    });

    await useCleanerStore.getState().doClean();

    const state = useCleanerStore.getState();
    expect(state.cleaning).toBe(false);
    expect(state.error).toBe("Cleaning error");
  });

  it("should not run doClean if no categories selected", async () => {
    useCleanerStore.setState({
      junkCats: mockJunkCats,
      selected: { "System Temp": false, "Recycle Bin": false }
    });

    await useCleanerStore.getState().doClean();

    expect(invoke).not.toHaveBeenCalledWith("clean_junk", expect.any(Object));
  });
});

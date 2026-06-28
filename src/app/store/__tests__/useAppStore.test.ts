import { describe, it, expect, beforeEach } from "vitest";
import { useAppStore } from "../useAppStore";

describe("useAppStore", () => {
  beforeEach(() => {
    // Reset state before each test
    useAppStore.setState({
      currentTab: "dashboard",
      lang: "en",
    });
  });

  it("should have initial state", () => {
    const state = useAppStore.getState();
    expect(state.currentTab).toBe("dashboard");
    expect(state.lang).toBe("en");
  });

  it("should set current tab", () => {
    useAppStore.getState().setTab("cleaner");
    expect(useAppStore.getState().currentTab).toBe("cleaner");
  });

  it("should set language", () => {
    useAppStore.getState().setLang("id");
    expect(useAppStore.getState().lang).toBe("id");
  });
});

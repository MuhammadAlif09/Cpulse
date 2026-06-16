import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../App";
import { invoke } from "@tauri-apps/api/core";

vi.mock("@tauri-apps/api/core");
vi.mock("@tauri-apps/api/event", () => ({
  listen: vi.fn().mockResolvedValue(() => {}),
}));

describe("App Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (invoke as any).mockImplementation((cmd: string) => {
      if (cmd === "scan_junk") return Promise.resolve([]);
      if (cmd === "get_startup_items") return Promise.resolve([]);
      if (cmd === "is_admin") return Promise.resolve(false);
      return Promise.resolve(null);
    });
  });

  it("renders the app with dashboard tab by default", async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText(/System Health Score/i)).toBeInTheDocument();
    });
  });

  it("displays app name and version", async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getByText("Cpulse")).toBeInTheDocument();
      expect(screen.getByText(/v0\.10\.0/i)).toBeInTheDocument();
    });
  });

  it("shows navigation tabs", async () => {
    render(<App />);

    await waitFor(() => {
      expect(screen.getAllByText("Dashboard").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Cleaner").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Booster").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Settings").length).toBeGreaterThan(0);
    });
  });

  it("switches tabs when clicked", async () => {
    const user = userEvent.setup();
    render(<App />);

    const cleanerTabs = await screen.findAllByText("Cleaner");
    await user.click(cleanerTabs[0]);

    await waitFor(() => {
      expect(screen.getByText(/Junk File Scanner/i)).toBeInTheDocument();
    });
  });

  it("displays admin mode when admin status is true", async () => {
    (invoke as any).mockImplementation((cmd: string) => {
      if (cmd === "scan_junk") return Promise.resolve([]);
      if (cmd === "get_startup_items") return Promise.resolve([]);
      if (cmd === "is_admin") return Promise.resolve(true);
      return Promise.resolve(null);
    });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText(/Administrator Mode/i)).toBeInTheDocument();
    });
  });

  it("displays standard mode when admin status is false", async () => {
    (invoke as any).mockImplementation((cmd: string) => {
      if (cmd === "scan_junk") return Promise.resolve([]);
      if (cmd === "get_startup_items") return Promise.resolve([]);
      if (cmd === "is_admin") return Promise.resolve(false);
      return Promise.resolve(null);
    });

    render(<App />);

    await waitFor(() => {
      expect(screen.getByText(/Standard Mode/i)).toBeInTheDocument();
    });
  });
});

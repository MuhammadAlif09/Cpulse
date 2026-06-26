import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Sidebar } from "../Sidebar";

vi.mock("@tauri-apps/api/core");
vi.mock("@tauri-apps/api/event");
vi.mock("@tauri-apps/api/app");
vi.mock("@tauri-apps/plugin-store");

describe("Sidebar", () => {
  const defaultProps = {
    nav: [
      { id: "dashboard", label: "Dashboard", icon: <span>D</span> },
      { id: "cleaner", label: "Cleaner", icon: <span>C</span> },
      { id: "booster", label: "Booster", icon: <span>B</span> },
    ],
    t: (lang: string, text: string) => text,
    privacyItems: [],
    tab: "dashboard",
    setTab: vi.fn(),
    lang: "en",
    score: 100,
    healthText: "Excellent",
    issues: [],
    junkItems: [],
    startupItems: [],
    privacySwept: false,
  };

  it("renders navigation options", () => {
    render(<Sidebar {...defaultProps} />);
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Cleaner")).toBeInTheDocument();
    expect(screen.getByText("Booster")).toBeInTheDocument();
  });

  it("renders Health Score widget", () => {
    render(<Sidebar {...defaultProps} />);
    expect(screen.getByText("Health Score")).toBeInTheDocument();
    expect(screen.getByText("100 / 100")).toBeInTheDocument();
  });
});

import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Header } from "../Header";

vi.mock("@tauri-apps/api/core");
vi.mock("@tauri-apps/api/event");
vi.mock("@tauri-apps/api/app");
vi.mock("@tauri-apps/plugin-store");

describe("Header", () => {
  const defaultProps = {
    appName: "CPulse",
    appVersion: "0.16.3",
    isAdmin: false,
    time: new Date(),
    unreadCount: 0,
    showNotif: false,
    setShowNotif: vi.fn(),
    notifications: [],
    setNotifications: vi.fn(),
    tab: "dashboard",
    setTab: vi.fn(),
    lang: "en",
    t: (lang: string, text: string) => text,
  };

  it("renders app name", () => {
    render(<Header {...defaultProps} />);
    expect(screen.getByText("CPulse")).toBeInTheDocument();
  });

  it("renders version badge", () => {
    render(<Header {...defaultProps} />);
    expect(screen.getByText(/v0\.16\.3/)).toBeInTheDocument();
  });

  it("displays Standard Mode by default", () => {
    render(<Header {...defaultProps} />);
    expect(screen.getByText(/Standard Mode/)).toBeInTheDocument();
  });

  it("displays Administrator Mode when isAdmin is true", () => {
    render(<Header {...defaultProps} isAdmin={true} />);
    expect(screen.getByText(/Administrator Mode/)).toBeInTheDocument();
  });

  it("shows buttons in the header", () => {
    render(<Header {...defaultProps} />);
    expect(screen.getAllByRole("button")).toHaveLength(2);
  });
});

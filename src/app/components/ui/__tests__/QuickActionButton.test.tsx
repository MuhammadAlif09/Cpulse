import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import { QuickActionButton } from "../QuickActionButton";
import { Zap } from "lucide-react";

describe("QuickActionButton", () => {
  const defaultProps = {
    id: "booster",
    icon: <Zap data-testid="zap-icon" />,
    label: "Boost Now",
    sub: "Optimize settings",
    color: "#eab308",
    onClick: vi.fn(),
  };

  it("renders correctly with labels and icon", () => {
    render(<QuickActionButton {...defaultProps} />);
    expect(screen.getByText("Boost Now")).toBeInTheDocument();
    expect(screen.getByText("Optimize settings")).toBeInTheDocument();
    expect(screen.getByTestId("zap-icon")).toBeInTheDocument();
  });

  it("calls onClick when clicked", () => {
    const onClick = vi.fn();
    render(<QuickActionButton {...defaultProps} onClick={onClick} />);
    fireEvent.click(screen.getByRole("button"));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("shows loading spinner when isLoading is true", () => {
    render(<QuickActionButton {...defaultProps} isLoading={true} />);
    expect(screen.getByTestId("loading-spinner")).toBeInTheDocument();
    expect(screen.queryByTestId("zap-icon")).not.toBeInTheDocument();
  });
});

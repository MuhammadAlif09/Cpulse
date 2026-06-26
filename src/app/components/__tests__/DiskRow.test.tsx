import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { DiskRow } from "../ui/DiskRow";

describe("DiskRow", () => {
  const mockT = (text: string) => text;

  it("renders disk information correctly", () => {
    const disk = {
      name: "C:",
      model: "Samsung SSD 970 EVO Plus",
      used: 250,
      total: 500,
      disk_type: "SSD",
    };

    render(<DiskRow disk={disk} t={mockT} />);

    expect(screen.getByText("C:")).toBeInTheDocument();
    expect(screen.getByText("SSD")).toBeInTheDocument();
    expect(screen.getByText("250.0 / 500.0 GB")).toBeInTheDocument();
  });

  it("shows correct percentage used", () => {
    const disk = {
      name: "D:",
      used: 400,
      total: 1000,
    };
    render(<DiskRow disk={disk} t={mockT} />);
    expect(screen.getByText(/40% used/)).toBeInTheDocument();
  });
});

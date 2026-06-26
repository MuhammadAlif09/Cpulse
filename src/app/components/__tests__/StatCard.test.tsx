import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { StatCard } from "../ui/StatCard";
import { Cpu } from "lucide-react";

describe("StatCard", () => {
  it("renders label, value, and subtext correctly", () => {
    render(
      <StatCard
        icon={<Cpu data-testid="cpu-icon" />}
        label="CPU Usage"
        value="45%"
        sub="Global CPU Load"
        color="#4f46e5"
      />
    );

    expect(screen.getByText("CPU Usage")).toBeInTheDocument();
    expect(screen.getByText("45%")).toBeInTheDocument();
    expect(screen.getByText("Global CPU Load")).toBeInTheDocument();
    expect(screen.getByTestId("cpu-icon")).toBeInTheDocument();
  });
});

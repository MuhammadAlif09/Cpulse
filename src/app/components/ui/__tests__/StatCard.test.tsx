import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import { StatCard } from "../StatCard";
import { Cpu } from "lucide-react";

describe("StatCard", () => {
  it("renders basic values", () => {
    render(
      <StatCard icon={<Cpu />} label="CPU Usage" value="45%" sub="Core load" color="#4f46e5" />
    );
    expect(screen.getByText("45%")).toBeInTheDocument();
    expect(screen.getByText("CPU Usage")).toBeInTheDocument();
    expect(screen.getByText("Core load")).toBeInTheDocument();
  });
});

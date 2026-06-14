import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { RadialGauge } from "../RadialGauge";

describe("RadialGauge Component", () => {
  it("renders with correct value", () => {
    const { container } = render(
      <RadialGauge value={75} label="CPU" color="#4f46e5" trackColor="#e2e8f0" size={100} />
    );

    expect(container.querySelector("svg")).toBeInTheDocument();
  });

  it("displays the label", () => {
    const { getByText } = render(
      <RadialGauge value={50} label="RAM" color="#7c3aed" trackColor="#e2e8f0" size={100} />
    );

    expect(getByText("RAM")).toBeInTheDocument();
  });

  it("displays the percentage value", () => {
    const { getByText } = render(
      <RadialGauge value={85} label="Disk" color="#10b981" trackColor="#e2e8f0" size={100} />
    );

    expect(getByText("85%")).toBeInTheDocument();
  });

  it("handles zero value", () => {
    const { getByText } = render(
      <RadialGauge value={0} label="Test" color="#000" trackColor="#ccc" size={80} />
    );

    expect(getByText("0%")).toBeInTheDocument();
  });

  it("handles maximum value", () => {
    const { getByText } = render(
      <RadialGauge value={100} label="Test" color="#000" trackColor="#ccc" size={80} />
    );

    expect(getByText("100%")).toBeInTheDocument();
  });
});

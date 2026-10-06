import { render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createLocalServices } from "./createLocalServices";
import { ServicesProvider, useExperienceServices } from "./ServicesProvider";

function GatewayMode() {
  const { participation } = useExperienceServices();
  return <p>Gateway: {participation.mode}</p>;
}

afterEach(() => vi.restoreAllMocks());

describe("ServicesProvider", () => {
  it("gives the services to the components below it", () => {
    const services = createLocalServices({ participation: "scripted" });
    let seen: unknown = null;
    function Probe() {
      seen = useExperienceServices();
      return null;
    }
    render(
      <ServicesProvider services={services}>
        <GatewayMode />
        <Probe />
      </ServicesProvider>,
    );
    expect(screen.getByText("Gateway: scripted")).toBeTruthy();
    expect(seen).toBe(services); // the very object injected
  });

  it("fails with an explicit message outside the provider", () => {
    vi.spyOn(console, "error").mockImplementation(() => {}); // React logs the thrown error
    expect(() => render(<GatewayMode />)).toThrow(
      /useExperienceServices\(\) must be used inside <ServicesProvider>/,
    );
  });
});

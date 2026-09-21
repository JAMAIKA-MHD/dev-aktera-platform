import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { z } from "zod";

// Guards the test tooling itself: if one of these fails, the setup is broken, not the app.
describe("test harness", () => {
  it("runs in a jsdom environment", () => {
    const element = document.createElement("div");
    expect(element.tagName).toBe("DIV");
  });

  it("renders React components", () => {
    render(<p>Harness ready</p>);
    expect(screen.getByText("Harness ready")).toBeTruthy();
  });

  it("validates data with zod", () => {
    const schema = z.object({ name: z.string().min(1) });
    expect(schema.safeParse({ name: "OCTOREACH" }).success).toBe(true);
    expect(schema.safeParse({ name: "" }).success).toBe(false);
  });
});

import { describe, expect, it } from "vitest";
import { changeBetween } from "./ScreenTransition";

describe("changeBetween", () => {
  it("never dresses the three moments of a game, nor a screen drawn again", () => {
    expect(changeBetween("play", "resolving", true)).toBeNull();
    expect(changeBetween("resolving", "revealing", true)).toBeNull();
    expect(changeBetween("register", "register", true)).toBeNull();
  });

  it("flashes into a win, settles into a loss, shakes into a status", () => {
    expect(changeBetween("revealing", "win", true)).toBe("impact");
    expect(changeBetween("revealing", "lose", true)).toBe("soft");
    expect(changeBetween("resolving", "error", true)).toBe("shake");
    expect(changeBetween("register", "duplicate", false)).toBe("shake");
  });

  it("zooms into the game, and wipes the rest only when the theme has a wipe", () => {
    expect(changeBetween("register", "play", true)).toBe("zoom");
    expect(changeBetween("welcome", "register", true)).toBe("wipe");
    expect(changeBetween("win", "welcome", true)).toBe("wipe");
    expect(changeBetween("welcome", "register", false)).toBeNull();
  });
});

describe("changeBetween · a pipe", () => {
  it("goes down the pipe from the welcome into the form only", () => {
    expect(changeBetween("welcome", "register", true, true)).toBe("pipe");
    expect(changeBetween("win", "welcome", true, true)).toBe("wipe");
    expect(changeBetween("register", "play", true, true)).toBe("zoom");
  });
});

describe("changeBetween · a curtain", () => {
  it("closes the curtains at every change of screen, never inside a game", () => {
    expect(changeBetween("register", "play", true, false, false, true)).toBe(
      "wipe",
    );
    expect(changeBetween("revealing", "win", true, false, false, true)).toBe(
      "wipe",
    );
    expect(
      changeBetween("play", "resolving", true, false, false, true),
    ).toBeNull();
  });
});

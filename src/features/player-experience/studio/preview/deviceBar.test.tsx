import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { createLocalServices } from "../../services/createLocalServices";
import { PreviewPane } from "../layout/PreviewPane";
import { PlayerExperienceStudio } from "../PlayerExperienceStudio";
import { createStudioStore, DEFAULT_VIEWPORT } from "../store";
import { StudioProvider } from "../StudioContext";
import {
  CUSTOM_DEVICES_KEY,
  loadCustomDevices,
  makeCustomDevice,
} from "./customDevices";
import { tierOf } from "./BreakpointRuler";
import { deviceSafeArea, findDevice } from "./devices";
import {
  loadViewportPrefs,
  saveViewportPrefs,
  VIEWPORT_PREFS_KEY,
} from "./viewportPrefs";

// The DevTools-like device bar (T6.9): devices, size, zoom, rotation, frame, tiers, handles,
// custom devices, and what survives a reload.

function renderPane() {
  const store = createStudioStore();
  render(
    <StudioProvider value={{ store, services: createLocalServices() }}>
      <PreviewPane />
    </StudioProvider>,
  );
  return store;
}

const viewport = (store: ReturnType<typeof createStudioStore>) =>
  store.getState().ui.viewport;

describe("viewport preferences and custom devices", () => {
  beforeEach(() => localStorage.clear());

  it("remember the last device, and fall back to defaults on anything broken", () => {
    const tablet = {
      ...DEFAULT_VIEWPORT,
      deviceId: "ipad-mini",
      width: 1024,
      height: 768,
      orientation: "landscape" as const,
      zoom: 0.75,
    };
    saveViewportPrefs(tablet);
    expect(loadViewportPrefs()).toEqual(tablet);
    localStorage.setItem(VIEWPORT_PREFS_KEY, "{broken");
    expect(loadViewportPrefs()).toEqual(DEFAULT_VIEWPORT);
    localStorage.setItem(
      VIEWPORT_PREFS_KEY,
      JSON.stringify({ width: 99999, height: 10, zoom: 3 }),
    );
    expect(loadViewportPrefs()).toMatchObject({
      width: 2560,
      height: 320,
      zoom: "fit",
      deviceId: null,
    });
    // Blocked storage: defaults, no exception.
    const blocked = () => {
      throw new Error("SecurityError");
    };
    expect(loadViewportPrefs(blocked)).toEqual(DEFAULT_VIEWPORT);
    expect(() => saveViewportPrefs(tablet, blocked)).not.toThrow();
  });

  it("keep custom devices valid, whatever was stored", () => {
    const mine = makeCustomDevice(
      { label: " My Samsung ", width: 384, height: 854, group: "phone" },
      "a1",
    );
    expect(mine).toMatchObject({
      id: "custom-a1",
      label: "My Samsung",
      width: 384,
      height: 854,
    });
    localStorage.setItem(
      CUSTOM_DEVICES_KEY,
      JSON.stringify([
        { ...mine, width: 99999 },
        { id: "iphone-12", label: "not custom", width: 1, height: 1 },
        "junk",
      ]),
    );
    const loaded = loadCustomDevices();
    expect(loaded).toHaveLength(1);
    expect(loaded[0].width).toBe(2560);
    expect(findDevice("custom-a1", loaded)?.label).toBe("My Samsung");
  });

  it("survive a reload: the Studio reopens on the last device and the custom list", () => {
    localStorage.setItem(
      CUSTOM_DEVICES_KEY,
      JSON.stringify([
        makeCustomDevice(
          { label: "My Samsung", width: 384, height: 854, group: "phone" },
          "a1",
        ),
      ]),
    );
    const first = render(
      <PlayerExperienceStudio services={createLocalServices()} />,
    );
    fireEvent.change(screen.getByLabelText("Device"), {
      target: { value: "custom-a1" },
    });
    first.unmount();
    render(<PlayerExperienceStudio services={createLocalServices()} />);
    expect((screen.getByLabelText("Device") as HTMLSelectElement).value).toBe(
      "custom-a1",
    );
    const iframe = document.querySelector("iframe")!;
    expect(iframe.getAttribute("width")).toBe("384");
  });
});

describe("DeviceToolbar", () => {
  beforeEach(() => localStorage.clear());

  it("picks a device, and turns it into Responsive when its size is edited", () => {
    const store = renderPane();
    fireEvent.change(screen.getByLabelText("Device"), {
      target: { value: "galaxy-a5x" },
    });
    const galaxy = findDevice("galaxy-a5x")!;
    expect(viewport(store)).toMatchObject({
      deviceId: "galaxy-a5x",
      width: galaxy.width,
      height: galaxy.height,
    });
    const width = screen.getByLabelText("Width");
    fireEvent.change(width, { target: { value: "5000" } });
    fireEvent.blur(width);
    expect(viewport(store)).toMatchObject({ deviceId: null, width: 2560 });
  });

  it("rotates a notched phone, moving its safe areas to the sides", () => {
    const store = renderPane();
    fireEvent.click(screen.getByRole("button", { name: "Rotate" }));
    expect(viewport(store)).toMatchObject({
      width: 844,
      height: 390,
      orientation: "landscape",
    });
    const safe = deviceSafeArea(findDevice("iphone-12"), "landscape");
    expect(safe.left).toBeGreaterThan(0);
    expect(safe.top).toBe(0);
  });

  it("changes the zoom and the frame without touching the size", () => {
    const store = renderPane();
    fireEvent.change(screen.getByLabelText("Zoom"), {
      target: { value: "0.5" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Device frame" }));
    expect(viewport(store)).toMatchObject({
      zoom: 0.5,
      chrome: false,
      width: 390,
      height: 844,
    });
    // The iframe keeps the device's CSS size at every zoom.
    expect(document.querySelector("iframe")!.getAttribute("width")).toBe("390");
  });

  it("jumps to a layout tier from the ruler", () => {
    const store = renderPane();
    fireEvent.click(screen.getByRole("button", { name: /Two panes/ }));
    expect(tierOf(viewport(store))).toBe("split");
    expect(viewport(store).deviceId).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /Compact/ }));
    expect(viewport(store).width).toBe(320);
    expect(
      screen
        .getByRole("button", { name: /Compact/ })
        .getAttribute("aria-pressed"),
    ).toBe("true");
  });

  it("resizes with the handles in Responsive mode, from the keyboard too", () => {
    const store = renderPane();
    expect(screen.queryByRole("button", { name: "Resize width" })).toBeNull();
    act(() => store.getState().setViewport({ deviceId: null }));
    const right = screen.getByRole("button", { name: "Resize width" });
    fireEvent.keyDown(right, { key: "ArrowRight" });
    expect(viewport(store).width).toBe(391);
    fireEvent.keyDown(right, { key: "ArrowLeft", shiftKey: true });
    expect(viewport(store).width).toBe(381);
    fireEvent.keyDown(screen.getByRole("button", { name: "Resize height" }), {
      key: "ArrowUp",
    });
    expect(viewport(store).height).toBe(843);

    // A drag: the iframe lets go of the pointer while the handle is held.
    const corner = screen.getByRole("button", { name: "Resize both" });
    fireEvent.pointerDown(corner, { clientX: 100, clientY: 100, pointerId: 1 });
    expect(document.querySelector("iframe")!.style.pointerEvents).toBe("none");
    fireEvent.pointerMove(corner, { clientX: 120, clientY: 90, pointerId: 1 });
    fireEvent.pointerUp(corner, { pointerId: 1 });
    expect(viewport(store)).toMatchObject({ width: 401, height: 833 });
    expect(document.querySelector("iframe")!.style.pointerEvents).toBe("");
  });

  it("keeps talking to the preview when a device change mounts a new iframe", () => {
    const store = renderPane();
    // Responsive (no shell), then a framed phone: the iframe may be a new element.
    fireEvent.change(screen.getByLabelText("Device"), {
      target: { value: "" },
    });
    fireEvent.change(screen.getByLabelText("Device"), {
      target: { value: "iphone-12" },
    });
    const after = document.querySelector("iframe")!;
    const frame = after.contentWindow!;
    const posted: string[] = [];
    frame.postMessage = ((message: { type: string }) => {
      posted.push(message.type);
    }) as typeof frame.postMessage;
    act(() =>
      window.dispatchEvent(
        new MessageEvent("message", {
          data: { type: "xp:ready" },
          origin: window.location.origin,
          source: frame,
        }),
      ),
    );
    expect(posted).toEqual(["xp:config", "xp:ui"]);
    expect(viewport(store).deviceId).toBe("iphone-12");
  });

  it("adds a custom device from its dialog", () => {
    renderPane();
    fireEvent.change(screen.getByLabelText("Device"), {
      target: { value: "__edit-custom__" },
    });
    const dialog = screen.getByRole("dialog", { name: "Custom devices" });
    expect(dialog).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Device name"), {
      target: { value: "Condor Allure" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add device" }));
    expect(screen.getByText("Condor Allure")).toBeTruthy();
    expect(
      screen.getByRole("option", { name: /Condor Allure · 384×854/ }),
    ).toBeTruthy();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(JSON.parse(localStorage.getItem(CUSTOM_DEVICES_KEY)!)).toHaveLength(
      1,
    );
  });
});

import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { LayoutIssue } from "../../runtime/layout/layoutAudit";
import { createLocalServices } from "../../services/createLocalServices";
import { PanelArea } from "../layout/PanelArea";
import { StudioTopBar } from "../layout/StudioTopBar";
import { createStudioStore } from "../store";
import { StudioProvider } from "../StudioContext";
import { checkSizes, sizesToCheck } from "./checkSizes";
import { DEVICES, findDevice } from "./devices";
import { describeLayoutIssue, describeLayoutIssues } from "./useLayoutReport";

// The layout audit in the Studio (T6.10): live warnings labelled by size, and the check of
// every size of the catalog.

const truncatedTitle: LayoutIssue = {
  kind: "text-truncated",
  selector: "h1",
  editPath: "screens.welcome.title",
  detail: "cut",
};

describe("describeLayoutIssue", () => {
  it("says what breaks, where, and at which size, in the brand's words", () => {
    expect(
      describeLayoutIssue(truncatedTitle, { width: 360, height: 640 }),
    ).toMatchObject({
      sizeLabel: "360×640",
      message: "The title is shortened (the end is cut)",
      path: "screens.welcome.title",
    });
    expect(
      describeLayoutIssue(
        {
          kind: "horizontal-overflow",
          selector: "html",
          editPath: null,
          detail: "",
        },
        { width: 280, height: 653 },
      ).message,
    ).toBe("The page scrolls sideways");
    expect(
      describeLayoutIssue(
        {
          kind: "slot-overlap",
          selector: "div",
          editPath: "sections.prizeChips",
          detail: "",
        },
        { width: 844, height: 390 },
      ).message,
    ).toBe("Another block covers the prize chips");
  });

  it("gives one warning per problem, not one per element", () => {
    const twice = [
      truncatedTitle,
      { ...truncatedTitle, selector: "h1 > span" },
    ];
    expect(
      describeLayoutIssues(twice, { width: 360, height: 640 }),
    ).toHaveLength(1);
  });
});

describe("checkSizes", () => {
  it("covers the catalog upright and sideways, laptops only as they are", () => {
    const sizes = sizesToCheck(DEVICES);
    const laptops = DEVICES.filter(
      (device) => device.group === "laptop",
    ).length;
    expect(sizes).toHaveLength(DEVICES.length * 2 - laptops);
    const turned = sizes.find((size) => size.key === "iphone-12:landscape")!;
    expect(turned.size).toEqual({ width: 844, height: 390 });
    expect(turned.safeArea.left).toBeGreaterThan(0);
  });

  it("measures every size in turn, with progress", async () => {
    const sizes = sizesToCheck([
      findDevice("galaxy-fold")!,
      findDevice("ipad-mini")!,
    ]);
    const progress: number[] = [];
    const { results, cancelled } = await checkSizes(
      sizes,
      async (size) => (size.size.width < 360 ? [truncatedTitle] : []),
      { onProgress: (done) => progress.push(done) },
    );
    expect(cancelled).toBe(false);
    expect(progress).toEqual([1, 2, 3, 4]);
    expect(
      results
        .filter((result) => result.issues.length > 0)
        .map((result) => result.key),
    ).toEqual(["galaxy-fold:portrait"]);
  });

  it("can be cancelled, and survives a size that cannot be measured", async () => {
    const controller = new AbortController();
    const sizes = sizesToCheck(DEVICES);
    const { results, cancelled } = await checkSizes(
      sizes,
      async (size) => {
        if (size.key === "android-compact:landscape") controller.abort();
        if (size.key === "android-compact:portrait") throw new Error("timeout");
        return [];
      },
      { signal: controller.signal },
    );
    expect(cancelled).toBe(true);
    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({ error: "timeout", issues: [] });
  });
});

describe("the layout warnings in the Studio", () => {
  function renderStudio() {
    const store = createStudioStore();
    render(
      <StudioProvider value={{ store, services: createLocalServices() }}>
        <StudioTopBar
          autosave={{
            status: "idle",
            lastSavedAt: null,
            error: null,
            retry: () => {},
          }}
        />
        <PanelArea />
      </StudioProvider>,
    );
    return store;
  }

  it("lists what breaks at the size on show, as warnings that never block", () => {
    const store = renderStudio();
    act(() => {
      store
        .getState()
        .setLayoutIssues([truncatedTitle], { width: 360, height: 640 });
      store.getState().setPanel("validation");
    });
    const group = screen.getByRole("region", { name: "At this size" });
    expect(group.textContent).toMatch(/At 360×640/);
    expect(group.textContent).toMatch(/The title is shortened/);
    // Counted in the top bar, as a warning: sharing stays open.
    expect(screen.getByRole("button", { name: /^1\s*issue$/ })).toBeTruthy();
    expect(screen.getByText("Ready to share.")).toBeTruthy();

    fireEvent.click(within(group).getByRole("button"));
    expect(store.getState().ui).toMatchObject({
      panel: "content",
      focusPath: "screens.welcome.title",
    });
  });

  it("says so when nothing breaks at the size on show", () => {
    const store = renderStudio();
    act(() => {
      store.getState().setLayoutIssues([], { width: 834, height: 1194 });
      store.getState().setPanel("validation");
    });
    expect(screen.queryByRole("region", { name: "At this size" })).toBeNull();
    expect(screen.getByText(/Nothing breaks at 834×1194/)).toBeTruthy();
    expect(
      screen.getByRole("button", { name: "Check all sizes" }),
    ).toBeTruthy();
  });
});

import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createDefaultExperience } from "../domain/defaults";
import type { ExperienceConfig } from "../domain/types";
import type { ExperienceRepository, SaveResult } from "../services/ports";
import { createStudioStore } from "./store";
import { AUTOSAVE_DEBOUNCE_MS, useAutosave } from "./useAutosave";

// A repository whose answers the test decides, and which remembers every save.
function fakeRepository(answer?: (config: ExperienceConfig) => SaveResult) {
  const saves: { config: ExperienceConfig; expected?: string }[] = [];
  let count = 0;
  const repository: ExperienceRepository = {
    load: async () => null,
    remove: async () => undefined,
    save: async (config, options) => {
      saves.push({ config, expected: options?.expectedUpdatedAt });
      count += 1;
      return (
        answer?.(config) ?? {
          ok: true,
          config: { ...config, updatedAt: `stored-${count}` },
        }
      );
    },
  };
  return { repository, saves };
}

const flush = async (ms = AUTOSAVE_DEBOUNCE_MS) => {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
};

describe("useAutosave", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  const setup = (answer?: (config: ExperienceConfig) => SaveResult) => {
    const store = createStudioStore({
      config: createDefaultExperience({ gameType: "lucky_wheel" }),
    });
    const fake = fakeRepository(answer);
    const hook = renderHook(() =>
      useAutosave({
        store,
        repository: fake.repository,
        guardUnload: false,
      }),
    );
    return { store, hook, ...fake };
  };

  it("writes once per lull in the typing, never once per keystroke", async () => {
    const { store, hook, saves } = setup();
    for (const name of ["Z", "Ze", "Zet", "Zeta"]) {
      act(() => store.getState().updateBrand({ name }));
      await flush(200);
    }
    expect(saves).toHaveLength(0);
    await flush();
    expect(saves).toHaveLength(1);
    expect(saves[0].config.brand.name).toBe("Zeta");
    expect(hook.result.current.status).toBe("saved");
    expect(hook.result.current.lastSavedAt).toBe("stored-1");
  });

  it("never writes for a change of the preview", async () => {
    const { store, saves } = setup();
    act(() => {
      store.getState().setScreen("win");
      store.getState().setViewport({ width: 1366 });
    });
    await flush();
    expect(saves).toHaveLength(0);
  });

  it("expects to overwrite the version it saved last (conflict detection)", async () => {
    const { store, saves } = setup();
    act(() => store.getState().updateBrand({ name: "A" }));
    await flush();
    act(() => store.getState().updateBrand({ name: "B" }));
    await flush();
    expect(saves.map((save) => save.expected)).toEqual([undefined, "stored-1"]);
    expect(store.getState().storedUpdatedAt).toBe("stored-2");
  });

  it("saves an undo like any other change", async () => {
    const { store, saves } = setup();
    act(() => store.getState().updateBrand({ name: "A" }));
    await flush();
    act(() => store.temporal.getState().undo());
    await flush();
    expect(saves).toHaveLength(2);
    expect(saves[1].config.brand.name).toBe("");
  });

  it("does not write back a configuration just loaded from storage", async () => {
    const { store, saves } = setup();
    const stored = createDefaultExperience({ gameType: "quiz" });
    act(() => store.getState().hydrate(stored, "stored-0"));
    await flush();
    expect(saves).toHaveLength(0);
  });

  it("shows the error, keeps the work pending, and saves on retry", async () => {
    let fail = true;
    const { store, hook, saves } = setup((config) =>
      fail
        ? {
            ok: false,
            error: { code: "STORAGE_FULL", message: "The storage is full." },
          }
        : { ok: true, config: { ...config, updatedAt: "stored-ok" } },
    );
    act(() => store.getState().updateBrand({ name: "Zeta" }));
    await flush();
    expect(hook.result.current.status).toBe("error");
    expect(hook.result.current.error).toBe("The storage is full.");

    fail = false;
    await act(async () => {
      hook.result.current.retry();
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(saves).toHaveLength(2);
    expect(saves[1].config.brand.name).toBe("Zeta");
    expect(hook.result.current.status).toBe("saved");
    expect(hook.result.current.error).toBeNull();
  });

  it("reports a thrown error as an error status", async () => {
    const { store, hook } = setup(() => {
      throw new Error("disk on fire");
    });
    act(() => store.getState().updateBrand({ name: "Zeta" }));
    await flush();
    expect(hook.result.current.status).toBe("error");
    expect(hook.result.current.error).toBe("disk on fire");
  });

  it("asks before the tab closes on unsaved work, and only then", async () => {
    const store = createStudioStore();
    const { repository } = fakeRepository();
    renderHook(() => useAutosave({ store, repository }));
    const leave = () => {
      const event = new Event("beforeunload", { cancelable: true });
      window.dispatchEvent(event);
      return event.defaultPrevented;
    };
    expect(leave()).toBe(false);
    act(() => store.getState().updateBrand({ name: "Zeta" }));
    expect(leave()).toBe(true);
    await flush();
    expect(leave()).toBe(false);
  });

  it("writes a pending edit when the Studio closes, instead of dropping it", async () => {
    const { store, hook, saves } = setup();
    act(() => store.getState().updateBrand({ name: "Zeta" }));
    hook.unmount();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(saves).toHaveLength(1);
    expect(saves[0].config.brand.name).toBe("Zeta");
  });
});

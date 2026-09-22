import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useCopyToClipboard } from "./useCopyToClipboard";
import { useDwellTime } from "./useDwellTime";
import { useReducedMotion } from "./useReducedMotion";
import {
  SESSION_STORAGE_KEY,
  readOrCreateSessionId,
  useSessionId,
} from "./useSessionId";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
  sessionStorage.clear();
});

describe("useReducedMotion", () => {
  it("follows the brand's setting when the system says nothing", () => {
    expect(renderHook(() => useReducedMotion(true)).result.current).toBe(false);
    expect(renderHook(() => useReducedMotion(false)).result.current).toBe(true);
  });

  it("follows the system setting, live", () => {
    let matches = false;
    const listeners = new Set<() => void>();
    vi.stubGlobal("matchMedia", (query: string) => ({
      get matches() {
        return query === "(prefers-reduced-motion: reduce)" && matches;
      },
      addEventListener: (_: string, listener: () => void) =>
        listeners.add(listener),
      removeEventListener: (_: string, listener: () => void) =>
        listeners.delete(listener),
    }));
    const { result, unmount } = renderHook(() => useReducedMotion(true));
    expect(result.current).toBe(false);
    act(() => {
      matches = true;
      listeners.forEach((listener) => listener());
    });
    expect(result.current).toBe(true);
    unmount();
    expect(listeners.size).toBe(0);
  });
});

describe("useSessionId", () => {
  it("keeps the identifier of the visit, with the production key", () => {
    expect(SESSION_STORAGE_KEY).toBe("octoreach_session_id"); // PlayerFlowPage.tsx
    sessionStorage.setItem(SESSION_STORAGE_KEY, "sess_1_abc");
    expect(renderHook(() => useSessionId()).result.current).toBe("sess_1_abc");
  });

  it("creates one in the production format, and keeps it", () => {
    const { result, rerender } = renderHook(() => useSessionId());
    const id = result.current;
    expect(id).toMatch(/^sess_\d+_[a-z0-9]{1,7}$/);
    expect(sessionStorage.getItem(SESSION_STORAGE_KEY)).toBe(id);
    rerender();
    expect(result.current).toBe(id);
  });

  it("keeps one in memory when the storage is blocked", () => {
    const blocked = {
      getItem: () => {
        throw new Error("blocked");
      },
    } as unknown as Storage;
    const first = readOrCreateSessionId(blocked);
    expect(first).toMatch(/^sess_/);
    expect(readOrCreateSessionId(blocked)).toBe(first);
  });
});

describe("useCopyToClipboard", () => {
  it("copies with the Clipboard API and says so for a moment", async () => {
    vi.useFakeTimers();
    const writeText = vi.fn(() => Promise.resolve());
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    const { result } = renderHook(() => useCopyToClipboard(1500));
    await act(async () => {
      expect(await result.current.copy("DEMO-7K2F-9QX4")).toBe(true);
    });
    expect(writeText).toHaveBeenCalledWith("DEMO-7K2F-9QX4");
    expect(result.current.copied).toBe(true);
    act(() => vi.advanceTimersByTime(1500));
    expect(result.current.copied).toBe(false);
  });

  it("falls back to a hidden text area when the Clipboard API refuses", async () => {
    vi.stubGlobal("navigator", {
      clipboard: { writeText: () => Promise.reject(new Error("denied")) },
    });
    const execCommand = vi.fn(() => true);
    document.execCommand = execCommand;
    const { result } = renderHook(() => useCopyToClipboard());
    await act(async () => {
      expect(await result.current.copy("DEMO")).toBe(true);
    });
    expect(execCommand).toHaveBeenCalledWith("copy");
    expect(document.querySelector("textarea")).toBeNull(); // cleaned up
  });

  it("tells when nothing could be copied, without throwing", async () => {
    vi.stubGlobal("navigator", {});
    document.execCommand = () => {
      throw new Error("unsupported");
    };
    const { result, unmount } = renderHook(() => useCopyToClipboard());
    await act(async () => {
      expect(await result.current.copy("DEMO")).toBe(false);
    });
    expect(result.current.copied).toBe(false);
    unmount();
  });

  it("restarts its timer on a second copy, and clears it when it leaves", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("navigator", {
      clipboard: { writeText: () => Promise.resolve() },
    });
    const { result, unmount } = renderHook(() => useCopyToClipboard(1000));
    await act(async () => {
      await result.current.copy("A");
    });
    act(() => vi.advanceTimersByTime(800));
    await act(async () => {
      await result.current.copy("B");
    });
    act(() => vi.advanceTimersByTime(800));
    expect(result.current.copied).toBe(true); // 800 ms after the second copy
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe("useDwellTime", () => {
  it("reads the seconds spent since the runtime appeared, without rendering", () => {
    let now = 10_000;
    const clock = () => now;
    const { result } = renderHook(() => useDwellTime(clock));
    expect(result.current()).toBe(0);
    now += 12_400;
    expect(result.current()).toBe(12);
    now -= 60_000; // a clock set back never gives a negative time
    expect(result.current()).toBe(0);
  });
});
